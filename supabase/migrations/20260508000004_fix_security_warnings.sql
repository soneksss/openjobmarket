-- ============================================================
-- Fix Supabase Security Advisor Warnings
-- ============================================================

-- ── 1. Enable RLS on user_push_tokens ────────────────────────
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens (needed for client-side token refresh checks)
CREATE POLICY "users_view_own_push_tokens"
  ON public.user_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_push_tokens"
  ON public.user_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_push_tokens"
  ON public.user_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Server (service_role) bypasses RLS automatically — no policy needed for it.

-- Revoke direct SELECT from authenticated so clients cannot enumerate tokens
-- for other users even if they bypass the view layer. Service_role is unaffected.
REVOKE SELECT ON public.user_push_tokens FROM authenticated;

-- ── 2. spatial_ref_sys — remove public API exposure ──────────
-- This table is owned by PostGIS and must not be accessible via the REST API.
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated;

-- ── 3. Recreate views with security_invoker = true ───────────
-- Without this option PostgreSQL views run as the owner (SECURITY DEFINER),
-- bypassing RLS on the underlying tables.  security_invoker = true makes them
-- run as the calling user so that underlying RLS policies are respected.

-- 3a. user_push_targets
-- Original joined auth.users (unnecessary — user_id is already in the tokens
-- table). Removing that join also stops the view from exposing auth schema data.
DROP VIEW IF EXISTS public.user_push_targets;
CREATE OR REPLACE VIEW public.user_push_targets
  WITH (security_invoker = true)
AS
SELECT user_id, token, device_type
FROM   public.user_push_tokens;

-- Only server (service_role) should read push tokens.
GRANT SELECT ON public.user_push_targets TO service_role;

-- 3b. user_presence
CREATE OR REPLACE VIEW public.user_presence
  WITH (security_invoker = true)
AS
SELECT
  id,
  last_seen_at,
  CASE
    WHEN last_seen_at IS NULL                         THEN 'offline'
    WHEN last_seen_at > NOW() - INTERVAL '2 minutes'  THEN 'online'
    WHEN last_seen_at > NOW() - INTERVAL '10 minutes' THEN 'away'
    ELSE 'offline'
  END AS presence_status,
  CASE
    WHEN last_seen_at IS NULL THEN NULL
    ELSE ROUND(EXTRACT(EPOCH FROM (NOW() - last_seen_at)) / 60.0, 1)
  END AS minutes_ago
FROM public.users;

GRANT SELECT ON public.user_presence TO authenticated;

-- 3c. job_response_counts
CREATE OR REPLACE VIEW public.job_response_counts
  WITH (security_invoker = true)
AS
SELECT   job_id, COUNT(*) AS responses
FROM     public.urgent_job_dispatch_alerts
WHERE    responded = true
GROUP BY job_id;

GRANT SELECT ON public.job_response_counts TO service_role;
GRANT SELECT ON public.job_response_counts TO authenticated;

-- 3d. job_status_view
DROP VIEW IF EXISTS public.job_status_view CASCADE;
CREATE OR REPLACE VIEW public.job_status_view
  WITH (security_invoker = true)
AS
SELECT
  j.*,
  cp.company_name,
  cp.user_id AS company_user_id,
  CASE
    WHEN j.expires_at IS NULL              THEN 'no_expiration'
    WHEN j.expires_at <= NOW()             THEN 'expired'
    WHEN j.expires_at <= NOW() + INTERVAL '3 days' THEN 'expiring_soon'
    ELSE 'active'
  END AS expiration_status,
  CASE
    WHEN j.expires_at IS NULL THEN NULL
    ELSE EXTRACT(days FROM j.expires_at - NOW())::integer
  END AS days_until_expiration
FROM      public.jobs j
LEFT JOIN public.company_profiles cp ON j.company_id = cp.id;

GRANT SELECT ON public.job_status_view TO authenticated;
GRANT SELECT ON public.job_status_view TO anon;
