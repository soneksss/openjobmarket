-- Add availability expiry tracking fields to company_profiles
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS availability_expires_at       timestamptz,
  ADD COLUMN IF NOT EXISTS last_availability_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_availability_prompt_at   timestamptz;

-- Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_company_profiles_availability_expires
  ON company_profiles (availability_expires_at)
  WHERE open_for_business = true;
