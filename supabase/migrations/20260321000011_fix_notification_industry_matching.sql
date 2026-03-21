-- ============================================================
-- Fix: find_companies_for_trade_job_notification
--      1. Switch industry match from exact → ILIKE contains
--         (company.industry="Construction, Plasterer" should match
--          job.industry="Construction & Renovation")
--      2. Backfill geom column for company_profiles that already
--         have lat/lng so the spatial dispatch RPC can find them
-- ============================================================

-- ── 1. Backfill geom for companies that have lat/lng but no geom ─────
-- (The trigger only fires on INSERT/UPDATE of lat/lng; existing rows
--  that were written before the trigger was created are missing geom)
UPDATE public.company_profiles
SET    geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE  latitude  IS NOT NULL
  AND  longitude IS NOT NULL
  AND  geom      IS NULL;

-- ── 2. Fix find_companies_for_trade_job_notification ────────────────
-- Replace exact-match industry check with ILIKE contains on both sides.
-- This makes "Construction, Plasterer" match "Construction & Renovation"
-- (and any other partial overlap).

DROP FUNCTION IF EXISTS find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]);
DROP FUNCTION IF EXISTS find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.find_companies_for_trade_job_notification(
  p_job_id       UUID,
  p_job_lat      DOUBLE PRECISION,
  p_job_lon      DOUBLE PRECISION,
  p_job_skills   TEXT[],
  p_job_industry TEXT DEFAULT NULL,
  p_job_service  TEXT DEFAULT NULL
)
RETURNS TABLE (
  company_id     UUID,
  user_id        UUID,
  company_name   TEXT,
  email          TEXT,
  distance_miles DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_skills_lower TEXT[];
BEGIN
  SELECT array_agg(lower(skill)) INTO v_job_skills_lower
  FROM unnest(p_job_skills) AS skill;

  RETURN QUERY
  SELECT
    cp.id                                                        AS company_id,
    cp.user_id,
    cp.company_name,
    u.email,
    (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
        cos(radians(cp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(cp.latitude))
      ))
    ))                                                           AS distance_miles
  FROM public.company_profiles cp
  JOIN public.users u ON u.id = cp.user_id
  WHERE
    COALESCE(cp.trade_job_notifications, true) = true
    AND cp.latitude  IS NOT NULL
    AND cp.longitude IS NOT NULL
    -- Within configured notification radius
    AND (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
        cos(radians(cp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(cp.latitude))
      ))
    )) <= COALESCE(cp.trade_job_notifications_distance, 10)
    -- Service / industry matching
    AND (
      -- 1. Company has no services defined → matches all jobs in their area
      cp.services IS NULL
      OR array_length(cp.services, 1) IS NULL
      OR array_length(cp.services, 1) = 0

      -- 2. Industry contains-match (both directions, case-insensitive)
      --    Handles "Construction, Plasterer" ↔ "Construction & Renovation"
      OR (
        p_job_industry IS NOT NULL
        AND (
          lower(cp.industry) LIKE '%' || lower(p_job_industry) || '%'
          OR lower(p_job_industry) LIKE '%' || lower(cp.industry) || '%'
          -- Also match on the first word/segment of each side
          OR lower(split_part(cp.industry, ',', 1))  = lower(split_part(p_job_industry, ' ', 1))
          OR lower(split_part(cp.industry, ' ', 1))  = lower(split_part(p_job_industry, ' ', 1))
        )
      )

      -- 3. Structured service match: job.service is in company's services array
      OR (
        p_job_service IS NOT NULL
        AND lower(p_job_service) = ANY(SELECT lower(s) FROM unnest(cp.services) s)
      )

      -- 4. Legacy skill text-matching (stem / ilike strategies)
      OR (
        v_job_skills_lower IS NOT NULL
        AND array_length(v_job_skills_lower, 1) > 0
        AND EXISTS (
          SELECT 1
          FROM unnest(cp.services)        AS company_service,
               unnest(v_job_skills_lower) AS job_skill
          WHERE
            lower(company_service) LIKE '%' || job_skill || '%'
            OR job_skill LIKE '%' || lower(company_service) || '%'
            OR lower(regexp_replace(company_service, '[^a-zA-Z0-9]', '', 'g')) =
               lower(regexp_replace(job_skill,       '[^a-zA-Z0-9]', '', 'g'))
            OR (
              length(job_skill) >= 4
              AND length(lower(company_service)) >= 4
              AND left(job_skill, 4) = left(lower(company_service), 4)
            )
            OR (
              regexp_replace(lower(company_service), '(ing|er|ian|tion|al|ist)$', '', 'g') =
              regexp_replace(job_skill,              '(ing|er|ian|tion|al|ist)$', '', 'g')
            )
        )
      )
    )
    -- Exclude the job poster's own company / homeowner
    AND cp.id NOT IN (
      SELECT j.company_id FROM public.jobs j
      WHERE j.id = p_job_id AND j.company_id IS NOT NULL
    )
    AND cp.user_id NOT IN (
      SELECT hp.user_id
      FROM public.jobs j
      JOIN public.homeowner_profiles hp ON hp.id = j.homeowner_id
      WHERE j.id = p_job_id AND j.homeowner_id IS NOT NULL
    )
  ORDER BY distance_miles;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT, TEXT)
  TO authenticated, service_role;

-- ── 3. Make select_top_tradespeople_for_urgent_job more permissive ───
-- Remove the hard skill_match_bonus > 0 requirement so companies whose
-- industry overlaps (rather than exactly matches) the job category are
-- still included. Use ILIKE contains instead of exact match.

CREATE OR REPLACE FUNCTION public.select_top_tradespeople_for_urgent_job(
  p_job_id UUID
)
RETURNS TABLE (
  tradesperson_id UUID,
  total_score     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_location geography(Point, 4326);
  v_job_category TEXT;
BEGIN

  -- Validate: job must be open/active, urgent, and have coordinates
  SELECT
    ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
    LOWER(COALESCE(j.category, j.title, ''))
  INTO v_job_location, v_job_category
  FROM public.jobs j
  WHERE j.id        = p_job_id
    AND j.status    = 'POSTED'::job_status
    AND j.is_urgent = true
    AND j.latitude  IS NOT NULL
    AND j.longitude IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Invalid job for dispatch: job % must exist, status=POSTED, is_urgent=true, and have coordinates set.',
      p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Ranked top-5 tradespeople: proximity + rating + optional skill bonus
  RETURN QUERY
  WITH candidates AS (
    SELECT
      cp.id                                                AS tradesperson_id,
      ST_Distance(cp.geom, v_job_location) / 1000.0       AS distance_km,
      CASE
        WHEN cp.reviews_count >= 3
          THEN (cp.average_rating / 5.0) * 100
        ELSE 70
      END::NUMERIC                                         AS rating_score,
      -- Skill match bonus: +20 industry contains, +10 service contains, +5 no category
      CASE
        WHEN v_job_category = '' THEN 5  -- no category → small bonus
        WHEN LOWER(COALESCE(cp.industry, '')) LIKE '%' || v_job_category || '%'
          OR v_job_category                   LIKE '%' || LOWER(COALESCE(cp.industry, '')) || '%'
          THEN 20
        WHEN EXISTS (
          SELECT 1 FROM unnest(COALESCE(cp.services, ARRAY[]::text[])) AS svc
          WHERE LOWER(svc) LIKE '%' || v_job_category || '%'
             OR v_job_category LIKE '%' || LOWER(svc) || '%'
        ) THEN 10
        ELSE 5  -- no match but still include — better to over-notify than miss
      END::NUMERIC                                         AS skill_match_bonus
    FROM public.company_profiles cp
    WHERE COALESCE(cp.open_for_business, true)       = true
      AND COALESCE(cp.trade_job_notifications, true) = true
      AND cp.geom IS NOT NULL
      AND ST_DWithin(cp.geom, v_job_location, 20000)   -- 20 km radius
  )
  SELECT
    c.tradesperson_id,
    (
      GREATEST(0, 100 - (c.distance_km * 5)) * 0.55    -- 55% proximity
      + c.rating_score                      * 0.25     -- 25% rating
      + c.skill_match_bonus                 * 1.0      -- up to 20 pts skill match
      + (random() * 5)                                  -- 5% tiebreaker
    )::NUMERIC(8,4)                         AS total_score
  FROM candidates c
  ORDER BY total_score DESC
  LIMIT 5;

END;
$$;

GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID)
  TO service_role;

DO $$ BEGIN
  RAISE NOTICE '✓ geom backfilled for existing company_profiles';
  RAISE NOTICE '✓ find_companies_for_trade_job_notification — industry ILIKE matching';
  RAISE NOTICE '✓ select_top_tradespeople_for_urgent_job — permissive skill matching (no hard exclusion)';
END $$;
