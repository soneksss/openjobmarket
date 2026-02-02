-- ============================================================================
-- Migration: Normalize Users to Two Account Types (individual / business)
-- Date: 2026-02-01
-- Purpose: Single source of truth for account type, fix data inconsistencies
-- ============================================================================

-- ============================================================================
-- STEP 1: Add account_type column to users table (NO CONSTRAINT YET)
-- ============================================================================

-- Drop constraint if it exists (from previous failed attempts)
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_account_type_check;

-- Add the new column without constraint first
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

COMMENT ON COLUMN users.account_type IS 'Primary account type: individual (job seekers, professionals) or business (tradespeople, self-employed, companies)';

-- ============================================================================
-- STEP 2: Populate account_type based on current flags (BEFORE CONSTRAINT)
-- ============================================================================

-- First, set ALL rows to a default to ensure no NULLs or invalid values
UPDATE users
SET account_type = 'individual'
WHERE account_type IS NULL
   OR account_type NOT IN ('individual', 'business')
   OR account_type = '';

-- Business accounts: is_tradespeople = true OR users with company/contractor profiles
UPDATE users
SET account_type = 'business'
WHERE is_tradespeople = true
   OR user_type IN ('company', 'contractor');

-- Check professional_profiles for is_self_employed
UPDATE users u
SET account_type = 'business'
WHERE EXISTS (
    SELECT 1 FROM professional_profiles pp
    WHERE pp.user_id = u.id
    AND pp.is_self_employed = true
  );

-- Verify no NULLs remain
DO $$
DECLARE
  v_null_count INTEGER;
  v_invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count FROM users WHERE account_type IS NULL;
  SELECT COUNT(*) INTO v_invalid_count FROM users WHERE account_type NOT IN ('individual', 'business');

  IF v_null_count > 0 OR v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Data issue: % NULL values, % invalid values found before constraint', v_null_count, v_invalid_count;
  END IF;

  RAISE NOTICE 'All users have valid account_type values. Safe to add constraint.';
END $$;

-- ============================================================================
-- STEP 2b: NOW add the check constraint (after all data is populated)
-- ============================================================================

-- Drop constraint if it exists (from previous failed attempts)
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_account_type_check;

-- Add check constraint now that all data is populated
ALTER TABLE users
ADD CONSTRAINT users_account_type_check
CHECK (account_type IN ('individual', 'business'));

-- Log the distribution
DO $$
DECLARE
  v_individual_count INTEGER;
  v_business_count INTEGER;
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_individual_count FROM users WHERE account_type = 'individual';
  SELECT COUNT(*) INTO v_business_count FROM users WHERE account_type = 'business';
  SELECT COUNT(*) INTO v_null_count FROM users WHERE account_type IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Account Type Distribution:';
  RAISE NOTICE 'Individual accounts: %', v_individual_count;
  RAISE NOTICE 'Business accounts: %', v_business_count;
  RAISE NOTICE 'NULL (should be 0): %', v_null_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 3: Fix users with missing or conflicting roles
-- ============================================================================

-- Create a table to log fixes for audit purposes
CREATE TABLE IF NOT EXISTS account_type_migration_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  old_state JSONB,
  new_state JSONB,
  fix_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix users with no role flags at all (set to individual)
INSERT INTO account_type_migration_log (user_id, old_state, new_state, fix_type)
SELECT
  id,
  jsonb_build_object(
    'is_jobseeker', is_jobseeker,
    'is_tradespeople', is_tradespeople,
    'is_employer', is_employer,
    'is_homeowner', is_homeowner,
    'user_type', user_type,
    'account_type', account_type
  ),
  jsonb_build_object('account_type', 'individual'),
  'no_role_flags'
FROM users
WHERE (is_jobseeker IS NULL OR is_jobseeker = false)
  AND (is_tradespeople IS NULL OR is_tradespeople = false)
  AND (is_employer IS NULL OR is_employer = false)
  AND (is_homeowner IS NULL OR is_homeowner = false)
  AND user_type = 'professional'
  AND account_type = 'individual';

-- Fix conflicting roles: if is_tradespeople but account_type is individual
UPDATE users
SET account_type = 'business'
WHERE is_tradespeople = true
  AND account_type = 'individual';

-- Log these fixes
INSERT INTO account_type_migration_log (user_id, old_state, new_state, fix_type)
SELECT
  id,
  jsonb_build_object('is_tradespeople', true, 'account_type', 'individual'),
  jsonb_build_object('account_type', 'business'),
  'tradespeople_but_individual'
FROM users
WHERE is_tradespeople = true
  AND account_type = 'business';

-- ============================================================================
-- STEP 4: Ensure professional_profiles consistency
-- ============================================================================

-- 4a. Every 'individual' user of type 'professional' must have a professional_profiles row
INSERT INTO professional_profiles (user_id, is_self_employed, profile_visible, available_for_work, created_at)
SELECT
  u.id,
  false,  -- is_self_employed = false for individuals
  true,   -- profile_visible = true
  true,   -- available_for_work = true
  NOW()
FROM users u
WHERE u.account_type = 'individual'
  AND u.user_type = 'professional'
  AND NOT EXISTS (
    SELECT 1 FROM professional_profiles pp WHERE pp.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Log inserted profiles
DO $$
DECLARE
  v_inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  IF v_inserted_count > 0 THEN
    RAISE NOTICE 'Created % missing professional_profiles for individual users', v_inserted_count;
  END IF;
END $$;

-- 4b. Every 'business' user with professional_profiles must have is_self_employed = true
UPDATE professional_profiles pp
SET is_self_employed = true
FROM users u
WHERE pp.user_id = u.id
  AND u.account_type = 'business'
  AND (pp.is_self_employed IS NULL OR pp.is_self_employed = false);

-- Log these updates
INSERT INTO account_type_migration_log (user_id, old_state, new_state, fix_type)
SELECT
  pp.user_id,
  jsonb_build_object('is_self_employed', pp.is_self_employed),
  jsonb_build_object('is_self_employed', true),
  'business_is_self_employed_fix'
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
WHERE u.account_type = 'business'
  AND pp.is_self_employed = true;  -- After the update

-- ============================================================================
-- STEP 5: Identify and fix job application violations
-- ============================================================================

-- Create a view to identify violations
CREATE OR REPLACE VIEW job_application_violations AS
SELECT
  ja.id AS application_id,
  ja.job_id,
  ja.user_id AS applicant_id,
  u.account_type,
  j.is_tradespeople_job,
  CASE
    WHEN u.account_type = 'individual' AND j.is_tradespeople_job = true
    THEN 'individual_applied_to_trade_job'
    ELSE 'ok'
  END AS violation_type
FROM job_applications ja
JOIN users u ON ja.user_id = u.id
JOIN jobs j ON ja.job_id = j.id
WHERE u.account_type = 'individual'
  AND j.is_tradespeople_job = true;

-- Log violations (don't delete, just mark)
INSERT INTO account_type_migration_log (user_id, old_state, new_state, fix_type)
SELECT
  v.applicant_id,
  jsonb_build_object(
    'application_id', v.application_id,
    'job_id', v.job_id,
    'is_tradespeople_job', v.is_tradespeople_job
  ),
  jsonb_build_object('action', 'flagged_for_review'),
  'individual_applied_to_trade_job'
FROM job_application_violations v
WHERE v.violation_type = 'individual_applied_to_trade_job';

-- Report violations
DO $$
DECLARE
  v_violation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_violation_count
  FROM job_application_violations
  WHERE violation_type = 'individual_applied_to_trade_job';

  IF v_violation_count > 0 THEN
    RAISE WARNING 'Found % job applications where individual accounts applied to trade jobs. These have been logged for review.', v_violation_count;
  ELSE
    RAISE NOTICE 'No job application violations found.';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Verify job posting permissions
-- ============================================================================

-- Jobs/vacancies should only be posted by business accounts or employers
-- Create a view to identify any violations
CREATE OR REPLACE VIEW job_posting_violations AS
SELECT
  j.id AS job_id,
  j.title,
  j.company_id,
  j.homeowner_id,
  u.id AS poster_user_id,
  u.account_type,
  j.is_tradespeople_job,
  CASE
    WHEN j.is_tradespeople_job = false AND u.account_type = 'business'
    THEN 'business_posted_regular_job'
    ELSE 'ok'
  END AS potential_issue
FROM jobs j
LEFT JOIN company_profiles cp ON j.company_id = cp.id
LEFT JOIN homeowner_profiles hp ON j.homeowner_id = hp.id
LEFT JOIN users u ON (cp.user_id = u.id OR hp.user_id = u.id)
WHERE j.is_tradespeople_job = false
  AND u.account_type = 'business';

-- Report potential issues
DO $$
DECLARE
  v_issue_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_issue_count
  FROM job_posting_violations
  WHERE potential_issue = 'business_posted_regular_job';

  IF v_issue_count > 0 THEN
    RAISE NOTICE 'Note: % jobs were posted by business accounts (this may be valid for contractors hiring).', v_issue_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Add helper function to check account permissions
-- ============================================================================

CREATE OR REPLACE FUNCTION can_apply_to_job(p_user_id UUID, p_job_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_account_type VARCHAR(20);
  v_is_trade_job BOOLEAN;
BEGIN
  -- Get user's account type
  SELECT account_type INTO v_account_type
  FROM users
  WHERE id = p_user_id;

  -- Get job type
  SELECT is_tradespeople_job INTO v_is_trade_job
  FROM jobs
  WHERE id = p_job_id;

  -- Business accounts can apply to trade jobs
  IF v_is_trade_job = true THEN
    RETURN v_account_type = 'business';
  END IF;

  -- Both can apply to regular jobs
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_post_vacancy(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_account_type VARCHAR(20);
  v_user_type VARCHAR(50);
BEGIN
  SELECT account_type, user_type INTO v_account_type, v_user_type
  FROM users
  WHERE id = p_user_id;

  -- Companies and businesses can post vacancies
  RETURN v_account_type = 'business' OR v_user_type IN ('company', 'contractor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_apply_to_job(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_post_vacancy(UUID) TO authenticated;

-- ============================================================================
-- STEP 8: Update RLS policies to use account_type
-- ============================================================================

-- Policy: Only business accounts can apply to trade jobs
DROP POLICY IF EXISTS "Business accounts can apply to trade jobs" ON job_applications;

CREATE POLICY "Business accounts can apply to trade jobs"
ON job_applications FOR INSERT
WITH CHECK (
  -- Allow if not a trade job
  NOT EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_applications.job_id
    AND j.is_tradespeople_job = true
  )
  OR
  -- Or if user is a business account
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.account_type = 'business'
  )
);

-- Policy: Business accounts can post trade jobs
DROP POLICY IF EXISTS "Business accounts can post trade jobs" ON jobs;

CREATE POLICY "Business accounts can post trade jobs"
ON jobs FOR INSERT
WITH CHECK (
  -- Allow regular jobs from anyone who can post
  is_tradespeople_job = false
  OR
  -- Trade jobs only from business accounts
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.account_type = 'business'
  )
);

-- ============================================================================
-- STEP 9: Create mapping table for old flags (backup reference)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_role_flags_backup (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  is_jobseeker BOOLEAN,
  is_tradespeople BOOLEAN,
  is_employer BOOLEAN,
  is_homeowner BOOLEAN,
  user_type VARCHAR(50),
  backed_up_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup current flag values
INSERT INTO user_role_flags_backup (user_id, is_jobseeker, is_tradespeople, is_employer, is_homeowner, user_type)
SELECT id, is_jobseeker, is_tradespeople, is_employer, is_homeowner, user_type
FROM users
ON CONFLICT (user_id) DO UPDATE SET
  is_jobseeker = EXCLUDED.is_jobseeker,
  is_tradespeople = EXCLUDED.is_tradespeople,
  is_employer = EXCLUDED.is_employer,
  is_homeowner = EXCLUDED.is_homeowner,
  user_type = EXCLUDED.user_type,
  backed_up_at = NOW();

-- ============================================================================
-- STEP 10: Add NOT NULL constraint after migration (commented for safety)
-- ============================================================================

-- Uncomment after verifying migration success:
-- ALTER TABLE users ALTER COLUMN account_type SET NOT NULL;
-- ALTER TABLE users ALTER COLUMN account_type SET DEFAULT 'individual';

-- ============================================================================
-- STEP 11: Summary report
-- ============================================================================

DO $$
DECLARE
  v_total_users INTEGER;
  v_individual_count INTEGER;
  v_business_count INTEGER;
  v_prof_profiles INTEGER;
  v_self_employed INTEGER;
  v_migration_fixes INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM users;
  SELECT COUNT(*) INTO v_individual_count FROM users WHERE account_type = 'individual';
  SELECT COUNT(*) INTO v_business_count FROM users WHERE account_type = 'business';
  SELECT COUNT(*) INTO v_prof_profiles FROM professional_profiles;
  SELECT COUNT(*) INTO v_self_employed FROM professional_profiles WHERE is_self_employed = true;
  SELECT COUNT(*) INTO v_migration_fixes FROM account_type_migration_log;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', v_total_users;
  RAISE NOTICE 'Individual accounts: %', v_individual_count;
  RAISE NOTICE 'Business accounts: %', v_business_count;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Professional profiles: %', v_prof_profiles;
  RAISE NOTICE 'Self-employed profiles: %', v_self_employed;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Migration fixes applied: %', v_migration_fixes;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Check for any NULL account_types
-- SELECT COUNT(*) FROM users WHERE account_type IS NULL;

-- Check account type distribution
-- SELECT account_type, COUNT(*) FROM users GROUP BY account_type;

-- Check business users have is_self_employed
-- SELECT u.id, u.account_type, pp.is_self_employed
-- FROM users u
-- LEFT JOIN professional_profiles pp ON u.id = pp.user_id
-- WHERE u.account_type = 'business' AND u.user_type = 'professional'
-- AND (pp.is_self_employed IS NULL OR pp.is_self_employed = false);

-- Check for application violations
-- SELECT * FROM job_application_violations WHERE violation_type != 'ok';

-- View migration log
-- SELECT * FROM account_type_migration_log ORDER BY created_at DESC;
