-- ============================================================
-- Migration: Enable Realtime + fix homeowner SELECT RLS
--            on job_applications
-- ============================================================
-- Goal:
--   • Add job_applications to supabase_realtime publication so the
--     homeowner's browser receives INSERT/UPDATE events instantly.
--   • Ensure the homeowner SELECT policy exists (idempotent — safe
--     to run even if 20260315000003 already created a similar one).
-- ============================================================

-- 1. Add to realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'job_applications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;
    RAISE NOTICE '✓ job_applications added to supabase_realtime publication';
  ELSE
    RAISE NOTICE '✓ job_applications already in supabase_realtime publication';
  END IF;
END;
$$;

-- 2. Homeowner SELECT policy (idempotent)
--    Lets the realtime channel deliver row payloads to the homeowner's
--    browser session AND lets the user-client SELECT (fallback if admin
--    client env var is missing).
--
--    Pattern matches the user's spec:
--      job_id IN (SELECT id FROM jobs
--                 WHERE homeowner_id IN (
--                   SELECT id FROM homeowner_profiles
--                   WHERE user_id = auth.uid()))
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'job_applications'
      AND policyname = 'homeowner_can_view_applications_for_own_jobs'
  ) THEN
    CREATE POLICY homeowner_can_view_applications_for_own_jobs
      ON public.job_applications
      FOR SELECT
      USING (
        job_id IN (
          SELECT id FROM public.jobs
          WHERE homeowner_id IN (
            SELECT id FROM public.homeowner_profiles
            WHERE user_id = auth.uid()
          )
        )
      );
    RAISE NOTICE '✓ homeowner_can_view_applications_for_own_jobs policy created';
  ELSE
    RAISE NOTICE '✓ homeowner_can_view_applications_for_own_jobs policy already exists';
  END IF;
END;
$$;

-- 3. Verify
DO $$ BEGIN
  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'job_applications realtime + homeowner RLS: applied';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END $$;
