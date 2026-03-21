-- ============================================================
-- Add is_viewed_by_tradesperson flag to job_applications
-- Used to show a badge count on the "My Jobs" button in header
-- for tradespeople (company user type)
-- ============================================================

-- 1. Add the column (idempotent)
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS is_viewed_by_tradesperson BOOLEAN DEFAULT FALSE;

-- 2. RPC: get unviewed confirmed-job count for the current tradesperson
--    A tradesperson is "accepted" when jobs.confirmed_tradesperson_id = their company_profile.id
--    Returns a single integer — the badge count.
CREATE OR REPLACE FUNCTION public.get_my_jobs_badge_count()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::int
  FROM job_applications ja
  JOIN jobs j ON j.id = ja.job_id
  WHERE ja.company_id IN (
    SELECT id FROM company_profiles WHERE user_id = auth.uid()
  )
  AND j.confirmed_tradesperson_id = ja.company_id
  AND j.status::text IN ('CONFIRMED', 'ACTIVE')
  AND ja.is_viewed_by_tradesperson = FALSE;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_jobs_badge_count() TO authenticated;

-- 3. RPC: mark all confirmed-job applications as viewed for the current tradesperson
CREATE OR REPLACE FUNCTION public.mark_my_jobs_viewed()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE job_applications ja
  SET is_viewed_by_tradesperson = TRUE
  FROM jobs j
  WHERE ja.job_id = j.id
    AND ja.company_id IN (
      SELECT id FROM company_profiles WHERE user_id = auth.uid()
    )
    AND j.confirmed_tradesperson_id = ja.company_id
    AND ja.is_viewed_by_tradesperson = FALSE;
$$;

GRANT EXECUTE ON FUNCTION public.mark_my_jobs_viewed() TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ is_viewed_by_tradesperson column + badge RPCs created';
END $$;
