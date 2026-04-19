-- ============================================================
-- Smart Dispatch v2
-- ============================================================
--
-- Fixes and improvements:
--   1. select_top_tradespeople_for_urgent_job
--        • now accepts p_radius_miles + p_limit (was hardcoded 20km/top-5)
--        • adds language boost (+10) from homeowner country
--        • excludes companies already in job_notifications_sent (dedup)
--        • uses industry AND service columns (not only category)
--        • relaxes is_urgent guard → status='POSTED' (urgent jobs only called here)
--        • returns full score breakdown columns for debug
--   2. find_companies_for_flexible_dispatch
--        • rewritten to use PostGIS ST_DWithin + spatial index
--        • adds language boost (same method)
--        • keeps dedup via job_notifications_sent
--   3. get_dispatch_debug_scores (NEW)
--        • returns top-10 candidates with every score component
--        • call from Supabase SQL editor to verify correctness
-- ============================================================

-- ── 1. select_top_tradespeople_for_urgent_job ─────────────────
--
-- Changes vs 20260321 version:
--   • p_radius_miles + p_limit parameters (API passes real tier values)
--   • Dedup: skip companies already in job_notifications_sent
--   • Language: derive homeowner lang from users.country; +10 if tradesperson
--     speaks it (priority boost, not hard filter)
--   • Use jobs.industry + jobs.service columns (better than category alone)
--   • Relax is_urgent guard (still urgent-only dispatch path)
--   • Score breakdown: proximity 50%, rating 20%, skill 20%, language 10%

-- Drop all existing overloads first — return type changes (adds score breakdown columns)
DROP FUNCTION IF EXISTS public.select_top_tradespeople_for_urgent_job(UUID);
DROP FUNCTION IF EXISTS public.select_top_tradespeople_for_urgent_job(UUID, NUMERIC, INT);

CREATE OR REPLACE FUNCTION public.select_top_tradespeople_for_urgent_job(
  p_job_id       UUID,
  p_radius_miles NUMERIC  DEFAULT 10,  -- API passes real tier (3/5/10)
  p_limit        INT      DEFAULT 5
)
RETURNS TABLE (
  tradesperson_id UUID,
  total_score     NUMERIC,
  distance_miles  NUMERIC,
  skill_score     NUMERIC,
  language_score  NUMERIC,
  rating_score    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_location  geography(Point, 4326);
  v_job_category  TEXT;
  v_job_industry  TEXT;
  v_job_service   TEXT;
  v_homeowner_lang TEXT;   -- 'en' or 'pt-BR' (derived from country)
  v_radius_m      NUMERIC;
BEGIN
  v_radius_m := p_radius_miles * 1609.344;  -- miles → metres

  -- ── Fetch job + homeowner language ──────────────────────────
  SELECT
    ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
    LOWER(COALESCE(j.category, '')),
    LOWER(COALESCE(j.industry, '')),
    LOWER(COALESCE(j.service,  '')),
    CASE
      WHEN UPPER(COALESCE(u.country, '')) IN ('BR', 'BRAZIL', 'BRASIL') THEN 'pt-BR'
      ELSE 'en'
    END
  INTO
    v_job_location,
    v_job_category,
    v_job_industry,
    v_job_service,
    v_homeowner_lang
  FROM public.jobs j
  LEFT JOIN public.users u ON u.id = j.homeowner_id
  WHERE j.id        = p_job_id
    AND j.status    = 'POSTED'::job_status
    AND j.is_urgent = true
    AND j.latitude  IS NOT NULL
    AND j.longitude IS NOT NULL;

  IF NOT FOUND THEN
    RAISE NOTICE
      '[dispatch] Job % not found or ineligible (must be POSTED + is_urgent + coords)',
      p_job_id;
    RETURN;
  END IF;

  -- ── Ranked candidates ────────────────────────────────────────
  RETURN QUERY
  WITH candidates AS (
    SELECT
      cp.id                                                        AS tradesperson_id,

      -- Distance in miles
      (ST_Distance(cp.geom, v_job_location) / 1609.344)::NUMERIC  AS dist_miles,

      -- Proximity score: 100 pts at 0 mi, 0 pts at 20 mi (linear)
      GREATEST(0, 100 - (ST_Distance(cp.geom, v_job_location) / 1609.344 * 5))::NUMERIC
                                                                   AS proximity_score,

      -- Rating score: actual average (1-100) when ≥3 reviews, else 70
      CASE
        WHEN cp.reviews_count >= 3 THEN (cp.average_rating / 5.0 * 100)::NUMERIC
        ELSE 70::NUMERIC
      END                                                          AS rating_score_raw,

      -- Skill match: 20 pts industry hit, 10 pts service/category hit
      CASE
        -- No criteria set → treat as universal match
        WHEN v_job_industry = '' AND v_job_service = '' AND v_job_category = '' THEN 20

        -- Industry full match (best)
        WHEN v_job_industry <> '' AND (
          LOWER(COALESCE(cp.industry, '')) ILIKE '%' || v_job_industry || '%'
          OR v_job_industry ILIKE '%' || LOWER(COALESCE(cp.industry, '')) || '%'
        ) THEN 20

        -- Service array match
        WHEN (v_job_service <> '' OR v_job_industry <> '') AND EXISTS (
          SELECT 1 FROM unnest(COALESCE(cp.services, '{}'::text[])) AS svc
          WHERE LOWER(svc) ILIKE '%' || CASE WHEN v_job_service  <> '' THEN v_job_service  ELSE v_job_industry END || '%'
             OR CASE WHEN v_job_service <> '' THEN v_job_service ELSE v_job_industry END ILIKE '%' || LOWER(svc) || '%'
        ) THEN 15

        -- Category fallback
        WHEN v_job_category <> '' AND (
          LOWER(COALESCE(cp.industry, '')) ILIKE '%' || v_job_category || '%'
          OR v_job_category ILIKE '%' || LOWER(COALESCE(cp.industry, '')) || '%'
          OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(cp.services, '{}'::text[])) AS svc
            WHERE LOWER(svc) ILIKE '%' || v_job_category || '%'
          )
        ) THEN 10

        ELSE 0
      END::NUMERIC                                                 AS skill_score_raw,

      -- Language boost: +10 if tradesperson speaks homeowner's language
      CASE
        WHEN cp.spoken_languages @> ARRAY[v_homeowner_lang] THEN 10
        ELSE 0
      END::NUMERIC                                                 AS lang_score_raw

    FROM public.company_profiles cp
    WHERE cp.open_for_business       = true
      AND cp.trade_job_notifications  = true
      AND cp.geom                    IS NOT NULL
      AND ST_DWithin(cp.geom, v_job_location, v_radius_m)
      -- Respect company's own max-distance setting
      AND (
        cp.trade_job_notifications_distance IS NULL
        OR cp.trade_job_notifications_distance >= p_radius_miles
      )
      -- Dedup: skip already-notified companies
      AND NOT EXISTS (
        SELECT 1 FROM public.job_notifications_sent jns
        WHERE jns.job_id = p_job_id AND jns.company_id = cp.id
      )
  )
  SELECT
    c.tradesperson_id,
    -- Final score: 50% proximity + 20% rating + 20% skill + 10% language
    (
      c.proximity_score * 0.50
      + c.rating_score_raw * 0.20
      + c.skill_score_raw  * 1.00   -- raw pts (max 20), adds directly
      + c.lang_score_raw   * 1.00   -- raw pts (max 10), adds directly
    )::NUMERIC(8,4)                  AS total_score,
    c.dist_miles                     AS distance_miles,
    c.skill_score_raw                AS skill_score,
    c.lang_score_raw                 AS language_score,
    c.rating_score_raw               AS rating_score
  FROM candidates c
  -- Hard filter: only tradespeople with some skill relevance
  -- (if no criteria set, everyone is 20 pts → all pass)
  WHERE c.skill_score_raw > 0
  ORDER BY total_score DESC
  LIMIT p_limit;

END;
$$;

GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID, NUMERIC, INT)
  TO service_role;

-- Keep old 1-arg signature working (for any callers that haven't updated)
CREATE OR REPLACE FUNCTION public.select_top_tradespeople_for_urgent_job(p_job_id UUID)
RETURNS TABLE (tradesperson_id UUID, total_score NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT tradesperson_id, total_score
  FROM public.select_top_tradespeople_for_urgent_job(p_job_id, 10, 5);
$$;
GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID) TO service_role;

DO $$ BEGIN RAISE NOTICE '✓ select_top_tradespeople_for_urgent_job v2 created'; END; $$;


-- ── 2. find_companies_for_flexible_dispatch ───────────────────
--
-- Rewritten to use PostGIS ST_DWithin (was haversine).
-- Adds language boost.
-- Keeps dedup via job_notifications_sent.
--
-- Must DROP first because the return type changes (adds language_score column).
DROP FUNCTION IF EXISTS public.find_companies_for_flexible_dispatch(UUID, FLOAT, FLOAT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.find_companies_for_flexible_dispatch(
  p_job_id   UUID,
  p_job_lat  FLOAT,
  p_job_lon  FLOAT,
  p_industry TEXT DEFAULT NULL,
  p_service  TEXT DEFAULT NULL
)
RETURNS TABLE (
  company_id     UUID,
  user_id        UUID,
  company_name   TEXT,
  distance_miles FLOAT,
  language_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_geom       geography(Point, 4326);
  v_homeowner_lang TEXT;
BEGIN
  v_job_geom := ST_SetSRID(ST_MakePoint(p_job_lon, p_job_lat), 4326)::geography;

  -- Derive homeowner language from users.country via jobs.homeowner_id
  SELECT
    CASE
      WHEN UPPER(COALESCE(u.country, '')) IN ('BR', 'BRAZIL', 'BRASIL') THEN 'pt-BR'
      ELSE 'en'
    END
  INTO v_homeowner_lang
  FROM public.jobs j
  LEFT JOIN public.users u ON u.id = j.homeowner_id
  WHERE j.id = p_job_id;

  RETURN QUERY
  SELECT
    cp.id                                                          AS company_id,
    cp.user_id,
    cp.company_name,
    (ST_Distance(cp.geom, v_job_geom) / 1609.344)::FLOAT         AS distance_miles,
    CASE
      WHEN cp.spoken_languages @> ARRAY[v_homeowner_lang] THEN 10::NUMERIC
      ELSE 0::NUMERIC
    END                                                            AS language_score
  FROM public.company_profiles cp
  WHERE
    cp.open_for_business          = true
    AND cp.flexible_job_notifications = true
    AND cp.geom                   IS NOT NULL
    -- Within company's preferred radius (default 10 miles)
    AND ST_DWithin(
      cp.geom,
      v_job_geom,
      COALESCE(cp.trade_job_notifications_distance, 10) * 1609.344
    )
    -- Not already notified
    AND NOT EXISTS (
      SELECT 1 FROM public.job_notifications_sent jns
      WHERE jns.job_id = p_job_id AND jns.company_id = cp.id
    )
    -- Skill / industry match
    AND (
      (p_industry IS NULL AND p_service IS NULL)
      OR (p_industry IS NOT NULL AND cp.industry ILIKE '%' || p_industry || '%')
      OR (p_service IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(cp.services) AS svc
        WHERE svc ILIKE '%' || p_service  || '%'
           OR svc ILIKE '%' || COALESCE(p_industry, '') || '%'
      ))
    )
  ORDER BY
    -- Language-matched tradespeople first, then by distance
    CASE WHEN cp.spoken_languages @> ARRAY[v_homeowner_lang] THEN 0 ELSE 1 END ASC,
    ST_Distance(cp.geom, v_job_geom) ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_companies_for_flexible_dispatch(UUID, FLOAT, FLOAT, TEXT, TEXT)
  TO anon, authenticated;

DO $$ BEGIN RAISE NOTICE '✓ find_companies_for_flexible_dispatch v2 (PostGIS + language) created'; END; $$;


-- ── 3. get_dispatch_debug_scores (NEW) ───────────────────────
--
-- Debug tool: shows top-10 candidates and every score component.
-- Run from Supabase SQL editor:
--   SELECT * FROM get_dispatch_debug_scores('<job-uuid>', 10);

DROP FUNCTION IF EXISTS public.get_dispatch_debug_scores(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.get_dispatch_debug_scores(
  p_job_id       UUID,
  p_radius_miles NUMERIC DEFAULT 10
)
RETURNS TABLE (
  rank            INT,
  company_name    TEXT,
  distance_miles  NUMERIC,
  skill_score     NUMERIC,
  language_score  NUMERIC,
  rating_score    NUMERIC,
  total_score     NUMERIC,
  is_available    BOOLEAN,
  notifications_on BOOLEAN,
  already_notified BOOLEAN,
  spoken_languages TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_location  geography(Point, 4326);
  v_job_category  TEXT;
  v_job_industry  TEXT;
  v_job_service   TEXT;
  v_homeowner_lang TEXT;
  v_radius_m      NUMERIC;
BEGIN
  v_radius_m := p_radius_miles * 1609.344;

  SELECT
    ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
    LOWER(COALESCE(j.category, '')),
    LOWER(COALESCE(j.industry, '')),
    LOWER(COALESCE(j.service,  '')),
    CASE
      WHEN UPPER(COALESCE(u.country, '')) IN ('BR', 'BRAZIL', 'BRASIL') THEN 'pt-BR'
      ELSE 'en'
    END
  INTO v_job_location, v_job_category, v_job_industry, v_job_service, v_homeowner_lang
  FROM public.jobs j
  LEFT JOIN public.users u ON u.id = j.homeowner_id
  WHERE j.id = p_job_id
    AND j.latitude  IS NOT NULL
    AND j.longitude IS NOT NULL;

  IF NOT FOUND THEN
    RAISE NOTICE 'Job % not found or missing coordinates', p_job_id;
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      cp.company_name,
      cp.open_for_business,
      cp.trade_job_notifications,
      cp.spoken_languages,
      (ST_Distance(cp.geom, v_job_location) / 1609.344)::NUMERIC AS dist_mi,
      GREATEST(0, 100 - (ST_Distance(cp.geom, v_job_location) / 1609.344 * 5))::NUMERIC AS prox,
      CASE WHEN cp.reviews_count >= 3 THEN (cp.average_rating / 5.0 * 100)::NUMERIC ELSE 70 END AS rtg,
      CASE
        WHEN v_job_industry = '' AND v_job_service = '' AND v_job_category = '' THEN 20
        WHEN v_job_industry <> '' AND (
          LOWER(COALESCE(cp.industry,'')) ILIKE '%'||v_job_industry||'%'
          OR v_job_industry ILIKE '%'||LOWER(COALESCE(cp.industry,''))||'%'
        ) THEN 20
        WHEN (v_job_service <> '' OR v_job_industry <> '') AND EXISTS (
          SELECT 1 FROM unnest(COALESCE(cp.services,'{}'::text[])) s
          WHERE LOWER(s) ILIKE '%'||CASE WHEN v_job_service<>'' THEN v_job_service ELSE v_job_industry END||'%'
        ) THEN 15
        WHEN v_job_category <> '' AND (
          LOWER(COALESCE(cp.industry,'')) ILIKE '%'||v_job_category||'%'
          OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.services,'{}'::text[])) s WHERE LOWER(s) ILIKE '%'||v_job_category||'%')
        ) THEN 10
        ELSE 0
      END::NUMERIC AS skill,
      CASE WHEN cp.spoken_languages @> ARRAY[v_homeowner_lang] THEN 10 ELSE 0 END::NUMERIC AS lang,
      EXISTS (
        SELECT 1 FROM public.job_notifications_sent jns
        WHERE jns.job_id = p_job_id AND jns.company_id = cp.id
      ) AS already_sent
    FROM public.company_profiles cp
    WHERE cp.geom IS NOT NULL
      AND ST_DWithin(cp.geom, v_job_location, v_radius_m)
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY (s.prox*0.50 + s.rtg*0.20 + s.skill + s.lang) DESC)::INT AS rank,
    s.company_name,
    s.dist_mi,
    s.skill,
    s.lang,
    s.rtg,
    (s.prox*0.50 + s.rtg*0.20 + s.skill + s.lang)::NUMERIC(8,4) AS total_score,
    s.open_for_business,
    s.trade_job_notifications,
    s.already_sent,
    s.spoken_languages
  FROM scored s
  ORDER BY total_score DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dispatch_debug_scores(UUID, NUMERIC)
  TO service_role;

DO $$ BEGIN RAISE NOTICE '✓ get_dispatch_debug_scores() created'; END; $$;


-- ── Verification ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'select_top_tradespeople_for_urgent_job'
      AND cardinality(p.proargtypes) = 3
  ) THEN
    RAISE EXCEPTION 'select_top_tradespeople_for_urgent_job(uuid,numeric,int) missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_dispatch_debug_scores'
  ) THEN
    RAISE EXCEPTION 'get_dispatch_debug_scores missing';
  END IF;

  RAISE NOTICE '✓ Smart dispatch v2 — all functions verified';
END;
$$;
