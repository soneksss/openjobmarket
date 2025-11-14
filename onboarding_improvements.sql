-- Migration: Onboarding Form Improvements
-- Add nickname column to users table
-- Add new address fields to professional_profiles table

-- 1. Add nickname column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 2. Add new address fields to professional_profiles table
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS postcode TEXT;

-- Update country column to store country codes if not already correct format
-- This is safe as it will only add the column if it doesn't exist
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'UK';

-- 3. Remove columns that are no longer needed (optional - comment out if you want to keep data)
-- ALTER TABLE professional_profiles DROP COLUMN IF EXISTS linkedin_url;
-- ALTER TABLE professional_profiles DROP COLUMN IF EXISTS github_url;
-- ALTER TABLE professional_profiles DROP COLUMN IF EXISTS salary_max;
-- ALTER TABLE professional_profiles DROP COLUMN IF EXISTS location; -- old single location field

-- 4. Add comments for documentation
COMMENT ON COLUMN users.nickname IS 'Display name for search visibility - can be real name or nickname';
COMMENT ON COLUMN professional_profiles.house_number IS 'House/building number for structured address';
COMMENT ON COLUMN professional_profiles.postcode IS 'Postal/ZIP code';
COMMENT ON COLUMN professional_profiles.country IS 'Country code (UK, US, CA, etc.)';

-- 5. Create index on nickname for search performance
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL;