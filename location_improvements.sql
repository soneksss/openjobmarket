-- Migration: Location Improvements with Map Pin Support
-- Add latitude/longitude columns for map pin functionality
-- Expand country support with full ISO list

-- 1. Add latitude/longitude columns to users table for location coordinates
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);

-- 2. Add latitude/longitude columns to professional_profiles table for fallback
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6);
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);

-- 3. Add indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_professional_profiles_location ON professional_profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Add comments for documentation
COMMENT ON COLUMN users.latitude IS 'Latitude coordinate from map pin selection (-90 to 90)';
COMMENT ON COLUMN users.longitude IS 'Longitude coordinate from map pin selection (-180 to 180)';
COMMENT ON COLUMN professional_profiles.latitude IS 'Latitude coordinate from map pin selection (-90 to 90)';
COMMENT ON COLUMN professional_profiles.longitude IS 'Longitude coordinate from map pin selection (-180 to 180)';

-- 5. Update existing country column to handle new ISO codes (already in previous migration)
-- This ensures country field can store all ISO country codes properly

-- 6. Add constraint to ensure valid coordinate ranges
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS chk_users_latitude CHECK (latitude >= -90 AND latitude <= 90);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS chk_users_longitude CHECK (longitude >= -180 AND longitude <= 180);
ALTER TABLE professional_profiles ADD CONSTRAINT IF NOT EXISTS chk_profiles_latitude CHECK (latitude >= -90 AND latitude <= 90);
ALTER TABLE professional_profiles ADD CONSTRAINT IF NOT EXISTS chk_profiles_longitude CHECK (longitude >= -180 AND longitude <= 180);