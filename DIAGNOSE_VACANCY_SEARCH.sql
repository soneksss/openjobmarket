-- Diagnostic Query: Check Vacancy Search Issue
-- Run this in Supabase SQL Editor to diagnose why vacancies don't appear in search

-- ============================================
-- CHECK 1: Count all jobs by type
-- ============================================
SELECT
  'Total Jobs' as check_type,
  is_tradespeople_job,
  COUNT(*) as count
FROM jobs
GROUP BY is_tradespeople_job;

-- ============================================
-- CHECK 2: Count ACTIVE vacancies
-- ============================================
SELECT
  'Active Vacancies' as check_type,
  COUNT(*) as count,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coordinates,
  COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as without_coordinates
FROM jobs
WHERE is_tradespeople_job = FALSE
  AND is_active = TRUE
  AND status = 'open'
  AND (expires_at IS NULL OR expires_at > NOW());

-- ============================================
-- CHECK 3: Sample active vacancies with details
-- ============================================
SELECT
  id,
  title,
  status,
  is_active,
  is_tradespeople_job,
  latitude,
  longitude,
  location,
  expires_at,
  created_at,
  company_id
FROM jobs
WHERE is_tradespeople_job = FALSE
  AND is_active = TRUE
  AND status = 'open'
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- CHECK 4: Check "Plumber" vacancies specifically
-- ============================================
SELECT
  id,
  title,
  status,
  is_active,
  is_tradespeople_job,
  latitude,
  longitude,
  location,
  expires_at,
  company_id
FROM jobs
WHERE is_tradespeople_job = FALSE
  AND (
    LOWER(title) LIKE '%plumber%'
    OR LOWER(description) LIKE '%plumber%'
  )
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- CHECK 5: Check company "Remus" jobs
-- ============================================
SELECT
  j.id,
  j.title,
  j.status,
  j.is_active,
  j.is_tradespeople_job,
  j.latitude,
  j.longitude,
  j.location,
  j.expires_at,
  cp.company_name
FROM jobs j
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE cp.company_name ILIKE '%remus%'
ORDER BY j.created_at DESC
LIMIT 10;

-- ============================================
-- CHECK 6: Verify job status and expiration logic
-- ============================================
SELECT
  'Status Distribution' as check_type,
  status,
  is_tradespeople_job,
  COUNT(*) as count
FROM jobs
GROUP BY status, is_tradespeople_job
ORDER BY status, is_tradespeople_job;

-- ============================================
-- CHECK 7: Check recently created vacancies (last 7 days)
-- ============================================
SELECT
  id,
  title,
  status,
  is_active,
  is_tradespeople_job,
  latitude,
  longitude,
  created_at,
  expires_at
FROM jobs
WHERE is_tradespeople_job = FALSE
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
