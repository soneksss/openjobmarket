-- ============================================================================
-- Migration: Add trade job notification distance and improve notification settings
-- Date: 2026-02-02
-- Purpose: Allow companies to set notification radius for trade job matching
-- ============================================================================

-- Add trade_job_notifications_distance column if it doesn't exist
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS trade_job_notifications_distance INTEGER DEFAULT 10;

-- Add comment explaining the column
COMMENT ON COLUMN company_profiles.trade_job_notifications_distance IS 'Radius in miles for trade job notifications (5, 10, 15, or 20)';

-- Add check constraint to ensure valid distance values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_trade_notifications_distance'
  ) THEN
    ALTER TABLE company_profiles
      ADD CONSTRAINT check_trade_notifications_distance
      CHECK (trade_job_notifications_distance IS NULL OR trade_job_notifications_distance IN (5, 10, 15, 20));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create index for efficient querying of companies with trade notifications enabled
CREATE INDEX IF NOT EXISTS idx_company_profiles_trade_notifications_enabled
  ON company_profiles(trade_job_notifications, trade_job_notifications_distance)
  WHERE trade_job_notifications = true;

-- Add trade job notification preferences to user_notification_preferences table
ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS email_on_trade_job_match BOOLEAN DEFAULT TRUE NOT NULL;

COMMENT ON COLUMN user_notification_preferences.email_on_trade_job_match IS 'Whether to send email when a matching trade job is posted nearby';

-- Update get_or_create_notification_preferences function to include new field
-- Must drop first because we're changing the return type
DROP FUNCTION IF EXISTS get_or_create_notification_preferences(UUID);

CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  email_on_new_message BOOLEAN,
  email_on_job_application BOOLEAN,
  email_on_job_offer BOOLEAN,
  email_on_application_status_change BOOLEAN,
  email_on_trade_job_match BOOLEAN,
  email_digest_frequency VARCHAR
) AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if preferences exist
  SELECT EXISTS (
    SELECT 1 FROM public.user_notification_preferences np
    WHERE np.user_id = p_user_id
  ) INTO v_exists;

  -- If not found, create one with defaults
  IF NOT v_exists THEN
    INSERT INTO public.user_notification_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Return the preferences
  RETURN QUERY
  SELECT
    np.email_on_new_message,
    np.email_on_job_application,
    np.email_on_job_offer,
    np.email_on_application_status_change,
    np.email_on_trade_job_match,
    np.email_digest_frequency
  FROM public.user_notification_preferences np
  WHERE np.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find companies to notify about a new trade job
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
BEGIN
  RETURN QUERY
  SELECT
    cp.id AS company_id,
    cp.user_id,
    cp.company_name,
    u.email,
    -- Haversine formula for distance in miles
    (3959 * acos(
      cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
      cos(radians(cp.longitude) - radians(p_job_lon)) +
      sin(radians(p_job_lat)) * sin(radians(cp.latitude))
    )) AS distance_miles
  FROM company_profiles cp
  JOIN users u ON u.id = cp.user_id
  LEFT JOIN user_notification_preferences unp ON unp.user_id = cp.user_id
  WHERE
    -- Trade notifications are enabled
    cp.trade_job_notifications = true
    -- Has valid coordinates
    AND cp.latitude IS NOT NULL
    AND cp.longitude IS NOT NULL
    -- Email notifications for trade jobs are enabled (default true if not set)
    AND COALESCE(unp.email_on_trade_job_match, true) = true
    -- Distance is within the configured radius
    AND (3959 * acos(
      cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
      cos(radians(cp.longitude) - radians(p_job_lon)) +
      sin(radians(p_job_lat)) * sin(radians(cp.latitude))
    )) <= COALESCE(cp.trade_job_notifications_distance, 10)
    -- Matches skills/services (if company has services defined)
    AND (
      cp.services IS NULL
      OR array_length(cp.services, 1) IS NULL
      OR cp.services && p_job_skills
    )
    -- Exclude the job poster's own company
    AND cp.id NOT IN (
      SELECT j.company_id FROM jobs j WHERE j.id = p_job_id AND j.company_id IS NOT NULL
    )
  ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]) TO authenticated;

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Trade Job Notification Distance Migration';
  RAISE NOTICE '  - Added trade_job_notifications_distance to company_profiles';
  RAISE NOTICE '  - Added email_on_trade_job_match to user_notification_preferences';
  RAISE NOTICE '  - Created find_companies_for_trade_job_notification function';
  RAISE NOTICE '========================================';
END $$;
