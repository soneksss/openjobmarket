-- ============================================================================
-- Fix: Improved skill matching with word stem support
-- Handles cases like "plumber" matching "plumbing" (common stem: "plumb")
-- ============================================================================

DROP FUNCTION IF EXISTS find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]);

CREATE OR REPLACE FUNCTION find_companies_for_trade_job_notification(
  p_job_id UUID,
  p_job_lat DOUBLE PRECISION,
  p_job_lon DOUBLE PRECISION,
  p_job_skills TEXT[]
)
RETURNS TABLE (
  company_id UUID,
  user_id UUID,
  company_name TEXT,
  email TEXT,
  distance_miles DOUBLE PRECISION
) AS $$
DECLARE
  v_job_skills_lower TEXT[];
BEGIN
  -- Convert job skills to lowercase for case-insensitive matching
  SELECT array_agg(lower(skill)) INTO v_job_skills_lower FROM unnest(p_job_skills) AS skill;

  RETURN QUERY
  SELECT
    cp.id AS company_id,
    cp.user_id,
    cp.company_name,
    u.email,
    -- Haversine formula for distance in miles
    (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
        cos(radians(cp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(cp.latitude))
      ))
    )) AS distance_miles
  FROM company_profiles cp
  JOIN users u ON u.id = cp.user_id
  WHERE
    -- Trade notifications are enabled
    cp.trade_job_notifications = true
    -- Has valid coordinates
    AND cp.latitude IS NOT NULL
    AND cp.longitude IS NOT NULL
    -- Distance is within the configured radius
    AND (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
        cos(radians(cp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(cp.latitude))
      ))
    )) <= COALESCE(cp.trade_job_notifications_distance, 10)
    -- Matches skills/services - IMPROVED matching logic
    -- Match if:
    --   a) Company has no services defined (matches all jobs), OR
    --   b) Any skill matches using multiple strategies
    AND (
      cp.services IS NULL
      OR array_length(cp.services, 1) IS NULL
      OR array_length(cp.services, 1) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(cp.services) AS company_service,
             unnest(v_job_skills_lower) AS job_skill
        WHERE
          -- Strategy 1: Direct contains match (either direction)
          lower(company_service) LIKE '%' || job_skill || '%'
          OR job_skill LIKE '%' || lower(company_service) || '%'
          -- Strategy 2: Exact match after removing non-alphanumeric
          OR lower(regexp_replace(company_service, '[^a-zA-Z0-9]', '', 'g')) =
             lower(regexp_replace(job_skill, '[^a-zA-Z0-9]', '', 'g'))
          -- Strategy 3: Stem matching - share first 4+ characters
          -- Handles: plumber/plumbing, electrician/electrical, heating/heater
          OR (
            length(job_skill) >= 4
            AND length(lower(company_service)) >= 4
            AND (
              -- Job skill starts with company service prefix (4+ chars)
              left(job_skill, 4) = left(lower(company_service), 4)
              -- Or they share same normalized prefix
              OR left(regexp_replace(job_skill, '[^a-z]', '', 'g'), 5) =
                 left(regexp_replace(lower(company_service), '[^a-z]', '', 'g'), 5)
            )
          )
          -- Strategy 4: Common trade variations
          -- plumber <-> plumbing, electrician <-> electrical, etc.
          OR (
            regexp_replace(lower(company_service), '(ing|er|ian|tion|al|ist)$', '', 'g') =
            regexp_replace(job_skill, '(ing|er|ian|tion|al|ist)$', '', 'g')
          )
      )
    )
    -- Exclude the job poster's own company
    AND cp.id NOT IN (
      SELECT j.company_id FROM jobs j WHERE j.id = p_job_id AND j.company_id IS NOT NULL
    )
    -- Also exclude if job was posted by a homeowner (compare user_id via homeowner_profiles)
    AND cp.user_id NOT IN (
      SELECT hp.user_id
      FROM jobs j
      JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
      WHERE j.id = p_job_id AND j.homeowner_id IS NOT NULL
    )
  ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]) TO service_role;

SELECT '✅ Function updated with improved stem matching!' as status;

-- Test the stem matching logic
SELECT '=== TESTING STEM MATCHING ===' as section;

SELECT
  'plumber' as job_skill,
  'Plumbing' as company_service,
  -- Strategy 3: First 4 chars
  left('plumber', 4) = left(lower('Plumbing'), 4) as "first_4_match",
  -- Strategy 4: Remove suffixes
  regexp_replace('plumber', '(ing|er|ian|tion|al|ist)$', '', 'g') as "job_stem",
  regexp_replace(lower('Plumbing'), '(ing|er|ian|tion|al|ist)$', '', 'g') as "service_stem",
  regexp_replace('plumber', '(ing|er|ian|tion|al|ist)$', '', 'g') =
  regexp_replace(lower('Plumbing'), '(ing|er|ian|tion|al|ist)$', '', 'g') as "stems_match";

-- Test with actual data
SELECT '=== TESTING WITH ACTUAL DATA ===' as section;

WITH recent_job AS (
  SELECT
    j.id,
    j.title,
    j.latitude,
    j.longitude
  FROM jobs j
  LEFT JOIN company_profiles cp ON cp.id = j.company_id
  WHERE (cp.company_name ILIKE '%remus%' OR j.location ILIKE '%weybridge%')
    AND j.is_tradespeople_job = true
  ORDER BY j.created_at DESC
  LIMIT 1
)
SELECT * FROM find_companies_for_trade_job_notification(
  (SELECT id FROM recent_job),
  (SELECT latitude FROM recent_job),
  (SELECT longitude FROM recent_job),
  ARRAY[(SELECT lower(title) FROM recent_job)]
);
