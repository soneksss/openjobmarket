-- Update the job_status_view to ensure all job fields are included
-- This view is used by the company dashboard to display jobs with expiration status

DROP VIEW IF EXISTS public.job_status_view CASCADE;

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

-- Verify the view includes is_tradespeople_job field
-- You can run this query to check:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'job_status_view'
-- AND column_name = 'is_tradespeople_job';
