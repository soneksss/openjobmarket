-- ============================================================================
-- DEBUG QUERIES FOR JOB SEARCH ISSUE
-- Run these queries one by one in Supabase SQL Editor to diagnose the problem
-- ============================================================================

-- Query 1: Check ALL jobs in the database (regardless of active status)
-- This shows every job with their key fields
SELECT
  id,
  title,
  location,
  is_active,
  expires_at,
  created_at,
  updated_at,
  latitude,
  longitude,
  company_id,
  -- Check if expired
  CASE
    WHEN expires_at IS NULL THEN 'NO EXPIRATION'
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN expires_at > NOW() THEN 'VALID'
    ELSE 'UNKNOWN'
  END as expiration_status,
  -- Days until expiration
  CASE
    WHEN expires_at IS NOT NULL THEN EXTRACT(DAY FROM (expires_at - NOW()))
    ELSE NULL
  END as days_until_expiration
FROM public.jobs
ORDER BY created_at DESC;

-- Query 2: Check specifically for "Deputy Manager" job (case-insensitive)
SELECT
  id,
  title,
  location,
  is_active,
  expires_at,
  created_at,
  latitude,
  longitude,
  company_id,
  -- Full location details
  city,
  country,
  formatted_address,
  -- Job details
  job_type,
  experience_level,
  salary_min,
  salary_max,
  salary_period
FROM public.jobs
WHERE title ILIKE '%deputy%manager%'
   OR title ILIKE '%deputy%'
   OR title ILIKE '%manager%';

-- Query 3: Check what jobs would appear in search (active + non-expired)
SELECT
  id,
  title,
  location,
  is_active,
  expires_at,
  latitude,
  longitude,
  CASE
    WHEN expires_at < NOW() THEN 'EXPIRED - Should be hidden'
    WHEN expires_at > NOW() THEN 'VALID - Should show'
    WHEN expires_at IS NULL THEN 'NO EXPIRATION - Should show'
  END as status
FROM public.jobs
WHERE is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC;

-- Query 4: Check the company_profiles table to verify company exists
SELECT
  cp.id as company_id,
  cp.company_name,
  cp.user_id,
  u.email,
  COUNT(j.id) as total_jobs,
  COUNT(CASE WHEN j.is_active = true THEN 1 END) as active_jobs
FROM public.company_profiles cp
LEFT JOIN auth.users u ON cp.user_id = u.id
LEFT JOIN public.jobs j ON j.company_id = cp.id
GROUP BY cp.id, cp.company_name, cp.user_id, u.email
ORDER BY cp.company_name;

-- Query 5: Check for jobs that SHOULD appear but DON'T (debugging filters)
-- Shows jobs that are active but might have issues
SELECT
  j.id,
  j.title,
  j.is_active,
  j.expires_at,
  j.latitude,
  j.longitude,
  cp.company_name,
  -- Potential issues
  CASE
    WHEN j.latitude IS NULL THEN 'NO COORDINATES'
    ELSE 'HAS COORDINATES'
  END as coord_status,
  CASE
    WHEN j.expires_at < NOW() THEN 'EXPIRED'
    WHEN j.expires_at > NOW() THEN 'VALID'
    WHEN j.expires_at IS NULL THEN 'NO EXPIRATION'
  END as expiry_status
FROM public.jobs j
LEFT JOIN public.company_profiles cp ON j.company_id = cp.id
WHERE j.is_active = true
ORDER BY j.created_at DESC;

-- Query 6: FIND THE ACTUAL PROBLEM - Check for jobs by the company email
-- Replace 'soneksss@inbox.lv' with the actual email if different
SELECT
  j.id,
  j.title,
  j.location,
  j.is_active,
  j.expires_at,
  j.latitude,
  j.longitude,
  cp.company_name,
  u.email as company_email,
  -- Current timestamp for comparison
  NOW() as current_time,
  -- Expiration check
  CASE
    WHEN j.expires_at IS NULL THEN 'NEVER EXPIRES'
    WHEN j.expires_at < NOW() THEN 'EXPIRED ❌'
    WHEN j.expires_at > NOW() THEN 'ACTIVE ✅'
  END as status,
  -- Should it appear in search?
  CASE
    WHEN j.is_active = false THEN 'NO - Inactive'
    WHEN j.expires_at IS NOT NULL AND j.expires_at < NOW() THEN 'NO - Expired'
    WHEN j.is_active = true AND (j.expires_at IS NULL OR j.expires_at > NOW()) THEN 'YES - Should appear ✅'
    ELSE 'UNKNOWN'
  END as should_appear_in_search
FROM public.jobs j
INNER JOIN public.company_profiles cp ON j.company_id = cp.id
INNER JOIN auth.users u ON cp.user_id = u.id
WHERE u.email = 'soneksss@inbox.lv'
ORDER BY j.created_at DESC;

-- Query 7: FIX EXPIRED JOBS - If jobs are expired, this will reactivate them
-- UNCOMMENT AND RUN THIS IF YOU WANT TO EXTEND ALL EXPIRED JOBS
/*
UPDATE public.jobs
SET
  expires_at = NOW() + INTERVAL '28 days',
  is_active = true,
  updated_at = NOW()
WHERE company_id IN (
  SELECT cp.id
  FROM public.company_profiles cp
  INNER JOIN auth.users u ON cp.user_id = u.id
  WHERE u.email = 'soneksss@inbox.lv'
)
AND (expires_at < NOW() OR is_active = false)
RETURNING id, title, expires_at, is_active;
*/

-- Query 8: Check current timestamp vs job expiration dates
SELECT
  NOW() as current_server_time,
  NOW() + INTERVAL '28 days' as extended_to_28_days,
  NOW() + INTERVAL '7 days' as extended_to_7_days;
