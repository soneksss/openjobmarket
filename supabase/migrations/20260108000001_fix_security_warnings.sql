-- Migration: Fix Supabase Security Warnings
-- Date: 2026-01-08
-- Description: Enable RLS on public tables and fix SECURITY DEFINER views

-- ============================================================================
-- PART 1: ENABLE RLS ON PUBLIC TABLES
-- ============================================================================

-- 1. blocked_users table
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own blocks
CREATE POLICY "Users manage own blocks" ON public.blocked_users
FOR ALL
USING (blocker_id = auth.uid())
WITH CHECK (blocker_id = auth.uid());

-- Policy: Users can see blocks where they are blocked (to respect blocking)
CREATE POLICY "Users can see where they are blocked" ON public.blocked_users
FOR SELECT
USING (blocked_id = auth.uid());

-- 2. conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can access conversations they are part of
CREATE POLICY "Users access own conversations" ON public.conversations
FOR ALL
USING (
  participant_1 = auth.uid() OR participant_2 = auth.uid()
)
WITH CHECK (
  participant_1 = auth.uid() OR participant_2 = auth.uid()
);

-- 3. notification_history table
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notification history
CREATE POLICY "Users view own notification history" ON public.notification_history
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Service role can insert (for system notifications)
CREATE POLICY "Service role inserts notifications" ON public.notification_history
FOR INSERT
WITH CHECK (true);

-- 4. notification_queue table
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Policy: No client access - service role only
-- This table should only be accessed by background workers/service role
CREATE POLICY "Service role only access" ON public.notification_queue
FOR ALL
USING (false)
WITH CHECK (false);

-- Grant service role access (bypasses RLS)
-- Service role will still have full access via service_role key

-- ============================================================================
-- PART 2: FIX SECURITY DEFINER VIEWS
-- ============================================================================

-- 1. active_homeowner_jobs view
DROP VIEW IF EXISTS public.active_homeowner_jobs CASCADE;
CREATE VIEW public.active_homeowner_jobs
WITH (security_invoker=true)
AS
SELECT
  j.*,
  hp.first_name,
  hp.last_name,
  hp.phone,
  hp.location as homeowner_location
FROM homeowner_jobs j
INNER JOIN homeowner_profiles hp ON j.homeowner_id = hp.id
WHERE j.status = 'active';

COMMENT ON VIEW public.active_homeowner_jobs IS
  'Active homeowner jobs with profile info. Uses SECURITY INVOKER to respect RLS. Note: hp.location aliased as homeowner_location to avoid conflict with j.location.';

-- 2. company_analytics view
DROP VIEW IF EXISTS public.company_analytics CASCADE;
CREATE VIEW public.company_analytics
WITH (security_invoker=true)
AS
SELECT
  cp.id as company_id,
  cp.company_name,
  COUNT(DISTINCT j.id) as total_jobs,
  COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_jobs,
  COUNT(DISTINCT ja.id) as total_applications,
  COUNT(DISTINCT CASE WHEN ja.status = 'accepted' THEN ja.id END) as accepted_applications
FROM company_profiles cp
LEFT JOIN jobs j ON cp.id = j.company_id
LEFT JOIN job_applications ja ON j.id = ja.job_id
GROUP BY cp.id, cp.company_name;

COMMENT ON VIEW public.company_analytics IS
  'Company analytics aggregated data. Uses SECURITY INVOKER to respect RLS.';

-- 3. job_applications_with_applicants view
DROP VIEW IF EXISTS public.job_applications_with_applicants CASCADE;
CREATE VIEW public.job_applications_with_applicants
WITH (security_invoker=true)
AS
SELECT
  ja.*,
  pp.first_name,
  pp.last_name,
  pp.title,
  pp.skills,
  pp.experience_level,
  j.title as job_title,
  j.company_id as job_company_id
FROM job_applications ja
INNER JOIN professional_profiles pp ON ja.professional_id = pp.id
INNER JOIN jobs j ON ja.job_id = j.id;

COMMENT ON VIEW public.job_applications_with_applicants IS
  'Job applications with applicant details. Uses SECURITY INVOKER to respect RLS. Note: j.company_id aliased as job_company_id to avoid conflict.';

-- 4. job_status_view view
DROP VIEW IF EXISTS public.job_status_view CASCADE;
CREATE VIEW public.job_status_view
WITH (security_invoker=true)
AS
SELECT
  id,
  title,
  status,
  created_at,
  expires_at,
  CASE
    WHEN expires_at < NOW() THEN 'expired'
    WHEN status = 'active' THEN 'active'
    ELSE status
  END as computed_status
FROM jobs;

COMMENT ON VIEW public.job_status_view IS
  'Job status with computed expiration. Uses SECURITY INVOKER to respect RLS.';

-- 5. reviews_with_details view
DROP VIEW IF EXISTS public.reviews_with_details CASCADE;
CREATE VIEW public.reviews_with_details
WITH (security_invoker=true)
AS
SELECT
  r.*,
  reviewer.first_name as reviewer_first_name,
  reviewer.last_name as reviewer_last_name,
  reviewee.first_name as reviewee_first_name,
  reviewee.last_name as reviewee_last_name
FROM reviews r
LEFT JOIN professional_profiles reviewer ON r.reviewer_id = reviewer.id
LEFT JOIN professional_profiles reviewee ON r.reviewee_id = reviewee.id;

COMMENT ON VIEW public.reviews_with_details IS
  'Reviews with reviewer/reviewee details. Uses SECURITY INVOKER to respect RLS.';

-- ============================================================================
-- PART 3: HANDLE SPATIAL_REF_SYS (PostGIS System Table)
-- ============================================================================

-- Note: spatial_ref_sys is a PostGIS system table that we don't have ownership of.
-- It's managed by Supabase and doesn't pose a security risk (it's just coordinate system reference data).
-- The security warning about this table can be safely ignored or hidden via Supabase dashboard settings.
--
-- If you need to hide it from PostgREST API exposure, do this via Supabase Dashboard:
-- 1. Go to API Settings
-- 2. Add 'spatial_ref_sys' to the excluded schemas/tables list

-- ============================================================================
-- PART 4: VERIFICATION COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users manage own blocks" ON public.blocked_users IS
  'RLS: Users can only create, read, update, delete their own blocks.';

COMMENT ON POLICY "Users access own conversations" ON public.conversations IS
  'RLS: Users can only access conversations they are a participant in.';

COMMENT ON POLICY "Users view own notification history" ON public.notification_history IS
  'RLS: Users can only view their own notification history.';

COMMENT ON POLICY "Service role only access" ON public.notification_queue IS
  'RLS: notification_queue is for background workers only. Client access denied.';
