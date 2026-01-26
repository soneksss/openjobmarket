-- Test Script for extend_job Function
-- Compatible with Supabase SQL Editor
--
-- STEP 1: Run this script to find a job to test with
-- STEP 2: Copy the job ID from the results
-- STEP 3: Run the test at the bottom with the actual job ID

-- =========================================
-- Find jobs suitable for testing
-- =========================================
SELECT
  'Jobs Available for Testing' as section,
  id as job_id,
  title,
  expires_at as current_expiration,
  recruitment_timeline as current_timeline,
  price as current_price,
  is_active,
  CASE
    WHEN expires_at < NOW() THEN '⚠️ EXPIRED - Good for testing reactivation'
    WHEN expires_at < NOW() + INTERVAL '3 days' THEN '⏰ EXPIRING SOON - Good for testing extension'
    ELSE '✓ ACTIVE - Can still test'
  END as status,
  ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400::numeric, 1) as days_remaining
FROM jobs
WHERE expires_at IS NOT NULL
ORDER BY expires_at ASC
LIMIT 10;

-- =========================================
-- TESTING INSTRUCTIONS
-- =========================================
-- Copy a job_id from above and paste it into the test below
-- Then run this in a NEW SQL query (don't run all at once):

/*

-- TEST 1: Check current job details
SELECT
  id,
  title,
  expires_at,
  recruitment_timeline,
  price,
  is_active,
  created_at,
  updated_at
FROM jobs
WHERE id = 'PASTE-JOB-ID-HERE'::UUID;

-- TEST 2: Extend the job by 7 days (£10)
SELECT extend_job(
  'PASTE-JOB-ID-HERE'::UUID,
  '7_days'::TEXT,
  10::NUMERIC
) as extension_result;

-- TEST 3: Verify the extension worked
SELECT
  id,
  title,
  expires_at as new_expiration,
  recruitment_timeline as new_timeline,
  price as new_price,
  is_active,
  updated_at as last_updated
FROM jobs
WHERE id = 'PASTE-JOB-ID-HERE'::UUID;

-- TEST 4: Calculate how many days were added
SELECT
  title,
  expires_at as new_expires_at,
  EXTRACT(DAY FROM (expires_at - NOW())) as days_from_now
FROM jobs
WHERE id = 'PASTE-JOB-ID-HERE'::UUID;

*/

-- =========================================
-- EXPECTED RESULTS
-- =========================================
-- TEST 2 should return: true
-- TEST 3 should show:
--   - expires_at is ~7 days from NOW
--   - recruitment_timeline is '7_days'
--   - price is 10
--   - is_active is true
--   - updated_at is very recent
