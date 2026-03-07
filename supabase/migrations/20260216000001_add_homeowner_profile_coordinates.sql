-- Add latitude and longitude columns to homeowner_profiles
-- This enables the "my location vs different location" choice when posting jobs

-- Add coordinate columns
ALTER TABLE homeowner_profiles
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_homeowner_profiles_location
ON homeowner_profiles(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments
COMMENT ON COLUMN homeowner_profiles.latitude IS 'Homeowner location latitude coordinate';
COMMENT ON COLUMN homeowner_profiles.longitude IS 'Homeowner location longitude coordinate';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Added latitude/longitude columns to homeowner_profiles';
END $$;
