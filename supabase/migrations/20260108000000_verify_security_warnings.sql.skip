-- Verification: Check which tables and views exist before fixing security warnings
-- Date: 2026-01-08
-- Description: Run this FIRST to see what exists in your database

-- ============================================================================
-- CHECK TABLES
-- ============================================================================

SELECT 'TABLE CHECK' as check_type;

-- Check if tables exist
SELECT
  tablename,
  CASE WHEN rowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED ⚠️' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'blocked_users',
  'conversations',
  'notification_history',
  'notification_queue',
  'spatial_ref_sys'
)
ORDER BY tablename;

-- ============================================================================
-- CHECK VIEWS
-- ============================================================================

SELECT 'VIEW CHECK' as check_type;

-- Check if views exist and their security setting
SELECT
  viewname,
  CASE
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER ⚠️'
    WHEN definition LIKE '%security_invoker%' THEN 'SECURITY INVOKER ✓'
    ELSE 'DEFAULT (INVOKER) ✓'
  END as security_type
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN (
  'active_homeowner_jobs',
  'company_analytics',
  'job_applications_with_applicants',
  'job_status_view',
  'reviews_with_details'
)
ORDER BY viewname;

-- ============================================================================
-- CHECK POLICIES
-- ============================================================================

SELECT 'POLICY CHECK' as check_type;

-- Check existing RLS policies on the tables
SELECT
  tablename,
  policyname,
  cmd as command,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'blocked_users',
  'conversations',
  'notification_history',
  'notification_queue'
)
ORDER BY tablename, policyname;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 'SUMMARY' as check_type;

SELECT
  COUNT(*) FILTER (WHERE rowsecurity = false) as tables_without_rls,
  COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'blocked_users',
  'conversations',
  'notification_history',
  'notification_queue'
);
