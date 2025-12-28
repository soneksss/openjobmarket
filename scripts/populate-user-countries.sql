-- ===================================================================
-- POPULATE USER COUNTRIES FROM COORDINATES
-- ===================================================================
-- This script updates country_code and country_name for existing users
-- based on their latitude/longitude coordinates using reverse geocoding
--
-- NOTE: This is a simplified approach using coordinate ranges.
-- For production, you should use a proper geocoding service API.
-- ===================================================================

BEGIN;

-- Preview: Count users with coordinates but no country
SELECT
  COUNT(*) as users_with_coords_no_country,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as total_with_coords,
  COUNT(CASE WHEN country_code IS NOT NULL THEN 1 END) as total_with_country
FROM users;

-- Simple geocoding based on coordinate ranges
-- This is a basic approach - for accurate geocoding, use a service like:
-- - OpenStreetMap Nominatim
-- - Google Maps Geocoding API
-- - HERE Geocoding API

-- Update Brazil (approximate lat/lng bounds)
UPDATE users
SET
  country_code = 'BR',
  country_name = 'Brazil'
WHERE
  latitude BETWEEN -33.75 AND 5.27
  AND longitude BETWEEN -73.99 AND -34.79
  AND country_code IS NULL;

-- Update United Kingdom
UPDATE users
SET
  country_code = 'GB',
  country_name = 'United Kingdom'
WHERE
  latitude BETWEEN 49.96 AND 58.64
  AND longitude BETWEEN -7.57 AND 1.68
  AND country_code IS NULL;

-- Update Portugal
UPDATE users
SET
  country_code = 'PT',
  country_name = 'Portugal'
WHERE
  latitude BETWEEN 36.96 AND 42.15
  AND longitude BETWEEN -9.50 AND -6.19
  AND country_code IS NULL;

-- Update United States
UPDATE users
SET
  country_code = 'US',
  country_name = 'United States'
WHERE
  latitude BETWEEN 24.52 AND 49.38
  AND longitude BETWEEN -125.0 AND -66.93
  AND country_code IS NULL;

-- Update Canada
UPDATE users
SET
  country_code = 'CA',
  country_name = 'Canada'
WHERE
  latitude BETWEEN 41.68 AND 83.11
  AND longitude BETWEEN -141.0 AND -52.62
  AND country_code IS NULL;

-- Update Australia
UPDATE users
SET
  country_code = 'AU',
  country_name = 'Australia'
WHERE
  latitude BETWEEN -43.63 AND -10.69
  AND longitude BETWEEN 113.34 AND 153.57
  AND country_code IS NULL;

-- Update Spain
UPDATE users
SET
  country_code = 'ES',
  country_name = 'Spain'
WHERE
  latitude BETWEEN 36.00 AND 43.79
  AND longitude BETWEEN -9.30 AND 3.32
  AND country_code IS NULL;

-- Update France
UPDATE users
SET
  country_code = 'FR',
  country_name = 'France'
WHERE
  latitude BETWEEN 42.33 AND 51.09
  AND longitude BETWEEN -4.79 AND 8.23
  AND country_code IS NULL;

-- Update Germany
UPDATE users
SET
  country_code = 'DE',
  country_name = 'Germany'
WHERE
  latitude BETWEEN 47.27 AND 55.06
  AND longitude BETWEEN 5.87 AND 15.04
  AND country_code IS NULL;

-- Update India
UPDATE users
SET
  country_code = 'IN',
  country_name = 'India'
WHERE
  latitude BETWEEN 8.07 AND 35.67
  AND longitude BETWEEN 68.18 AND 97.40
  AND country_code IS NULL;

-- Update Mexico
UPDATE users
SET
  country_code = 'MX',
  country_name = 'Mexico'
WHERE
  latitude BETWEEN 14.54 AND 32.72
  AND longitude BETWEEN -118.40 AND -86.71
  AND country_code IS NULL;

-- Summary of updates
SELECT
  '✅ UPDATED' as status,
  country_code,
  country_name,
  COUNT(*) as user_count
FROM users
WHERE country_code IS NOT NULL
GROUP BY country_code, country_name
ORDER BY COUNT(*) DESC;

-- Users still without country data
SELECT
  '⚠️ NO COUNTRY DATA' as status,
  COUNT(*) as users_without_country,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as have_coords_but_no_country
FROM users
WHERE country_code IS NULL;

COMMIT;

-- ===================================================================
-- ALTERNATIVE: Use external geocoding API
-- ===================================================================
-- For more accurate results, create a Node.js script that:
-- 1. Fetches all users with lat/lng but no country_code
-- 2. Calls a geocoding API (e.g., OpenStreetMap Nominatim - FREE!)
-- 3. Updates the country_code and country_name
--
-- Example using Nominatim API (free, no API key needed):
-- https://nominatim.openstreetmap.org/reverse?lat=-23.55&lon=-46.63&format=json
--
-- Response includes: country, country_code, city, state, etc.
-- ===================================================================
