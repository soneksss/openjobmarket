-- Enhanced Notification Preferences for all user types
-- Support for homeowner, employer, tradesperson, and jobseeker roles

-- Drop and recreate notification_preferences table with new fields
DROP TABLE IF EXISTS notification_preferences CASCADE;

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Common notifications for all user types
  email_messages BOOLEAN DEFAULT TRUE,
  phone_messages BOOLEAN DEFAULT FALSE,

  -- Homeowner notifications
  email_job_response BOOLEAN DEFAULT TRUE,
  phone_job_response BOOLEAN DEFAULT FALSE,
  email_job_expired BOOLEAN DEFAULT TRUE,
  phone_job_expired BOOLEAN DEFAULT FALSE,

  -- Employer notifications
  email_vacancy_response BOOLEAN DEFAULT TRUE,
  phone_vacancy_response BOOLEAN DEFAULT FALSE,
  email_vacancy_expired BOOLEAN DEFAULT TRUE,
  phone_vacancy_expired BOOLEAN DEFAULT FALSE,

  -- Tradesperson notifications
  email_application_response BOOLEAN DEFAULT TRUE,
  phone_application_response BOOLEAN DEFAULT FALSE,
  email_matching_jobs BOOLEAN DEFAULT TRUE,
  phone_matching_jobs BOOLEAN DEFAULT FALSE,

  -- Jobseeker notifications (shares some with tradesperson)
  email_job_matches BOOLEAN DEFAULT TRUE,
  phone_job_matches BOOLEAN DEFAULT FALSE,

  -- Marketing and updates (optional)
  email_marketing BOOLEAN DEFAULT FALSE,
  phone_marketing BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Add comments for documentation
COMMENT ON TABLE notification_preferences IS 'User notification preferences for email and phone notifications';
COMMENT ON COLUMN notification_preferences.email_messages IS 'Notify when someone sends a message';
COMMENT ON COLUMN notification_preferences.phone_messages IS 'Phone notification for new messages';
COMMENT ON COLUMN notification_preferences.email_job_response IS 'Homeowner: Notify when someone responds to posted job/task';
COMMENT ON COLUMN notification_preferences.phone_job_response IS 'Homeowner: Phone notification for job responses';
COMMENT ON COLUMN notification_preferences.email_job_expired IS 'Homeowner: Notify when posted job expires';
COMMENT ON COLUMN notification_preferences.phone_job_expired IS 'Homeowner: Phone notification for job expiration';
COMMENT ON COLUMN notification_preferences.email_vacancy_response IS 'Employer: Notify when someone responds to posted vacancy';
COMMENT ON COLUMN notification_preferences.phone_vacancy_response IS 'Employer: Phone notification for vacancy responses';
COMMENT ON COLUMN notification_preferences.email_vacancy_expired IS 'Employer: Notify when posted vacancy expires';
COMMENT ON COLUMN notification_preferences.phone_vacancy_expired IS 'Employer: Phone notification for vacancy expiration';
COMMENT ON COLUMN notification_preferences.email_application_response IS 'Tradesperson/Jobseeker: Notify when someone responds to application';
COMMENT ON COLUMN notification_preferences.phone_application_response IS 'Tradesperson/Jobseeker: Phone notification for application responses';
COMMENT ON COLUMN notification_preferences.email_matching_jobs IS 'Tradesperson: Notify about jobs matching services within 10 miles';
COMMENT ON COLUMN notification_preferences.phone_matching_jobs IS 'Tradesperson: Phone notification for matching jobs';
COMMENT ON COLUMN notification_preferences.email_job_matches IS 'Jobseeker: Notify about jobs matching skills within 10 miles';
COMMENT ON COLUMN notification_preferences.phone_job_matches IS 'Jobseeker: Phone notification for job matches';
COMMENT ON COLUMN notification_preferences.email_marketing IS 'Marketing emails and updates';
COMMENT ON COLUMN notification_preferences.phone_marketing IS 'Marketing phone notifications';
