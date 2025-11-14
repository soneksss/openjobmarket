-- Add registration_number column to company_profiles table
-- This allows companies to optionally add their official registration number

ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- Add comment
COMMENT ON COLUMN company_profiles.registration_number IS 'Company registration number (optional)';
