-- ============================================================
-- Migration: Job Notification Distance Preference
--
-- 1. Ensure trade_job_notifications_distance is SMALLINT DEFAULT 10
--    (backfills NULLs on existing rows)
-- 2. Rebuild select_top_tradespeople_for_urgent_job:
--    • Haversine calculated ONCE as dist_mi in candidates CTE
--    • All distance filters reference that single value
--    • No NULL checks — DEFAULT 10 guarantees the column is always set
-- ============================================================

-- ── 1. Schema: ensure column exists with correct defaults ─────
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS trade_job_notifications_distance SMALLINT DEFAULT 10;

-- Backfill any legacy NULLs
UPDATE company_profiles
SET trade_job_notifications_distance = 10
WHERE trade_job_notifications_distance IS NULL;

-- Make it NOT NULL going forward
ALTER TABLE company_profiles
  ALTER COLUMN trade_job_notifications_distance SET NOT NULL,
  ALTER COLUMN trade_job_notifications_distance SET DEFAULT 10;

-- ── 2. Rebuild urgent dispatch RPC ───────────────────────────
DROP FUNCTION IF EXISTS public.select_top_tradespeople_for_urgent_job(UUID);
DROP FUNCTION IF EXISTS public.select_top_tradespeople_for_urgent_job(UUID, NUMERIC, INT);

CREATE OR REPLACE FUNCTION public.select_top_tradespeople_for_urgent_job(
  p_job_id       UUID,
  p_radius_miles NUMERIC DEFAULT 10,
  p_limit        INT     DEFAULT 5
)
RETURNS TABLE (
  tradesperson_id   UUID,
  total_score       NUMERIC,
  distance_miles    NUMERIC,
  skill_score       NUMERIC,
  language_score    NUMERIC,
  freshness_score   NUMERIC,
  reliability_score NUMERIC,
  rating_score      NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_lat        NUMERIC;
  v_job_lon        NUMERIC;
  v_job_industry   TEXT;
  v_job_service    TEXT;
  v_job_category   TEXT;
  v_preferred_lang TEXT;
  v_job_country    TEXT;
  v_homeowner_lang TEXT;
BEGIN
  -- ── Fetch job details ──────────────────────────────────────
  SELECT latitude, longitude, industry, service, category, preferred_language
  INTO   v_job_lat, v_job_lon, v_job_industry, v_job_service, v_job_category, v_preferred_lang
  FROM   jobs
  WHERE  id = p_job_id;

  IF v_job_lat IS NULL OR v_job_lon IS NULL THEN
    RETURN;
  END IF;

  -- ── Language: preferred_language first, fallback to homeowner country ──
  IF v_preferred_lang IS NULL THEN
    SELECT u.country INTO v_job_country
    FROM   jobs j
    JOIN   auth.users u ON u.id = j.user_id
    WHERE  j.id = p_job_id;

    v_homeowner_lang := CASE WHEN v_job_country = 'BR' THEN 'pt-BR' ELSE 'en' END;
  ELSE
    v_homeowner_lang := v_preferred_lang;
  END IF;

  RETURN QUERY
  -- ── Step 1: calculate dist_mi once per candidate ──────────
  WITH candidates AS (
    SELECT
      cp.id                                                                AS cp_id,
      cp.spoken_languages,
      cp.trade_job_notifications_distance,
      COALESCE(cp.average_rating, 0)::NUMERIC                             AS avg_rating,
      COALESCE(cp.accept_rate,    1.0)::NUMERIC                           AS a_rate,
      u.last_seen_at,
      -- Haversine — computed once, reused everywhere below
      (3958.8 * acos(
        LEAST(1.0,
          cos(radians(v_job_lat)) * cos(radians(cp.latitude))
          * cos(radians(cp.longitude) - radians(v_job_lon))
          + sin(radians(v_job_lat)) * sin(radians(cp.latitude))
        )
      ))::NUMERIC                                                          AS dist_mi
    FROM  company_profiles cp
    LEFT  JOIN auth.users u ON u.id = cp.user_id
    WHERE cp.open_for_business          = true
      AND cp.trade_job_notifications    = true
      AND cp.latitude  IS NOT NULL
      AND cp.longitude IS NOT NULL
      -- Dedup: never re-notify the same company for the same job
      AND NOT EXISTS (
        SELECT 1 FROM job_notifications_sent jns
        WHERE  jns.job_id = p_job_id AND jns.company_id = cp.id
      )
      -- Skill / industry match (at least one criterion must hit)
      AND (
        (v_job_industry IS NULL AND v_job_service IS NULL AND v_job_category IS NULL)
        OR (v_job_industry IS NOT NULL AND cp.industry ILIKE '%' || v_job_industry || '%')
        OR (v_job_service  IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(cp.services) s
              WHERE  s ILIKE '%' || v_job_service || '%'
            ))
        OR (v_job_category IS NOT NULL AND (
              cp.industry ILIKE '%' || v_job_category || '%'
              OR EXISTS (
                SELECT 1 FROM unnest(cp.services) s
                WHERE  s ILIKE '%' || v_job_category || '%'
              )
            ))
      )
  ),
  -- ── Step 2: apply all distance filters using the pre-computed dist_mi ──
  in_range AS (
    SELECT * FROM candidates
    WHERE dist_mi <= p_radius_miles                     -- within job's dispatch radius
      AND dist_mi <= trade_job_notifications_distance   -- within tradesperson's preference (never NULL)
  ),
  -- ── Step 3: score each qualifying candidate ────────────────
  scored AS (
    SELECT
      cp_id,
      dist_mi,
      -- Proximity 0–40 pts (linear decay across dispatch radius)
      ROUND(GREATEST(0, 40.0 * (1.0 - dist_mi / NULLIF(p_radius_miles, 0))), 2)  AS prox_score,
      -- Rating 0–15 pts
      ROUND(LEAST(15, avg_rating * 3.0), 2)                                        AS rat_score,
      -- Skill match: 20 pts flat (already filtered in Step 1)
      20::NUMERIC                                                                   AS skl_score,
      -- Language 15 pts if tradesperson speaks homeowner's language
      CASE
        WHEN spoken_languages IS NOT NULL
         AND v_homeowner_lang = ANY(spoken_languages) THEN 15
        ELSE 0
      END::NUMERIC                                                                  AS lang_score,
      -- Freshness 0/5/10 pts from last_seen_at
      CASE
        WHEN last_seen_at > NOW() - INTERVAL '15 minutes' THEN 10
        WHEN last_seen_at > NOW() - INTERVAL '2 hours'    THEN 5
        ELSE 0
      END::NUMERIC                                                                  AS fresh_score,
      -- Reliability 0–15 pts from accept_rate
      ROUND(a_rate * 15.0, 2)                                                       AS rel_score
    FROM in_range
  )
  SELECT
    s.cp_id                                                                    AS tradesperson_id,
    s.prox_score + s.rat_score + s.skl_score + s.lang_score
      + s.fresh_score + s.rel_score                                            AS total_score,
    s.dist_mi                                                                  AS distance_miles,
    s.skl_score                                                                AS skill_score,
    s.lang_score                                                               AS language_score,
    s.fresh_score                                                              AS freshness_score,
    s.rel_score                                                                AS reliability_score,
    s.rat_score                                                                AS rating_score
  FROM scored s
  ORDER BY total_score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID, NUMERIC, INT)
  TO anon, authenticated;

-- ── 3. Also update flexible dispatch to remove COALESCE (column is now NOT NULL) ──
DROP FUNCTION IF EXISTS public.find_companies_for_flexible_dispatch(UUID, FLOAT, FLOAT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.find_companies_for_flexible_dispatch(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT);

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
  distance_miles FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- dist_mi calculated once in a lateral-style subquery via CTE
  WITH candidates AS (
    SELECT
      cp.id            AS company_id,
      cp.user_id,
      cp.company_name,
      cp.trade_job_notifications_distance,
      (3958.8 * acos(
        LEAST(1.0,
          cos(radians(p_job_lat)) * cos(radians(cp.latitude))
          * cos(radians(cp.longitude) - radians(p_job_lon))
          + sin(radians(p_job_lat)) * sin(radians(cp.latitude))
        )
      ))::float        AS dist_mi
    FROM company_profiles cp
    WHERE cp.open_for_business         = true
      AND cp.flexible_job_notifications = true
      AND cp.latitude  IS NOT NULL
      AND cp.longitude IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM job_notifications_sent jns
        WHERE  jns.job_id = p_job_id AND jns.company_id = cp.id
      )
      AND (
        (p_industry IS NULL AND p_service IS NULL)
        OR (p_industry IS NOT NULL AND cp.industry ILIKE '%' || p_industry || '%')
        OR (p_service  IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(cp.services) svc
              WHERE svc ILIKE '%' || p_service  || '%'
                 OR svc ILIKE '%' || COALESCE(p_industry, '') || '%'
            ))
      )
  )
  SELECT company_id, user_id, company_name, dist_mi AS distance_miles
  FROM   candidates
  WHERE  dist_mi <= trade_job_notifications_distance   -- never NULL: DEFAULT 10, NOT NULL
  ORDER  BY dist_mi ASC;
$$;

GRANT EXECUTE ON FUNCTION public.find_companies_for_flexible_dispatch(UUID, FLOAT, FLOAT, TEXT, TEXT)
  TO anon, authenticated;

-- ── Verification ──────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✓ trade_job_notifications_distance: SMALLINT NOT NULL DEFAULT 10';
  RAISE NOTICE '✓ select_top_tradespeople_for_urgent_job: dist_mi computed once, no NULL checks';
  RAISE NOTICE '✓ find_companies_for_flexible_dispatch: dist_mi computed once, no NULL checks';
END;
$$;
