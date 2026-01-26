-- SQL Verification Script for Job Extension Issues (READ-ONLY VERSION)
-- This version ONLY checks the database state without making any changes

-- =========================================
-- 1. Check if extend_job function exists
-- =========================================
SELECT
  '=== extend_job Function ===' as section,
  routine_name as function_name,
  routine_type as type,
  data_type as return_type,
  CASE
    WHEN routine_definition IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'extend_job';

-- If the above returns no rows, the function doesn't exist

-- =========================================
-- 2. Check RLS policies on jobs table
-- =========================================
SELECT
  '=== RLS Policies ===' as section,
  policyname as policy_name,
  cmd as operation,
  permissive,
  roles,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'jobs'
ORDER BY cmd, policyname;

-- =========================================
-- 3. Check for any triggers on jobs table
-- =========================================
SELECT
  '=== Triggers ===' as section,
  trigger_name,
  event_manipulation as event,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'jobs';

-- =========================================
-- 4. Check jobs table structure
-- =========================================
SELECT
  '=== Jobs Table Columns ===' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('expires_at', 'recruitment_timeline', 'price', 'is_active', 'updated_at', 'created_at')
ORDER BY column_name;

-- =========================================
-- 5. Count jobs by status
-- =========================================
SELECT
  '=== Job Status Summary ===' as section,
  CASE
    WHEN expires_at IS NULL THEN 'NO_EXPIRATION'
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN expires_at < NOW() + INTERVAL '3 days' THEN 'EXPIRING_SOON'
    WHEN expires_at < NOW() + INTERVAL '7 days' THEN 'EXPIRING_WITHIN_WEEK'
    ELSE 'ACTIVE'
  END as status,
  COUNT(*) as count
FROM jobs
GROUP BY status
ORDER BY
  CASE status
    WHEN 'EXPIRED' THEN 1
    WHEN 'EXPIRING_SOON' THEN 2
    WHEN 'EXPIRING_WITHIN_WEEK' THEN 3
    WHEN 'ACTIVE' THEN 4
    WHEN 'NO_EXPIRATION' THEN 5
  END;

-- =========================================
-- 6. Show expired/expiring jobs details
-- =========================================
SELECT
  '=== Expired & Expiring Jobs ===' as section,
  id,
  title,
  CASE
    WHEN company_id IS NOT NULL THEN 'COMPANY'
    WHEN homeowner_id IS NOT NULL THEN 'HOMEOWNER'
    ELSE 'UNKNOWN'
  END as job_type,
  expires_at,
  is_active,
  recruitment_timeline,
  price,
  created_at,
  CASE
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN expires_at < NOW() + INTERVAL '3 days' THEN 'EXPIRING_SOON'
    ELSE 'ACTIVE'
  END as status,
  ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400, 1) as days_until_expiration
FROM jobs
WHERE expires_at IS NOT NULL
  AND (expires_at < NOW() + INTERVAL '7 days')
ORDER BY expires_at ASC
LIMIT 20;

-- =========================================
-- 7. Check for jobs that might need extension
-- =========================================
SELECT
  '=== Jobs Needing Extension ===' as section,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as already_expired,
  COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '1 day') as expires_in_1_day,
  COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '3 days') as expires_in_3_days,
  COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '7 days') as expires_in_7_days
FROM jobs
WHERE expires_at IS NOT NULL;

-- =========================================
-- 8. Show sample job IDs for manual testing
-- =========================================
SELECT
  '=== Sample Job IDs for Manual Testing ===' as section,
  id,
  title,
  expires_at,
  CASE
    WHEN expires_at < NOW() THEN 'EXPIRED (good for testing)'
    WHEN expires_at < NOW() + INTERVAL '3 days' THEN 'EXPIRING SOON (good for testing)'
    ELSE 'ACTIVE'
  END as test_suitability
FROM jobs
WHERE expires_at IS NOT NULL
  AND expires_at < NOW() + INTERVAL '7 days'
ORDER BY expires_at ASC
LIMIT 5;

-- =========================================
-- MANUAL TEST INSTRUCTIONS
-- =========================================
-- To manually test the extend_job function, pick a job ID from above and run:
--
-- SELECT extend_job(
--   'PASTE_JOB_ID_HERE'::UUID,
--   '7_days'::TEXT,
--   10::NUMERIC
-- );
--
-- Expected result: t (true) if successful, f (false) if failed
--
-- Then verify with:
-- SELECT id, title, expires_at, recruitment_timeline, price, updated_at
-- FROM jobs WHERE id = 'PASTE_JOB_ID_HERE'::UUID;
