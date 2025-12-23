-- Create email_preferences table for managing user email subscription preferences
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email subscription preferences
  weekly_digest BOOLEAN DEFAULT true NOT NULL,
  job_alerts BOOLEAN DEFAULT false NOT NULL,
  company_updates BOOLEAN DEFAULT true NOT NULL,
  industry_insights BOOLEAN DEFAULT false NOT NULL,
  success_stories BOOLEAN DEFAULT false NOT NULL,
  tips_and_guides BOOLEAN DEFAULT true NOT NULL,
  product_updates BOOLEAN DEFAULT true NOT NULL,
  promotional_offers BOOLEAN DEFAULT false NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure one preferences row per user
  CONSTRAINT unique_user_email_preferences UNIQUE (user_id)
);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own email preferences
CREATE POLICY "Users can view own email preferences"
  ON email_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own email preferences
CREATE POLICY "Users can insert own email preferences"
  ON email_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own email preferences
CREATE POLICY "Users can update own email preferences"
  ON email_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own email preferences
CREATE POLICY "Users can delete own email preferences"
  ON email_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_email_preferences_timestamp
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_preferences_updated_at();
