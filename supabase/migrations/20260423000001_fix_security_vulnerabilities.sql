-- Fix security vulnerabilities flagged by Supabase Security Advisor
-- 1. Enable RLS on internal migration/audit tables
-- 2. Lock down views with security_invoker to respect RLS
-- 3. Restrict sensitive internal views to service_role only

-- ============================================================
-- PART 1: Enable RLS on migration audit tables
-- These were diagnostic tables created during migrations and
-- accidentally left open to the public API.
-- ============================================================

ALTER TABLE IF EXISTS public.account_type_migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_role_flags_backup      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_migration_2role_backup ENABLE ROW LEVEL SECURITY;

-- No public access — these are internal audit tables.
-- Only service_role (used by server-side admin code) can read them.
DROP POLICY IF EXISTS "admin_only_account_type_migration_log" ON public.account_type_migration_log;
CREATE POLICY "admin_only_account_type_migration_log"
  ON public.account_type_migration_log
  FOR ALL
  USING (false);  -- blocks anon + authenticated; service_role bypasses RLS entirely

DROP POLICY IF EXISTS "admin_only_user_role_flags_backup" ON public.user_role_flags_backup;
CREATE POLICY "admin_only_user_role_flags_backup"
  ON public.user_role_flags_backup
  FOR ALL
  USING (false);

DROP POLICY IF EXISTS "admin_only_role_migration_2role_backup" ON public.role_migration_2role_backup;
CREATE POLICY "admin_only_role_migration_2role_backup"
  ON public.role_migration_2role_backup
  FOR ALL
  USING (false);

-- ============================================================
-- PART 2: Fix views — add security_invoker so they respect RLS
-- Without security_invoker, views run as the definer (postgres)
-- and can bypass row-level security on underlying tables.
-- ============================================================

-- reviews_with_details: drop and recreate with security_invoker
DROP VIEW IF EXISTS public.reviews_with_details;
CREATE VIEW public.reviews_with_details
  WITH (security_invoker = true)
AS
SELECT
    r.*,
    CASE r.reviewer_type
        WHEN 'homeowner' THEN h.first_name || ' ' || h.last_name
        WHEN 'company'   THEN c.company_name
    END AS reviewer_name,
    CASE r.reviewed_type
        WHEN 'homeowner' THEN h2.first_name || ' ' || h2.last_name
        WHEN 'company'   THEN c2.company_name
    END AS reviewed_name,
    j.title AS job_title
FROM reviews r
LEFT JOIN jobs j             ON r.job_id     = j.id
LEFT JOIN homeowner_profiles h  ON r.reviewer_id = h.user_id  AND r.reviewer_type = 'homeowner'
LEFT JOIN company_profiles   c  ON r.reviewer_id = c.user_id  AND r.reviewer_type = 'company'
LEFT JOIN homeowner_profiles h2 ON r.reviewed_id = h2.user_id AND r.reviewed_type = 'homeowner'
LEFT JOIN company_profiles   c2 ON r.reviewed_id = c2.user_id AND r.reviewed_type = 'company';

-- ============================================================
-- PART 3: Drop internal diagnostic views from public schema
-- job_application_violations and job_posting_violations were
-- created only to log migration data — they are not used by
-- the app and expose internal user/job relationships publicly.
-- ============================================================

DROP VIEW IF EXISTS public.job_application_violations;
DROP VIEW IF EXISTS public.job_posting_violations;

-- ============================================================
-- PART 4: Revoke public API access to remaining sensitive views
-- Prevent anon and authenticated roles from querying internal
-- audit tables through the PostgREST API.
-- ============================================================

REVOKE ALL ON public.account_type_migration_log FROM anon, authenticated;
REVOKE ALL ON public.user_role_flags_backup      FROM anon, authenticated;
REVOKE ALL ON public.role_migration_2role_backup FROM anon, authenticated;
