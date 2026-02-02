-- ============================================================================
-- Migration: Fix trade job notification matching logic
-- Date: 2026-02-02
-- Purpose:
--   1. Remove email_on_trade_job_match filter - this should only affect email delivery, not finding matches
--   2. Improve skill matching to be case-insensitive and more flexible
-- ============================================================================

-- Drop and recreate the function with fixed logic
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
    -- Matches skills/services - case-insensitive partial matching
    -- Match if:
    --   a) Company has no services defined (matches all jobs), OR
    --   b) Any job skill contains any company service (or vice versa)
    AND (
      cp.services IS NULL
      OR array_length(cp.services, 1) IS NULL
      OR array_length(cp.services, 1) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(cp.services) AS company_service,
             unnest(v_job_skills_lower) AS job_skill
        WHERE
          -- Case-insensitive contains match (either direction)
          lower(company_service) LIKE '%' || job_skill || '%'
          OR job_skill LIKE '%' || lower(company_service) || '%'
          -- Or exact match after normalization
          OR lower(regexp_replace(company_service, '[^a-zA-Z0-9]', '', 'g')) =
             lower(regexp_replace(job_skill, '[^a-zA-Z0-9]', '', 'g'))
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

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Trade Job Notification Matching Fix';
  RAISE NOTICE '  - Removed email_on_trade_job_match filter (now only affects email, not in-app)';
  RAISE NOTICE '  - Added case-insensitive skill matching';
  RAISE NOTICE '  - Added partial string matching for skills';
  RAISE NOTICE '  - Fixed potential acos domain error with LEAST/GREATEST';
  RAISE NOTICE '========================================';
END $$;
