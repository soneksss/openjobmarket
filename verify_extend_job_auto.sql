-- SQL Verification Script for Job Extension Issues (Auto Version)
-- This version automatically finds a job to test with

-- =========================================
-- 1. Check if extend_job function exists
-- =========================================
\echo '=== 1. Checking if extend_job function exists ==='
SELECT
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'extend_job';

\echo ''
\echo '=== 2. Check RLS policies on jobs table ==='
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

\echo ''
\echo '=== 3. Check for any triggers on jobs table ==='
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'jobs';

\echo ''
\echo '=== 4. Check jobs table structure ==='
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('expires_at', 'recruitment_timeline', 'price', 'is_active', 'updated_at', 'created_at')
ORDER BY column_name;

\echo ''
\echo '=== 5. Check for expired/expiring jobs ==='
SELECT
  id,
  title,
  company_id,
  homeowner_id,
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
  EXTRACT(DAY FROM (expires_at - NOW())) as days_until_expiration
FROM jobs
WHERE expires_at IS NOT NULL
ORDER BY expires_at ASC
LIMIT 20;

\echo ''
\echo '=== 6. Test extend_job function with a real job ==='
-- This will automatically find an expired or expiring job and test extending it
DO $$
DECLARE
  test_job_id UUID;
  test_job_title TEXT;
  old_expires_at TIMESTAMPTZ;
  new_expires_at TIMESTAMPTZ;
  result BOOLEAN;
BEGIN
  -- Find an expired or expiring job
  SELECT id, title, expires_at INTO test_job_id, test_job_title, old_expires_at
  FROM jobs
  WHERE expires_at IS NOT NULL
    AND (expires_at < NOW() OR expires_at < NOW() + INTERVAL '7 days')
  LIMIT 1;

  IF test_job_id IS NULL THEN
    RAISE NOTICE 'No expired or expiring jobs found to test with. Skipping function test.';
  ELSE
    RAISE NOTICE 'Testing extend_job function with job: % (ID: %)', test_job_title, test_job_id;
    RAISE NOTICE 'Old expiration date: %', old_expires_at;

    -- Test the function (this will actually extend the job!)
    SELECT extend_job(test_job_id, '7_days', 10) INTO result;

    IF result THEN
      -- Get the new expiration date
      SELECT expires_at INTO new_expires_at FROM jobs WHERE id = test_job_id;
      RAISE NOTICE 'SUCCESS: Job extended successfully!';
      RAISE NOTICE 'New expiration date: %', new_expires_at;
      RAISE NOTICE 'Days added: %', EXTRACT(DAY FROM (new_expires_at - old_expires_at));
    ELSE
      RAISE NOTICE 'FAILED: extend_job function returned FALSE';
    END IF;
  END IF;
END $$;

\echo ''
\echo '=== 7. Verify updated job details ==='
SELECT
  id,
  title,
  expires_at,
  recruitment_timeline,
  price,
  is_active,
  updated_at,
  created_at
FROM jobs
WHERE expires_at IS NOT NULL
  AND updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC
LIMIT 5;
