-- Diagnostic: Check Plumber Job in Database
-- Run this in Supabase SQL Editor

-- 1. Find all jobs with "Plumber" in title
SELECT
  id,
  title,
  category,
  description,
  status,
  is_active,
  is_tradespeople_job,
  latitude,
  longitude,
  location,
  created_at,
  expires_at
FROM jobs
WHERE title ILIKE '%Plumber%'
ORDER BY created_at DESC;

-- 2. Check if the job meets search criteria
SELECT
  id,
  title,
  category,
  'Status: ' || status AS status_check,
  'Active: ' || is_active AS active_check,
  'Trade Job: ' || is_tradespeople_job AS type_check,
  'Has Coords: ' || CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 'YES' ELSE 'NO' END AS coords_check,
  'Expired: ' || CASE
    WHEN expires_at IS NULL THEN 'Never'
    WHEN expires_at > NOW() THEN 'No - Valid until ' || expires_at::text
    ELSE 'YES - Expired ' || expires_at::text
  END AS expiry_check
FROM jobs
WHERE title ILIKE '%Plumber%'
ORDER BY created_at DESC;

-- 3. Count all open trade jobs
SELECT COUNT(*) as total_open_trade_jobs
FROM jobs
WHERE status = 'open'
  AND is_active = true
  AND is_tradespeople_job = true
  AND (expires_at IS NULL OR expires_at > NOW());

-- 4. Find jobs with "Plumbing" in category or description
SELECT
  id,
  title,
  category,
  LEFT(description, 100) as description_preview,
  status,
  is_active,
  is_tradespeople_job
FROM jobs
WHERE (category ILIKE '%Plumb%' OR description ILIKE '%Plumb%' OR title ILIKE '%Plumb%')
  AND is_tradespeople_job = true
ORDER BY created_at DESC;

-- 5. Check if coordinates are set
SELECT
  id,
  title,
  location,
  latitude,
  longitude,
  ST_AsText(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) as point_geometry
FROM jobs
WHERE title ILIKE '%Plumber%';
