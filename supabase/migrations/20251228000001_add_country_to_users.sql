-- Add country and country_code fields to users table
-- This allows tracking user distribution by region for admin analytics

-- Add country_code column (ISO 3166-1 alpha-2 code like 'BR', 'GB', 'PT')
ALTER TABLE users
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Add country_name column (full name like 'Brazil', 'United Kingdom')
ALTER TABLE users
ADD COLUMN IF NOT EXISTS country_name VARCHAR(100);

-- Add index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_users_country_code ON users(country_code);

-- Comment the columns
COMMENT ON COLUMN users.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., BR, GB, PT)';
COMMENT ON COLUMN users.country_name IS 'Full country name derived from coordinates';

-- Note: These fields will be populated:
-- 1. Automatically via reverse geocoding when users sign up (future implementation)
-- 2. Via a one-time migration script for existing users with coordinates
-- 3. Manually updated if needed via admin panel
