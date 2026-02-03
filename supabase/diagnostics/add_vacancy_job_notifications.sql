-- ============================================================================
-- Quick fix: Add vacancy job notification settings to professional profiles
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add columns for vacancy job notification settings
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS vacancy_job_notifications BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vacancy_job_notifications_distance INTEGER DEFAULT 10;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_professional_profiles_vacancy_notifications
  ON professional_profiles(vacancy_job_notifications)
  WHERE vacancy_job_notifications = true;

-- Function to find professionals for vacancy job notifications
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
    pp.vacancy_job_notifications = true
    AND pp.latitude IS NOT NULL
    AND pp.longitude IS NOT NULL
    AND (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(pp.latitude)) *
        cos(radians(pp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(pp.latitude))
      ))
    )) <= COALESCE(pp.vacancy_job_notifications_distance, 10)
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
          lower(prof_skill) LIKE '%' || job_skill || '%'
          OR job_skill LIKE '%' || lower(prof_skill) || '%'
          OR lower(regexp_replace(prof_skill, '[^a-zA-Z0-9]', '', 'g')) =
             lower(regexp_replace(job_skill, '[^a-zA-Z0-9]', '', 'g'))
          OR (
            length(job_skill) >= 4
            AND length(lower(prof_skill)) >= 4
            AND left(job_skill, 4) = left(lower(prof_skill), 4)
          )
          OR (
            regexp_replace(lower(prof_skill), '(ing|er|ian|tion|al|ist|ment|ness)$', '', 'g') =
            regexp_replace(job_skill, '(ing|er|ian|tion|al|ist|ment|ness)$', '', 'g')
          )
      )
    )
    AND pp.user_id NOT IN (
      SELECT cp.user_id
      FROM jobs j
      JOIN company_profiles cp ON cp.id = j.company_id
      WHERE j.id = p_job_id AND j.company_id IS NOT NULL
    )
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

-- Add email preference for vacancy job match
ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS email_on_vacancy_job_match BOOLEAN DEFAULT TRUE;

SELECT 'Vacancy job notifications for professionals added successfully!' as status;
