-- ============================================================================
-- Verification: Account Type Migration
-- Run this after applying the migration to verify data integrity
-- ============================================================================

-- 1. Check account type distribution
SELECT '=== ACCOUNT TYPE DISTRIBUTION ===' as info;

SELECT
  account_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM users
GROUP BY account_type
ORDER BY count DESC;

-- 2. Check for NULL account types (should be 0)
SELECT '=== NULL ACCOUNT TYPES (should be 0) ===' as info;

SELECT COUNT(*) as null_account_types
FROM users
WHERE account_type IS NULL;

-- 3. Cross-reference with user_type
SELECT '=== ACCOUNT TYPE BY USER TYPE ===' as info;

SELECT
  user_type,
  account_type,
  COUNT(*) as count
FROM users
GROUP BY user_type, account_type
ORDER BY user_type, account_type;

-- 4. Verify business accounts have is_self_employed or are companies
SELECT '=== BUSINESS ACCOUNT VERIFICATION ===' as info;

SELECT
  'business_with_self_employed' as check_type,
  COUNT(*) as count
FROM users u
JOIN professional_profiles pp ON u.id = pp.user_id
WHERE u.account_type = 'business'
  AND pp.is_self_employed = true

UNION ALL

SELECT
  'business_companies' as check_type,
  COUNT(*) as count
FROM users
WHERE account_type = 'business'
  AND user_type = 'company'

UNION ALL

SELECT
  'business_contractors' as check_type,
  COUNT(*) as count
FROM users
WHERE account_type = 'business'
  AND user_type = 'contractor';

-- 5. Check individual accounts have professional_profiles
SELECT '=== INDIVIDUAL PROFESSIONAL PROFILES ===' as info;

SELECT
  'individuals_with_profiles' as check_type,
  COUNT(*) as count
FROM users u
WHERE u.account_type = 'individual'
  AND u.user_type = 'professional'
  AND EXISTS (
    SELECT 1 FROM professional_profiles pp WHERE pp.user_id = u.id
  )

UNION ALL

SELECT
  'individuals_missing_profiles' as check_type,
  COUNT(*) as count
FROM users u
WHERE u.account_type = 'individual'
  AND u.user_type = 'professional'
  AND NOT EXISTS (
    SELECT 1 FROM professional_profiles pp WHERE pp.user_id = u.id
  );

-- 6. Check job application violations
SELECT '=== JOB APPLICATION VIOLATIONS ===' as info;

SELECT
  'individual_on_trade_job' as violation_type,
  COUNT(*) as count
FROM job_applications ja
JOIN users u ON ja.applicant_id = u.id
JOIN jobs j ON ja.job_id = j.id
WHERE u.account_type = 'individual'
  AND j.is_tradespeople_job = true;

-- 7. Sample of each account type
SELECT '=== SAMPLE INDIVIDUAL ACCOUNTS ===' as info;

SELECT
  id,
  email,
  user_type,
  account_type,
  is_jobseeker,
  is_tradespeople
FROM users
WHERE account_type = 'individual'
LIMIT 5;

SELECT '=== SAMPLE BUSINESS ACCOUNTS ===' as info;

SELECT
  id,
  email,
  user_type,
  account_type,
  is_jobseeker,
  is_tradespeople
FROM users
WHERE account_type = 'business'
LIMIT 5;

-- 8. Migration log summary
SELECT '=== MIGRATION LOG SUMMARY ===' as info;

SELECT
  fix_type,
  COUNT(*) as count
FROM account_type_migration_log
GROUP BY fix_type
ORDER BY count DESC;

-- 9. Old flags still in use (for deprecation planning)
SELECT '=== OLD FLAGS USAGE ===' as info;

SELECT
  'is_jobseeker_true' as flag,
  COUNT(*) as count
FROM users WHERE is_jobseeker = true

UNION ALL

SELECT
  'is_tradespeople_true' as flag,
  COUNT(*) as count
FROM users WHERE is_tradespeople = true

UNION ALL

SELECT
  'is_employer_true' as flag,
  COUNT(*) as count
FROM users WHERE is_employer = true

UNION ALL

SELECT
  'is_homeowner_true' as flag,
  COUNT(*) as count
FROM users WHERE is_homeowner = true;

-- 10. Final summary
SELECT '=== MIGRATION HEALTH CHECK ===' as info;

SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM users WHERE account_type IS NULL) = 0
    THEN '✅ All users have account_type assigned'
    ELSE '❌ Some users missing account_type'
  END as null_check,

  CASE
    WHEN (SELECT COUNT(*) FROM users u
          WHERE u.account_type = 'individual'
          AND u.user_type = 'professional'
          AND NOT EXISTS (SELECT 1 FROM professional_profiles pp WHERE pp.user_id = u.id)) = 0
    THEN '✅ All individual professionals have profiles'
    ELSE '❌ Some individual professionals missing profiles'
  END as profile_check,

  CASE
    WHEN (SELECT COUNT(*) FROM users u
          JOIN professional_profiles pp ON u.id = pp.user_id
          WHERE u.account_type = 'business'
          AND (pp.is_self_employed IS NULL OR pp.is_self_employed = false)) = 0
    THEN '✅ All business accounts have is_self_employed = true'
    ELSE '❌ Some business accounts have is_self_employed issues'
  END as self_employed_check;
