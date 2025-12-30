-- Add missing columns to notification_preferences table
-- This fixes the PGRST204 error for missing columns

-- Common notifications
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_messages BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS phone_messages BOOLEAN DEFAULT false;

-- Homeowner notifications
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_job_response BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS phone_job_response BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_job_expired BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS phone_job_expired BOOLEAN DEFAULT false;

-- Employer notifications
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_vacancy_response BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS phone_vacancy_response BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_vacancy_expired BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS phone_vacancy_expired BOOLEAN DEFAULT false;

-- Tradesperson notifications
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_application_response BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS phone_application_response BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_matching_jobs BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS phone_matching_jobs BOOLEAN DEFAULT false;

-- Jobseeker notifications
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_job_matches BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS phone_job_matches BOOLEAN DEFAULT false;

-- Marketing notifications
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_marketing BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS phone_marketing BOOLEAN DEFAULT false;

-- Trigger PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
