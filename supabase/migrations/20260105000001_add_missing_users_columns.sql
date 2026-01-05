-- Migration: Add missing columns to users table
-- Date: 2026-01-05
-- Description: Adds missing columns that the signup flow is trying to save

-- Add missing columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('individual', 'company')),
  ADD COLUMN IF NOT EXISTS is_jobseeker BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_homeowner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_employer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_tradespeople BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN public.users.account_type IS 'Type of account: individual or company';
COMMENT ON COLUMN public.users.is_jobseeker IS 'User is looking for employment';
COMMENT ON COLUMN public.users.is_homeowner IS 'User posts tasks/jobs for tradespeople';
COMMENT ON COLUMN public.users.is_employer IS 'Company hiring employees';
COMMENT ON COLUMN public.users.is_tradespeople IS 'Company offering trade services';
COMMENT ON COLUMN public.users.phone IS 'User contact phone number';
COMMENT ON COLUMN public.users.location IS 'User location address';
COMMENT ON COLUMN public.users.latitude IS 'User location latitude coordinate';
COMMENT ON COLUMN public.users.longitude IS 'User location longitude coordinate';
COMMENT ON COLUMN public.users.country IS 'User country code';
