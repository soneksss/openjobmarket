-- Fix get_my_jobs_badge_count: show number of ACTIVE jobs, not "unviewed" jobs.
-- Previously it counted job_applications with is_viewed_by_tradesperson = false,
-- which reset to 0 after the tradesperson visited /my-jobs, even though they still
-- had active confirmed jobs. The badge should always reflect the real active count.

CREATE OR REPLACE FUNCTION public.get_my_jobs_badge_count()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::int
  FROM jobs j
  WHERE j.confirmed_tradesperson_id IN (
    SELECT id FROM company_profiles WHERE user_id = auth.uid()
  )
  AND j.status::text IN ('CONFIRMED', 'ACTIVE');
$$;
