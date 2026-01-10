-- Verification Query: Check if Plumber jobs are now visible
-- Run this in Supabase SQL Editor to confirm the fix

-- Check 1: Plumber jobs with status and coordinates
SELECT
  id,
  title,
  status,
  is_active,
  is_tradespeople_job,
  latitude,
  longitude,
  location,
  created_at,
  expires_at
FROM jobs
WHERE is_tradespeople_job = FALSE
  AND LOWER(title) LIKE '%plumber%'
ORDER BY created_at DESC;

-- Check 2: Count active vacancies by status
SELECT
  status,
  COUNT(*) as count
FROM jobs
WHERE is_tradespeople_job = FALSE
GROUP BY status;

-- Check 3: Verify Remus company plumber jobs
SELECT
  j.id,
  j.title,
  j.status,
  j.is_active,
  j.latitude,
  j.longitude,
  j.location,
  cp.company_name
FROM jobs j
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE cp.company_name ILIKE '%remus%'
  AND j.is_tradespeople_job = FALSE
ORDER BY j.created_at DESC;

-- Check 4: All active vacancies (should be searchable)
SELECT
  COUNT(*) as searchable_vacancies
FROM jobs
WHERE is_tradespeople_job = FALSE
  AND is_active = TRUE
  AND status = 'open'
  AND (expires_at IS NULL OR expires_at > NOW());
