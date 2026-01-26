-- SQL Verification Script for Job Extension Issues
-- Run this to check the current state and identify problems

-- 1. Check if extend_job function exists
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'extend_job';

-- 2. Check RLS policies on jobs table
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'jobs'
ORDER BY cmd, policyname;

-- 3. Check for any triggers on jobs table that might interfere
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'jobs';

-- 4. Test the extend_job function with a sample job
-- Replace 'YOUR_JOB_ID_HERE' with an actual job ID
-- This will show if the function works correctly
SELECT extend_job(
  'YOUR_JOB_ID_HERE'::UUID,
  '7_days'::TEXT,
  10::NUMERIC
);

-- 5. Check for any expired jobs that need extension
SELECT
  id,
  title,
  company_id,
  homeowner_id,
  expires_at,
  is_active,
  recruitment_timeline,
  CASE
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN expires_at < NOW() + INTERVAL '3 days' THEN 'EXPIRING_SOON'
    ELSE 'ACTIVE'
  END as status
FROM jobs
WHERE expires_at IS NOT NULL
ORDER BY expires_at ASC
LIMIT 20;

-- 6. Check jobs table structure for required columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('expires_at', 'recruitment_timeline', 'price', 'is_active', 'updated_at')
ORDER BY column_name;
