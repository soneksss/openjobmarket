-- Migration: Fix Jobs Table RLS Policies
-- Date: 2026-01-19
-- Purpose: Audit and fix RLS policies on jobs table to allow proper job posting
--          Ensure policies reference correct profile tables (professional_profiles, homeowner_profiles, company_profiles)
--          Remove any broken policies referencing non-existent tables

-- Enable RLS on jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 1. DROP ALL EXISTING POLICIES ON JOBS TABLE
-- =========================================
-- This ensures we start with a clean slate
DROP POLICY IF EXISTS "Users can view active jobs" ON jobs;
DROP POLICY IF EXISTS "Companies can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Homeowners can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Professionals can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Companies can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Homeowners can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Companies can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Homeowners can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Companies can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "Homeowners can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can view active jobs" ON jobs;
DROP POLICY IF EXISTS "Public can view active jobs" ON jobs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable select for all users" ON jobs;
DROP POLICY IF EXISTS "Enable update for job owners" ON jobs;
DROP POLICY IF EXISTS "Enable delete for job owners" ON jobs;

-- =========================================
-- 2. CREATE NEW RLS POLICIES
-- =========================================

-- SELECT Policy: Anyone can view active jobs
CREATE POLICY "Anyone can view active jobs"
ON jobs FOR SELECT
TO authenticated, anon
USING (
  is_active = true
  OR auth.uid() IN (
    SELECT user_id FROM company_profiles WHERE id = jobs.company_id
    UNION
    SELECT user_id FROM homeowner_profiles WHERE id = jobs.homeowner_id
  )
);

-- INSERT Policy for Companies
CREATE POLICY "Companies can insert jobs"
ON jobs FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NOT NULL
  AND company_id IN (
    SELECT id FROM company_profiles WHERE user_id = auth.uid()
  )
);

-- INSERT Policy for Homeowners
CREATE POLICY "Homeowners can insert jobs"
ON jobs FOR INSERT
TO authenticated
WITH CHECK (
  homeowner_id IS NOT NULL
  AND homeowner_id IN (
    SELECT id FROM homeowner_profiles WHERE user_id = auth.uid()
  )
);

-- INSERT Policy for Professionals (jobseekers with homeowner permission posting trade jobs)
-- This allows professionals with is_homeowner=true to post trade jobs via their professional profile
DROP POLICY IF EXISTS "Professionals with homeowner permission can insert trade jobs" ON jobs;
CREATE POLICY "Professionals with homeowner permission can insert trade jobs"
ON jobs FOR INSERT
TO authenticated
WITH CHECK (
  homeowner_id IS NOT NULL
  AND homeowner_id IN (
    -- Allow professional_profiles to post if user has is_homeowner=true
    SELECT pp.id FROM professional_profiles pp
    INNER JOIN users u ON pp.user_id = u.id
    WHERE u.id = auth.uid() AND u.is_homeowner = true
  )
);

-- UPDATE Policy: Users can update their own jobs
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
CREATE POLICY "Users can update their own jobs"
ON jobs FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM company_profiles WHERE id = jobs.company_id
    UNION
    SELECT user_id FROM homeowner_profiles WHERE id = jobs.homeowner_id
  )
);

-- DELETE Policy: Users can delete their own jobs
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
CREATE POLICY "Users can delete their own jobs"
ON jobs FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM company_profiles WHERE id = jobs.company_id
    UNION
    SELECT user_id FROM homeowner_profiles WHERE id = jobs.homeowner_id
  )
);

-- =========================================
-- 3. VERIFY POLICIES ARE WORKING
-- =========================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Jobs table RLS policies have been reset and recreated successfully';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  1. Anyone can view active jobs (SELECT)';
  RAISE NOTICE '  2. Companies can insert jobs (INSERT)';
  RAISE NOTICE '  3. Homeowners can insert jobs (INSERT)';
  RAISE NOTICE '  4. Professionals with homeowner permission can insert trade jobs (INSERT)';
  RAISE NOTICE '  5. Users can update their own jobs (UPDATE)';
  RAISE NOTICE '  6. Users can delete their own jobs (DELETE)';
END $$;

-- =========================================
-- COMMENT THE POLICIES
-- =========================================

COMMENT ON POLICY "Anyone can view active jobs" ON jobs IS
'Allows anyone (authenticated or anonymous) to view active jobs, and job owners to view their own inactive jobs';

COMMENT ON POLICY "Companies can insert jobs" ON jobs IS
'Allows authenticated users to insert jobs if they own the company_profile';

COMMENT ON POLICY "Homeowners can insert jobs" ON jobs IS
'Allows authenticated users to insert jobs if they own the homeowner_profile';

COMMENT ON POLICY "Professionals with homeowner permission can insert trade jobs" ON jobs IS
'Allows professionals (jobseekers) with is_homeowner=true to post trade jobs using their professional_profile ID in the homeowner_id column';

COMMENT ON POLICY "Users can update their own jobs" ON jobs IS
'Allows users to update jobs they posted (via company_profiles or homeowner_profiles)';

COMMENT ON POLICY "Users can delete their own jobs" ON jobs IS
'Allows users to delete jobs they posted (via company_profiles or homeowner_profiles)';
