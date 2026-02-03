-- ============================================================================
-- Migration: Add vacancy job notification settings to professional profiles
-- Date: 2026-02-02
-- Purpose: Allow professionals to opt-in to receive notifications when
--          vacancy jobs matching their skills are posted nearby
-- ============================================================================

-- Add columns for vacancy job notification settings
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS vacancy_job_notifications BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vacancy_job_notifications_distance INTEGER DEFAULT 10;

-- Add comment for documentation
COMMENT ON COLUMN professional_profiles.vacancy_job_notifications IS 'Whether the professional wants to receive notifications about new vacancy jobs nearby';
COMMENT ON COLUMN professional_profiles.vacancy_job_notifications_distance IS 'The distance radius in miles for vacancy job notifications';

-- Create index for efficient querying of professionals with notifications enabled
CREATE INDEX IF NOT EXISTS idx_professional_profiles_vacancy_notifications
  ON professional_profiles(vacancy_job_notifications)
  WHERE vacancy_job_notifications = true;

-- ============================================================================
-- Function: Find professionals to notify about a new vacancy job
-- Returns professionals who:
--   1. Have vacancy_job_notifications enabled
--   2. Have valid coordinates (latitude/longitude)
--   3. Are within their configured distance radius from the job
--   4. Have skills that match the job requirements
--   5. Are not the job poster
-- ============================================================================
CREATE OR REPLACE FUNCTION find_professionals_for_vacancy_notification(
  p_job_id UUID,
  p_job_lat DOUBLE PRECISION,
  p_job_lon DOUBLE PRECISION,
  p_job_skills TEXT[]
)
RETURNS TABLE (
  professional_id UUID,
  user_id UUID,
  professional_name TEXT,
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
    pp.id AS professional_id,
    pp.user_id,
    CONCAT(pp.first_name, ' ', pp.last_name) AS professional_name,
    u.email,
    -- Haversine formula for distance in miles
    (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(pp.latitude)) *
        cos(radians(pp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(pp.latitude))
      ))
    )) AS distance_miles
  FROM professional_profiles pp
  JOIN users u ON u.id = pp.user_id
  WHERE
    -- Vacancy notifications are enabled
    pp.vacancy_job_notifications = true
    -- Has valid coordinates
    AND pp.latitude IS NOT NULL
    AND pp.longitude IS NOT NULL
    -- Distance is within the configured radius
    AND (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(pp.latitude)) *
        cos(radians(pp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(pp.latitude))
      ))
    )) <= COALESCE(pp.vacancy_job_notifications_distance, 10)
    -- Matches skills - FLEXIBLE matching logic
    -- Match if:
    --   a) Professional has no skills defined (matches all jobs), OR
    --   b) Job has no skills defined (matches all professionals), OR
    --   c) Any skill matches using multiple strategies
    AND (
      pp.skills IS NULL
      OR array_length(pp.skills, 1) IS NULL
      OR array_length(pp.skills, 1) = 0
      OR v_job_skills_lower IS NULL
      OR array_length(v_job_skills_lower, 1) IS NULL
      OR array_length(v_job_skills_lower, 1) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(pp.skills) AS prof_skill,
             unnest(v_job_skills_lower) AS job_skill
        WHERE
          -- Strategy 1: Direct contains match (either direction)
          lower(prof_skill) LIKE '%' || job_skill || '%'
          OR job_skill LIKE '%' || lower(prof_skill) || '%'
          -- Strategy 2: Exact match after removing non-alphanumeric
          OR lower(regexp_replace(prof_skill, '[^a-zA-Z0-9]', '', 'g')) =
             lower(regexp_replace(job_skill, '[^a-zA-Z0-9]', '', 'g'))
          -- Strategy 3: Stem matching - share first 4+ characters
          OR (
            length(job_skill) >= 4
            AND length(lower(prof_skill)) >= 4
            AND left(job_skill, 4) = left(lower(prof_skill), 4)
          )
          -- Strategy 4: Remove suffixes and compare
          OR (
            regexp_replace(lower(prof_skill), '(ing|er|ian|tion|al|ist|ment|ness)$', '', 'g') =
            regexp_replace(job_skill, '(ing|er|ian|tion|al|ist|ment|ness)$', '', 'g')
          )
      )
    )
    -- Exclude the job poster's own profile (if they posted via company)
    AND pp.user_id NOT IN (
      SELECT cp.user_id
      FROM jobs j
      JOIN company_profiles cp ON cp.id = j.company_id
      WHERE j.id = p_job_id AND j.company_id IS NOT NULL
    )
    -- Also exclude if job was posted by the professional themselves
    AND pp.id NOT IN (
      SELECT j.professional_id
      FROM jobs j
      WHERE j.id = p_job_id AND j.professional_id IS NOT NULL
    )
  ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_professionals_for_vacancy_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION find_professionals_for_vacancy_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]) TO service_role;

-- Add email preference for vacancy job match to user_notification_preferences
ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS email_on_vacancy_job_match BOOLEAN DEFAULT TRUE;

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Vacancy Job Notifications for Professionals';
  RAISE NOTICE '  - Added vacancy_job_notifications column';
  RAISE NOTICE '  - Added vacancy_job_notifications_distance column';
  RAISE NOTICE '  - Added email_on_vacancy_job_match preference';
  RAISE NOTICE '  - Created find_professionals_for_vacancy_notification function';
  RAISE NOTICE '========================================';
END $$;
