-- ============================================================
-- Migration: Add SELECT RLS policy on job_applications
-- ============================================================
-- Problem:
--   job_applications has no SELECT policy for authenticated users.
--   Homeowners polling GET /api/jobs/[id]/urgent-responses get 0
--   results because the Supabase user client can't read rows.
--   The real-time subscription in FindingTradesView also fires but
--   the subsequent poll returns empty (same RLS block).
--
-- Fix:
--   1. Job owners (homeowner OR company) can SELECT all applications
--      for their own jobs.
--   2. Applicants (company accounts) can SELECT their own applications.
--   3. Existing INSERT policy is preserved (not touched here).
-- ============================================================

-- Allow job owners to read applications for their jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.job_applications'::regclass
      AND polname = 'job_owner_can_read_applications'
  ) THEN
    EXECUTE $p$
      CREATE POLICY job_owner_can_read_applications
        ON public.job_applications
        FOR SELECT
        USING (
          job_id IN (
            SELECT id FROM jobs
            WHERE company_id   IN (SELECT id FROM company_profiles   WHERE user_id = auth.uid())
               OR homeowner_id IN (SELECT id FROM homeowner_profiles WHERE user_id = auth.uid())
          )
        )
    $p$;
    RAISE NOTICE '✓ job_owner_can_read_applications policy created';
  ELSE
    RAISE NOTICE '✓ job_owner_can_read_applications policy already exists — skipped';
  END IF;
END $$;

-- Allow applicants (company/tradesperson accounts) to read their own applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.job_applications'::regclass
      AND polname = 'applicant_can_read_own_applications'
  ) THEN
    EXECUTE $p$
      CREATE POLICY applicant_can_read_own_applications
        ON public.job_applications
        FOR SELECT
        USING (
          company_id IN (SELECT id FROM company_profiles WHERE user_id = auth.uid())
          OR professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
        )
    $p$;
    RAISE NOTICE '✓ applicant_can_read_own_applications policy created';
  ELSE
    RAISE NOTICE '✓ applicant_can_read_own_applications policy already exists — skipped';
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE '✓ job_applications SELECT RLS policies applied';
  RAISE NOTICE '  - Homeowners/companies can read applications for their own jobs';
  RAISE NOTICE '  - Tradespeople/professionals can read their own applications';
END $$;
