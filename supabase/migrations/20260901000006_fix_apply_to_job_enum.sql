-- ============================================================================
-- Fix: apply_to_job() uses non-existent application_status enum values
-- Date: 2026-09-01
--
-- Bug:
--   apply_to_job() (rebuilt in 20260715000008, merging the now-dropped
--   try_apply_flexible_job cap logic) counts the flexible-job response cap with
--     status NOT IN ('AUTO_CANCELLED', 'REJECTED', 'DECLINED')
--   But the application_status enum only has:
--     PENDING, WITHDRAWN, AUTO_CANCELLED, EXPIRED
--   'REJECTED' and 'DECLINED' were carried over from the old try_apply_flexible_job
--   and never existed on this column. PostgreSQL fails to cast them, so the RPC
--   throws:  invalid input value for enum application_status: "REJECTED"
--
--   Reproduction: a tradesperson opens a job from a push notification, writes a
--   message and taps Send → POST /api/jobs/[id]/urgent-responses → apply_to_job()
--   → 500 with that enum error.
--
-- Fix:
--   Use the real terminal statuses — WITHDRAWN, AUTO_CANCELLED, EXPIRED — i.e.
--   the same predicate handle_job_application_insert() has used since
--   20260314000001. Nothing else in the function changes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_to_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tradesperson_id UUID;
  v_is_urgent       BOOLEAN;
  v_status          TEXT;
  v_cap             INTEGER;
  v_count           INTEGER;
BEGIN
  -- Resolve calling user's company_profile
  SELECT id INTO v_tradesperson_id
  FROM company_profiles
  WHERE user_id = auth.uid();

  IF v_tradesperson_id IS NULL THEN
    RAISE EXCEPTION 'Only tradesperson accounts can apply to jobs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Guard: cannot apply to your own job
  IF EXISTS (
    SELECT 1 FROM jobs
    WHERE id = p_job_id
      AND company_id = v_tradesperson_id
  ) THEN
    RAISE EXCEPTION 'You cannot apply to your own job'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Serialize concurrent applications to this job — required for the cap
  -- check below to be race-free.
  PERFORM pg_advisory_xact_lock(hashtext(p_job_id::text));

  SELECT status::TEXT, COALESCE(is_urgent, FALSE)
  INTO v_status, v_is_urgent
  FROM jobs WHERE id = p_job_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job % not found', p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_status <> 'POSTED' THEN
    RAISE EXCEPTION 'Job % is not available for applications', p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Flexible-job response cap (server-side source of truth) ─────────────
  IF NOT v_is_urgent THEN
    SELECT COALESCE(max_responses, 10) INTO v_cap FROM jobs WHERE id = p_job_id;

    SELECT COUNT(*) INTO v_count
    FROM job_applications
    WHERE job_id = p_job_id
      AND status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED');

    IF v_count >= v_cap THEN
      RAISE EXCEPTION 'This job has reached its maximum number of responses (%)', v_cap
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
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

  -- ── If this application just reached the cap, flip the job to FILLED ────
  IF NOT v_is_urgent THEN
    SELECT COUNT(*) INTO v_count
    FROM job_applications
    WHERE job_id = p_job_id
      AND status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED');

    IF v_count >= v_cap THEN
      UPDATE jobs SET status = 'FILLED' WHERE id = p_job_id AND status = 'POSTED';
      RAISE NOTICE '[apply_to_job] Job % reached response cap (%) — status set to FILLED', p_job_id, v_cap;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_to_job(UUID) TO authenticated;

DO $$ BEGIN RAISE NOTICE 'apply_to_job(): enum values corrected (WITHDRAWN/AUTO_CANCELLED/EXPIRED)'; END $$;
