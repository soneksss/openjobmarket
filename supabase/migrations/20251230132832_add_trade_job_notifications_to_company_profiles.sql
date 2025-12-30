-- Add trade_job_notifications column to company_profiles table
-- This allows companies to opt-in to notifications about trade jobs

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS trade_job_notifications BOOLEAN DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN company_profiles.trade_job_notifications IS 'Whether the company wants to receive notifications about trade/homeowner jobs that match their hiring needs';

-- Create index for filtering companies that have trade notifications enabled
CREATE INDEX IF NOT EXISTS idx_company_profiles_trade_notifications
  ON company_profiles(trade_job_notifications)
  WHERE trade_job_notifications = true;
