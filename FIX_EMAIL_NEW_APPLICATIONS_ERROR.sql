-- =============================================================================
-- FIX: Column "email_new_applications" does not exist error
-- =============================================================================
-- This script will help diagnose and fix the database error when submitting
-- job applications. Run this in your Supabase SQL Editor.
-- =============================================================================

-- STEP 1: Check current job_applications table structure
-- ----------------------------------------------------------------------------
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'job_applications'
ORDER BY ordinal_position;

-- STEP 2: Check for triggers on job_applications table
-- ----------------------------------------------------------------------------
-- Triggers often reference columns and might be causing the error
SELECT
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'job_applications'
AND t.tgisinternal = false;

-- STEP 3: Check trigger function definitions
-- ----------------------------------------------------------------------------
-- Look at the actual trigger function code to find email_new_applications
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname LIKE '%application%'
OR p.proname LIKE '%email%'
OR p.proname LIKE '%notify%';

-- STEP 4: Check RLS policies on job_applications
-- ----------------------------------------------------------------------------
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'job_applications';

-- STEP 5: Check notification_preferences table structure
-- ----------------------------------------------------------------------------
-- The error might be from a trigger trying to check user notification preferences
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;


-- =============================================================================
-- SOLUTION 1: If email_new_applications should exist in notification_preferences
-- =============================================================================
-- Uncomment this if you want to ADD the column to notification_preferences table

-- ALTER TABLE notification_preferences
-- ADD COLUMN IF NOT EXISTS email_new_applications BOOLEAN DEFAULT true;

-- UPDATE notification_preferences
-- SET email_new_applications = true
-- WHERE email_new_applications IS NULL;


-- =============================================================================
-- SOLUTION 2: Remove reference to email_new_applications from triggers
-- =============================================================================
-- First, identify which trigger is causing the issue from STEP 2 output
-- Then uncomment and modify the DROP command below:

-- Example: If there's a trigger called "notify_new_application"
-- DROP TRIGGER IF EXISTS notify_new_application ON job_applications;
-- DROP FUNCTION IF EXISTS notify_new_application_fn();


-- =============================================================================
-- SOLUTION 3: Check for materialized views or views that might reference it
-- =============================================================================
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%email_new_applications%'
OR definition LIKE '%job_applications%';


-- =============================================================================
-- FINAL CHECK: Verify the fix worked
-- =============================================================================
-- After applying one of the solutions above, verify by checking:

-- 1. Check notification_preferences has the column (if you added it)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
AND column_name = 'email_new_applications';

-- 2. Test insert into job_applications (replace with actual values)
-- DO $$
-- BEGIN
--   INSERT INTO job_applications (job_id, professional_id, cover_letter, status)
--   VALUES (
--     'test-job-id'::uuid,
--     'test-professional-id'::uuid,
--     'Test cover letter',
--     'pending'
--   );
--   -- Rollback to avoid adding test data
--   RAISE EXCEPTION 'Test successful - rolling back';
-- EXCEPTION
--   WHEN OTHERS THEN
--     RAISE NOTICE 'Error: %', SQLERRM;
-- END $$;
