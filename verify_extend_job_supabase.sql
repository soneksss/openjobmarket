-- SQL Verification Script for Job Extension Issues
-- Compatible with Supabase SQL Editor
-- Run this in your Supabase SQL Editor (Database -> SQL Editor)

-- =========================================
-- 1. Check if extend_job function exists
-- =========================================
SELECT
  'extend_job Function Check' as check_name,
  routine_name as function_name,
  routine_type as type,
  data_type as return_type,
  CASE
    WHEN routine_name = 'extend_job' THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'extend_job';

-- =========================================
-- 2. Check RLS policies on jobs table
-- =========================================
SELECT
  'RLS Policies' as check_name,
  policyname as policy_name,
  cmd as operation,
  permissive,
  ARRAY_TO_STRING(roles, ', ') as roles
FROM pg_policies
WHERE tablename = 'jobs'
ORDER BY cmd, policyname;

-- =========================================
-- 3. Check jobs table structure
-- =========================================
SELECT
  'Jobs Table Columns' as check_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('expires_at', 'recruitment_timeline', 'price', 'is_active', 'updated_at', 'created_at')
ORDER BY column_name;

-- =========================================
-- 4. Count jobs by status (FIXED GROUP BY)
-- =========================================
SELECT
  'Job Status Summary' as check_name,
  status,
  COUNT(*) as count
FROM (
  SELECT
    CASE
      WHEN expires_at IS NULL THEN 'NO_EXPIRATION'
      WHEN expires_at < NOW() THEN 'EXPIRED'
      WHEN expires_at < NOW() + INTERVAL '3 days' THEN 'EXPIRING_SOON'
      WHEN expires_at < NOW() + INTERVAL '7 days' THEN 'EXPIRING_WITHIN_WEEK'
      ELSE 'ACTIVE'
    END as status
  FROM jobs
) status_counts
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
-- 5. Show expired/expiring jobs details
-- =========================================
SELECT
  'Expired & Expiring Jobs' as check_name,
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
  CASE
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN expires_at < NOW() + INTERVAL '3 days' THEN 'EXPIRING_SOON'
    ELSE 'ACTIVE'
  END as status,
  ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400::numeric, 1) as days_until_expiration
FROM jobs
WHERE expires_at IS NOT NULL
  AND (expires_at < NOW() + INTERVAL '7 days')
ORDER BY expires_at ASC
LIMIT 10;

-- =========================================
-- 6. Sample job IDs for manual testing
-- =========================================
SELECT
  'Sample Job IDs' as check_name,
  id,
  title,
  expires_at,
  recruitment_timeline,
  CASE
    WHEN expires_at < NOW() THEN 'EXPIRED - Good for testing'
    WHEN expires_at < NOW() + INTERVAL '3 days' THEN 'EXPIRING SOON - Good for testing'
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
-- Copy a job ID from the results above, then run this in a new query:
--
-- SELECT extend_job(
--   'PASTE-JOB-ID-HERE'::UUID,
--   '7_days'::TEXT,
--   10::NUMERIC
-- );
--
-- Expected result: true if successful
--
-- Then verify the extension worked:
-- SELECT id, title, expires_at, recruitment_timeline, price, is_active, updated_at
-- FROM jobs WHERE id = 'PASTE-JOB-ID-HERE'::UUID;
