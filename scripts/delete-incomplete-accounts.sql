-- ===================================================================
-- DELETE INCOMPLETE/CORRUPTED ACCOUNTS
-- ===================================================================
-- This script deletes all incomplete or corrupted user accounts
-- Run this in Supabase SQL Editor
--
-- IMPORTANT: Review the SELECT queries first before running DELETE commands!
-- ===================================================================

BEGIN;

-- ===================================================================
-- STEP 1: IDENTIFY INCOMPLETE ACCOUNTS (Review these first!)
-- ===================================================================

-- 1.1 Incomplete professional accounts
SELECT
  'INCOMPLETE PROFESSIONAL' as type,
  u.id,
  u.email,
  u.created_at,
  pp.first_name,
  pp.last_name,
  pp.title
FROM users u
LEFT JOIN professional_profiles pp ON u.id = pp.user_id
WHERE u.user_type = 'professional'
  AND (
    pp.id IS NULL
    OR pp.first_name IS NULL
    OR pp.first_name = ''
    OR pp.last_name IS NULL
    OR pp.last_name = ''
    OR pp.title IS NULL
    OR pp.title = ''
  )
ORDER BY u.created_at DESC;

-- 1.2 Incomplete company accounts
SELECT
  'INCOMPLETE COMPANY' as type,
  u.id,
  u.email,
  u.created_at,
  cp.company_name,
  cp.industry,
  cp.location
FROM users u
LEFT JOIN company_profiles cp ON u.id = cp.user_id
WHERE u.user_type = 'company'
  AND (
    cp.id IS NULL
    OR cp.company_name IS NULL
    OR cp.company_name = ''
    OR cp.industry IS NULL
    OR cp.industry = ''
  )
ORDER BY u.created_at DESC;

-- 1.3 Incomplete homeowner accounts
SELECT
  'INCOMPLETE HOMEOWNER' as type,
  u.id,
  u.email,
  u.created_at,
  hp.first_name,
  hp.last_name
FROM users u
LEFT JOIN homeowner_profiles hp ON u.id = hp.user_id
WHERE u.user_type = 'homeowner'
  AND (
    hp.id IS NULL
    OR hp.first_name IS NULL
    OR hp.first_name = ''
    OR hp.last_name IS NULL
    OR hp.last_name = ''
  )
ORDER BY u.created_at DESC;

-- 1.4 Orphaned users (no user_type or no account_type)
SELECT
  'ORPHANED USER' as type,
  u.id,
  u.email,
  u.user_type,
  u.account_type,
  u.created_at
FROM users u
WHERE u.user_type IS NULL
   OR u.account_type IS NULL
ORDER BY u.created_at DESC;

-- 1.5 Users with profiles but missing critical fields
SELECT
  'INCOMPLETE DATA' as type,
  u.id,
  u.email,
  u.user_type,
  u.created_at
FROM users u
WHERE u.email IS NULL
   OR u.email = ''
ORDER BY u.created_at DESC;

-- ===================================================================
-- STEP 2: COUNT TOTAL ACCOUNTS TO BE DELETED
-- ===================================================================

SELECT
  COUNT(DISTINCT u.id) as total_accounts_to_delete,
  COUNT(DISTINCT CASE WHEN u.user_type = 'professional' THEN u.id END) as professional_accounts,
  COUNT(DISTINCT CASE WHEN u.user_type = 'company' THEN u.id END) as company_accounts,
  COUNT(DISTINCT CASE WHEN u.user_type = 'homeowner' THEN u.id END) as homeowner_accounts,
  COUNT(DISTINCT CASE WHEN u.user_type IS NULL THEN u.id END) as orphaned_accounts
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
  OR u.email = '';

ROLLBACK;

-- ===================================================================
-- STEP 3: DELETE INCOMPLETE ACCOUNTS
-- ===================================================================
-- If the above queries look correct, uncomment and run the following:
-- ===================================================================

/*
BEGIN;

-- Store user IDs to delete for later auth cleanup
CREATE TEMP TABLE users_to_delete AS
SELECT DISTINCT u.id, u.email
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
  OR u.email = '';

-- Delete related data first (to avoid foreign key issues)

-- Delete any job applications
DELETE FROM job_applications
WHERE professional_id IN (
  SELECT pp.id FROM professional_profiles pp
  WHERE pp.user_id IN (SELECT id FROM users_to_delete)
)
OR company_id IN (
  SELECT cp.id FROM company_profiles cp
  WHERE cp.user_id IN (SELECT id FROM users_to_delete)
);

-- Delete any saved jobs
DELETE FROM saved_jobs
WHERE professional_id IN (
  SELECT pp.id FROM professional_profiles pp
  WHERE pp.user_id IN (SELECT id FROM users_to_delete)
);

-- Delete any jobs posted
DELETE FROM jobs
WHERE company_id IN (
  SELECT cp.id FROM company_profiles cp
  WHERE cp.user_id IN (SELECT id FROM users_to_delete)
)
OR homeowner_id IN (
  SELECT hp.id FROM homeowner_profiles hp
  WHERE hp.user_id IN (SELECT id FROM users_to_delete)
);

-- Delete any CVs
DELETE FROM professional_cvs
WHERE professional_id IN (
  SELECT pp.id FROM professional_profiles pp
  WHERE pp.user_id IN (SELECT id FROM users_to_delete)
);

-- Delete any reviews (given or received)
DELETE FROM reviews
WHERE reviewer_id IN (SELECT id FROM users_to_delete)
   OR reviewee_id IN (SELECT id FROM users_to_delete);

-- Delete any messages
DELETE FROM messages
WHERE sender_id IN (SELECT id FROM users_to_delete)
   OR recipient_id IN (SELECT id FROM users_to_delete);

-- Delete profiles
DELETE FROM professional_profiles
WHERE user_id IN (SELECT id FROM users_to_delete);

DELETE FROM company_profiles
WHERE user_id IN (SELECT id FROM users_to_delete);

DELETE FROM homeowner_profiles
WHERE user_id IN (SELECT id FROM users_to_delete);

DELETE FROM contractor_profiles
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete from users table
DELETE FROM users
WHERE id IN (SELECT id FROM users_to_delete);

-- Show what was deleted
SELECT
  'DELETION SUMMARY' as status,
  COUNT(*) as total_deleted
FROM users_to_delete;

-- Display user IDs and emails for auth cleanup
SELECT
  'AUTH CLEANUP REQUIRED' as status,
  id,
  email
FROM users_to_delete
ORDER BY email;

COMMIT;

-- ===================================================================
-- STEP 4: DELETE FROM AUTH.USERS (Run separately if you have access)
-- ===================================================================
-- Copy the user IDs from above and delete them from Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Search for each email and delete manually
--
-- OR if you have direct access to auth schema, run:
--
-- DELETE FROM auth.users
-- WHERE id IN (
--   SELECT id FROM users_to_delete
-- );
--
-- Note: The temp table users_to_delete will be dropped after the session
-- ===================================================================
*/
