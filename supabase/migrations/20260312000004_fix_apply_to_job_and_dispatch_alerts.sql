-- ============================================================
-- Migration: Fix apply_to_job RPC + urgent_job_dispatch_alerts FK
-- ============================================================
--
-- Problems this fixes:
--   1. urgent_job_dispatch_alerts.job_id FK may still point to
--      homeowner_jobs instead of jobs — causes INSERT failures
--      and notifiedCount = 0 on the live search page.
--
--   2. apply_to_job() RPC is the canonical way for a company-type
--      tradesperson to apply.  This re-ensures it is present and
--      grants execute to authenticated users.
-- ============================================================


-- ── 1. Fix urgent_job_dispatch_alerts FK ────────────────────
-- Drop any existing FK on job_id (name varies) and re-add pointing to jobs(id).

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.urgent_job_dispatch_alerts'::regclass
    AND contype   = 'f'
    AND conname  LIKE '%job_id%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.urgent_job_dispatch_alerts DROP CONSTRAINT ' || quote_ident(v_constraint);
    RAISE NOTICE '✓ Dropped old FK % from urgent_job_dispatch_alerts', v_constraint;
  ELSE
    RAISE NOTICE '– No job_id FK found on urgent_job_dispatch_alerts (already clean)';
  END IF;
END;
$$;

-- Re-add FK pointing to public.jobs(id)
ALTER TABLE public.urgent_job_dispatch_alerts
  ADD CONSTRAINT urgent_job_dispatch_alerts_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✓ urgent_job_dispatch_alerts.job_id → jobs(id)';
END; $$;


-- ── 2. Ensure apply_to_job RPC is correct ───────────────────
-- Re-creates the function so it sets BOTH company_id AND tradesperson_id,
-- and grants execute to authenticated role.

CREATE OR REPLACE FUNCTION public.apply_to_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tradesperson_id UUID;
BEGIN
  -- Resolve calling user's company_profile
  SELECT id INTO v_tradesperson_id
  FROM company_profiles
  WHERE user_id = auth.uid();

  IF v_tradesperson_id IS NULL THEN
    RAISE EXCEPTION 'Only tradesperson accounts can apply to jobs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Job must be in POSTED state
  IF NOT EXISTS (
    SELECT 1 FROM jobs
    WHERE id = p_job_id
      AND status = 'POSTED'
  ) THEN
    RAISE EXCEPTION 'Job % is not available for applications', p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Insert — sets BOTH company_id and tradesperson_id (required columns)
  BEGIN
    INSERT INTO job_applications (job_id, company_id, tradesperson_id, status)
    VALUES (p_job_id, v_tradesperson_id, v_tradesperson_id, 'PENDING');
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'You have already applied to this job'
        USING ERRCODE = 'unique_violation';
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_to_job(UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ apply_to_job() re-created and granted to authenticated';
END; $$;
