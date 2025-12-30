-- Fix notification_preferences table by adding missing columns
-- This fixes the error: "Could not find the 'email_application_response' column"

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Common notifications
  email_messages BOOLEAN DEFAULT true,
  phone_messages BOOLEAN DEFAULT false,

  -- Homeowner notifications
  email_job_response BOOLEAN DEFAULT true,
  phone_job_response BOOLEAN DEFAULT false,
  email_job_expired BOOLEAN DEFAULT true,
  phone_job_expired BOOLEAN DEFAULT false,

  -- Employer notifications
  email_vacancy_response BOOLEAN DEFAULT true,
  phone_vacancy_response BOOLEAN DEFAULT false,
  email_vacancy_expired BOOLEAN DEFAULT true,
  phone_vacancy_expired BOOLEAN DEFAULT false,

  -- Tradesperson notifications
  email_application_response BOOLEAN DEFAULT true,
  phone_application_response BOOLEAN DEFAULT false,
  email_matching_jobs BOOLEAN DEFAULT true,
  phone_matching_jobs BOOLEAN DEFAULT false,

  -- Jobseeker notifications
  email_job_matches BOOLEAN DEFAULT true,
  phone_job_matches BOOLEAN DEFAULT false,

  -- Marketing notifications
  email_marketing BOOLEAN DEFAULT false,
  phone_marketing BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(user_id)
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Common notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='email_messages') THEN
    ALTER TABLE notification_preferences ADD COLUMN email_messages BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='phone_messages') THEN
    ALTER TABLE notification_preferences ADD COLUMN phone_messages BOOLEAN DEFAULT false;
  END IF;

  -- Marketing notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='email_marketing') THEN
    ALTER TABLE notification_preferences ADD COLUMN email_marketing BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='phone_marketing') THEN
    ALTER TABLE notification_preferences ADD COLUMN phone_marketing BOOLEAN DEFAULT false;
  END IF;

  -- Tradesperson notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='email_application_response') THEN
    ALTER TABLE notification_preferences ADD COLUMN email_application_response BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='phone_application_response') THEN
    ALTER TABLE notification_preferences ADD COLUMN phone_application_response BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='email_matching_jobs') THEN
    ALTER TABLE notification_preferences ADD COLUMN email_matching_jobs BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='phone_matching_jobs') THEN
    ALTER TABLE notification_preferences ADD COLUMN phone_matching_jobs BOOLEAN DEFAULT false;
  END IF;

  -- Jobseeker notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='email_job_matches') THEN
    ALTER TABLE notification_preferences ADD COLUMN email_job_matches BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='phone_job_matches') THEN
    ALTER TABLE notification_preferences ADD COLUMN phone_job_matches BOOLEAN DEFAULT false;
  END IF;

  -- Employer notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='email_vacancy_response') THEN
    ALTER TABLE notification_preferences ADD COLUMN email_vacancy_response BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='phone_vacancy_response') THEN
    ALTER TABLE notification_preferences ADD COLUMN phone_vacancy_response BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='email_vacancy_expired') THEN
    ALTER TABLE notification_preferences ADD COLUMN email_vacancy_expired BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='phone_vacancy_expired') THEN
    ALTER TABLE notification_preferences ADD COLUMN phone_vacancy_expired BOOLEAN DEFAULT false;
  END IF;

  -- Homeowner notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='email_job_response') THEN
    ALTER TABLE notification_preferences ADD COLUMN email_job_response BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='phone_job_response') THEN
    ALTER TABLE notification_preferences ADD COLUMN phone_job_response BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='email_job_expired') THEN
    ALTER TABLE notification_preferences ADD COLUMN email_job_expired BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notification_preferences' AND column_name='phone_job_expired') THEN
    ALTER TABLE notification_preferences ADD COLUMN phone_job_expired BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE notification_preferences IS 'Stores user notification preferences for email and phone notifications';
COMMENT ON COLUMN notification_preferences.email_application_response IS 'Email notifications when employers respond to job applications (for tradespeople)';
COMMENT ON COLUMN notification_preferences.email_matching_jobs IS 'Email notifications for matching jobs (for tradespeople)';
COMMENT ON COLUMN notification_preferences.email_job_matches IS 'Email notifications for matching vacancies (for jobseekers)';
