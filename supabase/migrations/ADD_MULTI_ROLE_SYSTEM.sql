-- Add multi-role system to users table
-- This allows users to have multiple roles (jobseeker, homeowner, employer, tradespeople)

-- Add role columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_jobseeker BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_homeowner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_employer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_tradespeople BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('individual', 'company'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_jobseeker ON users(is_jobseeker) WHERE is_jobseeker = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_is_homeowner ON users(is_homeowner) WHERE is_homeowner = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_is_employer ON users(is_employer) WHERE is_employer = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_is_tradespeople ON users(is_tradespeople) WHERE is_tradespeople = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- Migrate existing data to new role system
-- Professional users become jobseekers
UPDATE users
SET
  account_type = 'individual',
  is_jobseeker = TRUE
WHERE user_type = 'professional' AND account_type IS NULL;

-- Company/employer users become employers
UPDATE users
SET
  account_type = 'company',
  is_employer = TRUE
WHERE user_type IN ('company', 'employer') AND account_type IS NULL;

-- Admin users keep their admin status (no role flags needed)
UPDATE users
SET account_type = 'company'
WHERE user_type = 'admin' AND account_type IS NULL;

COMMENT ON COLUMN users.is_jobseeker IS 'User can search for jobs and be found by employers';
COMMENT ON COLUMN users.is_homeowner IS 'User can post tasks and find tradespeople for projects';
COMMENT ON COLUMN users.is_employer IS 'User can post vacancies and search for talent';
COMMENT ON COLUMN users.is_tradespeople IS 'User offers trade services and can find skilled workers';
COMMENT ON COLUMN users.account_type IS 'Whether user is an individual or company account';
