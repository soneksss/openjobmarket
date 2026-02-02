-- Migration: Add email notification preferences
-- This allows users to control which email notifications they receive

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email notification toggles (default: true for all)
  email_on_new_message BOOLEAN DEFAULT TRUE NOT NULL,
  email_on_job_application BOOLEAN DEFAULT TRUE NOT NULL,
  email_on_job_offer BOOLEAN DEFAULT TRUE NOT NULL,
  email_on_application_status_change BOOLEAN DEFAULT TRUE NOT NULL,

  -- Frequency settings
  email_digest_frequency VARCHAR(20) DEFAULT 'instant' CHECK (email_digest_frequency IN ('instant', 'daily', 'weekly', 'never')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON public.user_notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.user_notification_preferences;

-- RLS Policy: Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
ON public.user_notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
ON public.user_notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
ON public.user_notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to get or create notification preferences
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  email_on_new_message BOOLEAN,
  email_on_job_application BOOLEAN,
  email_on_job_offer BOOLEAN,
  email_on_application_status_change BOOLEAN,
  email_digest_frequency VARCHAR
) AS $$
BEGIN
  -- Try to get existing preferences
  RETURN QUERY
  SELECT
    np.email_on_new_message,
    np.email_on_job_application,
    np.email_on_job_offer,
    np.email_on_application_status_change,
    np.email_digest_frequency
  FROM public.user_notification_preferences np
  WHERE np.user_id = p_user_id;

  -- If no record exists, create one with defaults and return it
  IF NOT FOUND THEN
    INSERT INTO public.user_notification_preferences (user_id)
    VALUES (p_user_id)
    RETURNING
      email_on_new_message,
      email_on_job_application,
      email_on_job_offer,
      email_on_application_status_change,
      email_digest_frequency
    INTO
      get_or_create_notification_preferences.email_on_new_message,
      get_or_create_notification_preferences.email_on_job_application,
      get_or_create_notification_preferences.email_on_job_offer,
      get_or_create_notification_preferences.email_on_application_status_change,
      get_or_create_notification_preferences.email_digest_frequency;

    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_notification_prefs_timestamp ON public.user_notification_preferences;
CREATE TRIGGER update_notification_prefs_timestamp
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Create notification log table (optional, for tracking sent emails)
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  notification_method VARCHAR(20) DEFAULT 'email' NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for notification log queries
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON public.notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON public.notification_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON public.notification_log(notification_type);

-- Enable RLS on notification log
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS "Users can view own notification logs" ON public.notification_log;

-- RLS Policy: Users can view their own notification logs
CREATE POLICY "Users can view own notification logs"
ON public.notification_log
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_notification_preferences IS 'Stores user preferences for email and other notifications';
COMMENT ON TABLE public.notification_log IS 'Logs all sent notifications for auditing and debugging';
