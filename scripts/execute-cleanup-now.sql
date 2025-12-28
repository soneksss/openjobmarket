-- ===================================================================
-- EXECUTE CLEANUP - DELETE ALL INCOMPLETE ACCOUNTS
-- ===================================================================
-- This script will DELETE all incomplete/corrupted accounts immediately
-- Make sure you want to do this before running!
-- ===================================================================

BEGIN;

-- Create temp table with all user IDs to delete
CREATE TEMP TABLE users_to_delete AS
SELECT DISTINCT u.id, u.email, u.user_type, u.created_at
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

-- Show what will be deleted
SELECT 'WILL DELETE:' as status, COUNT(*) as total_accounts FROM users_to_delete;
SELECT * FROM users_to_delete ORDER BY created_at DESC;

-- Delete related data first (to avoid foreign key issues)

-- Delete job applications
DELETE FROM job_applications
WHERE professional_id IN (
  SELECT pp.id FROM professional_profiles pp
  WHERE pp.user_id IN (SELECT id FROM users_to_delete)
)
OR company_id IN (
  SELECT cp.id FROM company_profiles cp
  WHERE cp.user_id IN (SELECT id FROM users_to_delete)
);

-- Delete saved jobs
DELETE FROM saved_jobs
WHERE professional_id IN (
  SELECT pp.id FROM professional_profiles pp
  WHERE pp.user_id IN (SELECT id FROM users_to_delete)
);

-- Delete jobs posted
DELETE FROM jobs
WHERE company_id IN (
  SELECT cp.id FROM company_profiles cp
  WHERE cp.user_id IN (SELECT id FROM users_to_delete)
)
OR homeowner_id IN (
  SELECT hp.id FROM homeowner_profiles hp
  WHERE hp.user_id IN (SELECT id FROM users_to_delete)
);

-- Delete CVs
DELETE FROM professional_cvs
WHERE professional_id IN (
  SELECT pp.id FROM professional_profiles pp
  WHERE pp.user_id IN (SELECT id FROM users_to_delete)
);

-- Delete reviews
DELETE FROM reviews
WHERE reviewer_id IN (SELECT id FROM users_to_delete)
   OR reviewee_id IN (SELECT id FROM users_to_delete);

-- Delete messages
DELETE FROM messages
WHERE sender_id IN (SELECT id FROM users_to_delete)
   OR recipient_id IN (SELECT id FROM users_to_delete);

-- Delete notification preferences
DELETE FROM notification_preferences
WHERE user_id IN (SELECT id FROM users_to_delete);

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

-- Summary
SELECT
  'DELETED SUCCESSFULLY' as status,
  COUNT(*) as total_deleted,
  COUNT(CASE WHEN user_type = 'professional' THEN 1 END) as professionals,
  COUNT(CASE WHEN user_type = 'company' THEN 1 END) as companies,
  COUNT(CASE WHEN user_type = 'homeowner' THEN 1 END) as homeowners,
  COUNT(CASE WHEN user_type IS NULL THEN 1 END) as orphaned
FROM users_to_delete;

-- List emails for auth cleanup
SELECT
  'CLEANUP AUTH.USERS FOR THESE EMAILS:' as instruction,
  email
FROM users_to_delete
ORDER BY email;

COMMIT;

-- ===================================================================
-- MANUAL AUTH CLEANUP REQUIRED:
-- ===================================================================
-- Go to Supabase Dashboard > Authentication > Users
-- Delete the users shown above by searching for their email addresses
-- ===================================================================
