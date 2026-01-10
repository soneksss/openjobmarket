-- Migration: Recreate job_status_view with all columns
-- Date: 2026-01-10
-- Description: Ensures job_status_view includes company_id and all job fields

-- Drop existing view
DROP VIEW IF EXISTS public.job_status_view CASCADE;

-- Recreate view with all job fields including company_id
CREATE OR REPLACE VIEW public.job_status_view AS
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
  'View that includes all job fields with expiration status calculations and company information';
