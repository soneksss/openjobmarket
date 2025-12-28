-- ===================================================================
-- PREVIEW INCOMPLETE ACCOUNTS (Safe - No Deletions)
-- ===================================================================
-- This script only SHOWS what would be deleted
-- Run this first to verify before executing the cleanup
-- ===================================================================

-- All incomplete accounts in one view
SELECT
  CASE
    WHEN u.user_type = 'professional' THEN 'INCOMPLETE PROFESSIONAL'
    WHEN u.user_type = 'company' THEN 'INCOMPLETE COMPANY'
    WHEN u.user_type = 'homeowner' THEN 'INCOMPLETE HOMEOWNER'
    WHEN u.user_type IS NULL THEN 'ORPHANED (NO USER_TYPE)'
    ELSE 'OTHER ISSUE'
  END as issue_type,
  u.id,
  u.email,
  u.user_type,
  u.account_type,
  u.created_at,
  -- Professional fields
  pp.first_name as prof_first_name,
  pp.last_name as prof_last_name,
  pp.title as prof_title,
  -- Company fields
  cp.company_name,
  cp.industry,
  -- Homeowner fields
  hp.first_name as home_first_name,
  hp.last_name as home_last_name
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id AND u.user_type = 'professional'
LEFT JOIN company_profiles cp ON u.id = cp.user_id AND u.user_type = 'company'
LEFT JOIN homeowner_profiles hp ON u.id = hp.user_id AND u.user_type = 'homeowner'
WHERE
  -- Incomplete professionals
  (u.user_type = 'professional' AND (
    pp.id IS NULL
    OR pp.first_name IS NULL OR pp.first_name = ''
    OR pp.last_name IS NULL OR pp.last_name = ''
    OR pp.title IS NULL OR pp.title = ''
  ))
  OR
  -- Incomplete companies
  (u.user_type = 'company' AND (
    cp.id IS NULL
    OR cp.company_name IS NULL OR cp.company_name = ''
    OR cp.industry IS NULL OR cp.industry = ''
  ))
  OR
  -- Incomplete homeowners
  (u.user_type = 'homeowner' AND (
    hp.id IS NULL
    OR hp.first_name IS NULL OR hp.first_name = ''
    OR hp.last_name IS NULL OR hp.last_name = ''
  ))
  OR
  -- Orphaned users
  u.user_type IS NULL
  OR u.account_type IS NULL
  OR u.email IS NULL
  OR u.email = ''
ORDER BY u.created_at DESC;

-- Summary count
SELECT
  'SUMMARY' as report,
  COUNT(DISTINCT u.id) as total_to_delete,
  COUNT(DISTINCT CASE WHEN u.user_type = 'professional' THEN u.id END) as professionals,
  COUNT(DISTINCT CASE WHEN u.user_type = 'company' THEN u.id END) as companies,
  COUNT(DISTINCT CASE WHEN u.user_type = 'homeowner' THEN u.id END) as homeowners,
  COUNT(DISTINCT CASE WHEN u.user_type IS NULL THEN u.id END) as orphaned
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id AND u.user_type = 'professional'
LEFT JOIN company_profiles cp ON u.id = cp.user_id AND u.user_type = 'company'
LEFT JOIN homeowner_profiles hp ON u.id = pp.user_id AND u.user_type = 'homeowner'
WHERE
  (u.user_type = 'professional' AND (
    pp.id IS NULL
    OR pp.first_name IS NULL OR pp.first_name = ''
    OR pp.last_name IS NULL OR pp.last_name = ''
    OR pp.title IS NULL OR pp.title = ''
  ))
  OR
  (u.user_type = 'company' AND (
    cp.id IS NULL
    OR cp.company_name IS NULL OR cp.company_name = ''
    OR cp.industry IS NULL OR cp.industry = ''
  ))
  OR
  (u.user_type = 'homeowner' AND (
    hp.id IS NULL
    OR hp.first_name IS NULL OR hp.first_name = ''
    OR hp.last_name IS NULL OR hp.last_name = ''
  ))
  OR
  u.user_type IS NULL
  OR u.account_type IS NULL
  OR u.email IS NULL
  OR u.email = '';

-- ===================================================================
-- NEXT STEPS:
-- ===================================================================
-- If the accounts shown above look correct to delete, run:
--   execute-cleanup-now.sql
-- ===================================================================
