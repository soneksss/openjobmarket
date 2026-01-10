-- Check RLS policies on tables used in Trade Jobs search

-- Check if RLS is enabled on jobs table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('jobs', 'homeowner_profiles', 'company_profiles');

-- Check RLS policies on jobs table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'jobs';

-- Check RLS policies on homeowner_profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'homeowner_profiles';

-- Check RLS policies on company_profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'company_profiles';

-- Test query: Try to select Trade Jobs directly
SELECT COUNT(*) as trade_jobs_count
FROM jobs
WHERE is_tradespeople_job = true
  AND status = 'open'
  AND is_active = true;

-- Test query: Try to select Trade Jobs with homeowner join
SELECT COUNT(*) as trade_jobs_with_homeowner_count
FROM jobs j
LEFT JOIN homeowner_profiles hp ON j.homeowner_id = hp.id
WHERE j.is_tradespeople_job = true
  AND j.status = 'open'
  AND j.is_active = true;
