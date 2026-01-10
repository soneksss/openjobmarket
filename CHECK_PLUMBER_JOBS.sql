-- Check if there are any active plumber jobs in the database
-- Run this query in Supabase SQL Editor to diagnose the issue

-- Check 1: Count all jobs with "plumber" in title
SELECT
  'Jobs with plumber in title' as check_type,
  COUNT(*) as count
FROM jobs
WHERE LOWER(title) LIKE '%plumber%';

-- Check 2: Check active jobs with plumber in title
SELECT
  'Active plumber jobs' as check_type,
  COUNT(*) as count
FROM jobs
WHERE LOWER(title) LIKE '%plumber%'
  AND is_active = true
  AND status = 'open'
  AND (expires_at IS NULL OR expires_at > NOW());

-- Check 3: Check if jobs have coordinates
SELECT
  'Active plumber jobs WITH coordinates' as check_type,
  COUNT(*) as count
FROM jobs
WHERE LOWER(title) LIKE '%plumber%'
  AND is_active = true
  AND status = 'open'
  AND (expires_at IS NULL OR expires_at > NOW())
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- Check 4: Show actual plumber jobs details
SELECT
  id,
  title,
  status,
  is_active,
  is_tradespeople_job,
  expires_at,
  latitude,
  longitude,
  company_id,
  created_at
FROM jobs
WHERE LOWER(title) LIKE '%plumber%'
ORDER BY created_at DESC
LIMIT 10;

-- Check 5: Check company "Remus" jobs
SELECT
  j.id,
  j.title,
  j.status,
  j.is_active,
  j.is_tradespeople_job,
  j.expires_at,
  j.latitude,
  j.longitude,
  cp.company_name
FROM jobs j
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE cp.company_name ILIKE '%remus%'
ORDER BY j.created_at DESC
LIMIT 10;
