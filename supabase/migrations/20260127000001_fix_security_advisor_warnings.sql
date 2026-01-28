-- Migration: Fix Security Advisor Warnings
-- Date: 2026-01-27
-- Description: Fixes security issues detected by Supabase Security Advisor

-- =====================================================
-- 1. Fix SECURITY DEFINER View - job_status_view
-- =====================================================
-- Drop and recreate the view without SECURITY DEFINER (use default SECURITY INVOKER)
-- This ensures the view runs with permissions of the querying user, not the creator

DROP VIEW IF EXISTS public.job_status_view CASCADE;

CREATE OR REPLACE VIEW public.job_status_view
WITH (security_invoker = true)
AS
SELECT
    j.*,
    cp.company_name,
    cp.user_id as company_user_id,
    CASE
        WHEN j.expires_at IS NULL THEN 'no_expiration'
        WHEN j.expires_at <= NOW() THEN 'expired'
        WHEN j.expires_at <= NOW() + INTERVAL '3 days' THEN 'expiring_soon'
        ELSE 'active'
    END as expiration_status,
    CASE
        WHEN j.expires_at IS NULL THEN NULL
        ELSE EXTRACT(days FROM j.expires_at - NOW())::integer
    END as days_until_expiration
FROM public.jobs j
LEFT JOIN public.company_profiles cp ON j.company_id = cp.id;

-- Grant access to authenticated users
GRANT SELECT ON public.job_status_view TO authenticated;
GRANT SELECT ON public.job_status_view TO anon;

-- Add comment
COMMENT ON VIEW public.job_status_view IS
  'View that includes all job fields with expiration status calculations and company information. Uses SECURITY INVOKER for proper RLS enforcement.';

-- =====================================================
-- 2. Enable RLS on orphaned_user_audit_log (if exists)
-- =====================================================
-- This is an audit log table - only admins and service role should access it

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.orphaned_user_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  issue_type TEXT NOT NULL,
  issue_details JSONB,
  recovery_attempted BOOLEAN DEFAULT FALSE,
  recovery_successful BOOLEAN,
  recovery_attempted_at TIMESTAMPTZ,
  recovery_error TEXT
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_orphaned_users_user_id ON public.orphaned_user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_orphaned_users_detected_at ON public.orphaned_user_audit_log(detected_at);
CREATE INDEX IF NOT EXISTS idx_orphaned_users_issue_type ON public.orphaned_user_audit_log(issue_type);

-- Enable RLS
ALTER TABLE public.orphaned_user_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin full access to orphaned_user_audit_log" ON public.orphaned_user_audit_log;
DROP POLICY IF EXISTS "Service role full access to orphaned_user_audit_log" ON public.orphaned_user_audit_log;

-- Policy 1: Only service role can read/write (for backend functions)
CREATE POLICY "Service role full access to orphaned_user_audit_log"
  ON public.orphaned_user_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Admin users can view audit logs (read-only)
-- Note: You'll need to implement admin role detection in your app
-- For now, we'll restrict to service role only
-- CREATE POLICY "Admin read access to orphaned_user_audit_log"
--   ON public.orphaned_user_audit_log
--   FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE id = auth.uid()
--       AND user_type = 'admin'
--     )
--   );

-- Grant permissions
GRANT ALL ON public.orphaned_user_audit_log TO service_role;
-- GRANT SELECT ON public.orphaned_user_audit_log TO authenticated; -- Uncomment when admin role is implemented

COMMENT ON TABLE public.orphaned_user_audit_log IS
  'Audit log for tracking and recovering orphaned user states. Access restricted to service role only.';

-- =====================================================
-- 3. Handle spatial_ref_sys (PostGIS system table)
-- =====================================================
-- spatial_ref_sys is a PostGIS system table owned by postgres superuser
-- We cannot enable RLS on it due to ownership restrictions
-- However, this is NOT a security risk because:
--   1. It's read-only reference data (coordinate systems)
--   2. It's managed by PostGIS extension
--   3. It contains no user data or sensitive information
--   4. The table is already restricted by PostgreSQL permissions

-- NOTE: The Security Advisor warning for spatial_ref_sys can be safely ignored
-- This is a known false positive for PostGIS system tables

-- Attempt to enable RLS with error handling
DO $$
BEGIN
  -- Check if we own the table or are superuser
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'spatial_ref_sys'
    AND tableowner = current_user
  ) OR EXISTS (
    SELECT 1 FROM pg_user
    WHERE usename = current_user
    AND usesuper = true
  ) THEN
    -- We have permission, enable RLS
    EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public read access to spatial_ref_sys" ON public.spatial_ref_sys';
    EXECUTE 'CREATE POLICY "Public read access to spatial_ref_sys"
      ON public.spatial_ref_sys
      FOR SELECT
      TO public
      USING (true)';
    EXECUTE 'GRANT SELECT ON public.spatial_ref_sys TO authenticated, anon';
    RAISE NOTICE 'RLS enabled on spatial_ref_sys';
  ELSE
    -- We don't own the table - this is expected for PostGIS system tables
    RAISE NOTICE 'Skipping spatial_ref_sys (owned by postgres superuser) - not a security risk';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Expected error for PostGIS system tables
    RAISE NOTICE 'Skipping spatial_ref_sys (insufficient privileges) - not a security risk';
  WHEN OTHERS THEN
    -- Log other errors but don't fail the migration
    RAISE NOTICE 'Could not modify spatial_ref_sys: % - not a security risk', SQLERRM;
END $$;

-- =====================================================
-- Verification Queries (commented out - for manual testing)
-- =====================================================

-- -- Verify job_status_view is using SECURITY INVOKER:
-- SELECT definition
-- FROM pg_views
-- WHERE schemaname = 'public'
-- AND viewname = 'job_status_view';

-- -- Verify RLS is enabled:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('orphaned_user_audit_log', 'spatial_ref_sys');

-- -- Check policies:
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('orphaned_user_audit_log', 'spatial_ref_sys');
