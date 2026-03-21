-- ============================================================
-- Fix: select_top_tradespeople_for_urgent_job
--      Add industry/services skill matching so only relevant
--      tradespeople receive urgent job notifications.
-- ============================================================

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

  -- Ranked top-5 tradespeople with industry/skills matching + proximity + rating
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
      -- Skill match bonus: +20 if industry matches category, +10 if any service matches
      CASE
        WHEN v_job_category = '' THEN 10  -- no category → treat as matched
        WHEN LOWER(COALESCE(cp.industry, '')) ILIKE '%' || v_job_category || '%'
          OR v_job_category                 ILIKE '%' || LOWER(COALESCE(cp.industry, '')) || '%'
          THEN 20
        WHEN EXISTS (
          SELECT 1 FROM unnest(COALESCE(cp.services, ARRAY[]::text[])) AS svc
          WHERE LOWER(svc) ILIKE '%' || v_job_category || '%'
             OR v_job_category ILIKE '%' || LOWER(svc) || '%'
        ) THEN 10
        ELSE 0
      END::NUMERIC                                         AS skill_match_bonus
    FROM public.company_profiles cp
    WHERE cp.open_for_business      = true
      AND cp.trade_job_notifications = true
      AND cp.geom IS NOT NULL
      AND ST_DWithin(cp.geom, v_job_location, 20000)    -- 20 km radius
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
  -- Only return tradespeople who have some skill relevance (or no category set)
  WHERE c.skill_match_bonus > 0
     OR v_job_category = ''
  ORDER BY total_score DESC
  LIMIT 5;

END;
$$;

GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID)
  TO service_role;

DO $$ BEGIN
  RAISE NOTICE '✓ select_top_tradespeople_for_urgent_job — industry/skills matching added';
END $$;
