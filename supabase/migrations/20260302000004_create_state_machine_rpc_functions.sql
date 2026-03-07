-- ============================================================
-- Migration: RPC functions for atomic state transitions
-- Task 4 of 7
-- ============================================================
-- All functions are SECURITY DEFINER (run as postgres) so the
-- Task 3 column guard allows their UPDATE statements to proceed.
-- SET search_path = public prevents search-path injection.
--
-- Callers:
--   apply_to_job()          → tradesperson (authenticated)
--   confirm_tradesperson()  → homeowner (authenticated)
--   accept_confirmed_job()  → tradesperson (authenticated)
--   revert_unaccepted_jobs()→ cron / Edge Function (service_role)
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  PART A: Add confirmed_at column to jobs
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.jobs.confirmed_at IS
  'Timestamp when homeowner confirmed a tradesperson. '
  'Tradesperson must call accept_confirmed_job() within 15 minutes '
  'or the job reverts to POSTED by revert_unaccepted_jobs().';

-- Index for the revert cron query
CREATE INDEX IF NOT EXISTS idx_jobs_confirmed_at
  ON public.jobs (confirmed_at)
  WHERE status = 'CONFIRMED' AND confirmed_at IS NOT NULL;


-- ════════════════════════════════════════════════════════════
--  FUNCTION 1: apply_to_job(p_job_id)
-- ════════════════════════════════════════════════════════════
-- Called by: tradesperson
-- Rules:
--   • Caller must have a company_profile (tradesperson account)
--   • Job must be in POSTED state
--   • Inserts a PENDING application
--   • Unique index prevents duplicate applications

CREATE OR REPLACE FUNCTION public.apply_to_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tradesperson_id UUID;
BEGIN
  -- Resolve the calling user's company_profile.id
  SELECT id
    INTO v_tradesperson_id
  FROM company_profiles
  WHERE user_id = auth.uid();

  IF v_tradesperson_id IS NULL THEN
    RAISE EXCEPTION 'Only tradesperson accounts can apply to jobs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Job must be POSTED
  IF NOT EXISTS (
    SELECT 1 FROM jobs
    WHERE id = p_job_id
      AND status = 'POSTED'
  ) THEN
    RAISE EXCEPTION 'Job % is not available for applications', p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Insert application — unique index (job_id, tradesperson_id) catches duplicates
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

COMMENT ON FUNCTION public.apply_to_job(UUID) IS
  'Tradesperson submits a PENDING application for a POSTED job. '
  'Blocked if job is not POSTED or duplicate application exists.';

GRANT EXECUTE ON FUNCTION public.apply_to_job(UUID) TO authenticated;


-- ════════════════════════════════════════════════════════════
--  FUNCTION 2: confirm_tradesperson(p_job_id, p_tradesperson_id)
-- ════════════════════════════════════════════════════════════
-- Called by: homeowner who owns the job
-- Rules:
--   • Caller must own the job (homeowner_profiles.user_id = auth.uid())
--   • Job must be POSTED (locks the row with FOR UPDATE)
--   • Atomically:
--       – Sets job → CONFIRMED + confirmed_tradesperson_id + confirmed_at
--       – AUTO_CANCELs all other PENDING applications
--   • The confirmed tradesperson's application stays PENDING
--     until they call accept_confirmed_job()

CREATE OR REPLACE FUNCTION public.confirm_tradesperson(
  p_job_id           UUID,
  p_tradesperson_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_status TEXT;
BEGIN
  -- Lock the job row and verify the caller is its homeowner
  SELECT j.status::TEXT
    INTO v_job_status
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id = p_job_id
    AND hp.user_id = auth.uid()
  FOR UPDATE;

  IF v_job_status IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_job_status <> 'POSTED' THEN
    RAISE EXCEPTION 'Job is not in POSTED state (current: %)', v_job_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Verify the tradesperson has a PENDING application
  IF NOT EXISTS (
    SELECT 1 FROM job_applications
    WHERE job_id = p_job_id
      AND tradesperson_id = p_tradesperson_id
      AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Tradesperson % has no pending application for this job',
      p_tradesperson_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Confirm: update job (trigger guard allows because current_user = 'postgres')
  UPDATE jobs
    SET status                   = 'CONFIRMED',
        confirmed_tradesperson_id = p_tradesperson_id,
        confirmed_at             = now()
  WHERE id = p_job_id;

  -- Auto-cancel every OTHER pending application
  UPDATE job_applications
    SET status = 'AUTO_CANCELLED'
  WHERE job_id = p_job_id
    AND tradesperson_id <> p_tradesperson_id
    AND status = 'PENDING';

END;
$$;

COMMENT ON FUNCTION public.confirm_tradesperson(UUID, UUID) IS
  'Homeowner atomically confirms a tradesperson: job → CONFIRMED, '
  'confirmed_at stamped, other applications AUTO_CANCELLED. '
  'The confirmed tradesperson has 15 min to call accept_confirmed_job().';

GRANT EXECUTE ON FUNCTION public.confirm_tradesperson(UUID, UUID) TO authenticated;


-- ════════════════════════════════════════════════════════════
--  FUNCTION 3: accept_confirmed_job(p_job_id)
-- ════════════════════════════════════════════════════════════
-- Called by: the confirmed tradesperson
-- Rules:
--   • Job must be CONFIRMED
--   • confirmed_tradesperson_id must match the calling user's profile
--   • Must be within 15-minute window (confirmed_at > now() - 15 min)
--   • Sets job → ACTIVE

CREATE OR REPLACE FUNCTION public.accept_confirmed_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tradesperson_id UUID;
  v_rows_updated    INT;
BEGIN
  -- Resolve caller's company_profile.id
  SELECT id
    INTO v_tradesperson_id
  FROM company_profiles
  WHERE user_id = auth.uid();

  IF v_tradesperson_id IS NULL THEN
    RAISE EXCEPTION 'Only tradesperson accounts can accept jobs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Attempt the state transition (one atomic UPDATE)
  UPDATE jobs
    SET status = 'ACTIVE'
  WHERE id                      = p_job_id
    AND status                  = 'CONFIRMED'
    AND confirmed_tradesperson_id = v_tradesperson_id
    AND confirmed_at            > now() - INTERVAL '15 minutes';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    -- Give a precise reason
    IF NOT EXISTS (
      SELECT 1 FROM jobs
      WHERE id = p_job_id
        AND status = 'CONFIRMED'
        AND confirmed_tradesperson_id = v_tradesperson_id
    ) THEN
      RAISE EXCEPTION 'You are not the confirmed tradesperson for this job'
        USING ERRCODE = 'insufficient_privilege';
    ELSE
      RAISE EXCEPTION 'The 15-minute acceptance window has expired. '
        'The job will be re-opened automatically.'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.accept_confirmed_job(UUID) IS
  'Confirmed tradesperson accepts within 15 minutes: job → ACTIVE. '
  'Fails if window expired or caller is not the confirmed tradesperson.';

GRANT EXECUTE ON FUNCTION public.accept_confirmed_job(UUID) TO authenticated;


-- ════════════════════════════════════════════════════════════
--  FUNCTION 4: revert_unaccepted_jobs()
-- ════════════════════════════════════════════════════════════
-- Called by: Supabase cron / Edge Function (service_role)
-- Rules:
--   • Find CONFIRMED jobs where confirmed_at < now() - 15 min
--   • For each: set the confirmed tradesperson's application → EXPIRED
--   • Reset job → POSTED, clear confirmed_tradesperson_id + confirmed_at
-- Returns: number of jobs reverted (for cron logging)

CREATE OR REPLACE FUNCTION public.revert_unaccepted_jobs()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job       RECORD;
  v_reverted  INT := 0;
BEGIN
  FOR v_job IN
    SELECT id, confirmed_tradesperson_id
    FROM jobs
    WHERE status       = 'CONFIRMED'
      AND confirmed_at < now() - INTERVAL '15 minutes'
    FOR UPDATE SKIP LOCKED   -- safe for concurrent cron runs
  LOOP
    -- Mark the confirmed tradesperson's application as EXPIRED
    UPDATE job_applications
      SET status = 'EXPIRED'
    WHERE job_id          = v_job.id
      AND tradesperson_id = v_job.confirmed_tradesperson_id
      AND status          = 'PENDING';

    -- Revert job back to POSTED
    UPDATE jobs
      SET status                    = 'POSTED',
          confirmed_tradesperson_id = NULL,
          confirmed_at              = NULL
    WHERE id = v_job.id;

    v_reverted := v_reverted + 1;
    RAISE NOTICE 'Reverted job % (confirmed tradesperson: %)',
      v_job.id, v_job.confirmed_tradesperson_id;
  END LOOP;

  RAISE NOTICE 'revert_unaccepted_jobs: reverted % job(s)', v_reverted;
  RETURN v_reverted;
END;
$$;

COMMENT ON FUNCTION public.revert_unaccepted_jobs() IS
  'Scheduled cron function: reverts CONFIRMED jobs whose 15-minute '
  'acceptance window has expired back to POSTED. '
  'Sets the skipped tradesperson''s application to EXPIRED. '
  'Returns the count of jobs reverted. Safe for concurrent runs '
  '(uses FOR UPDATE SKIP LOCKED).';

-- Only service_role (cron) should call this, not end users
REVOKE EXECUTE ON FUNCTION public.revert_unaccepted_jobs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revert_unaccepted_jobs() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.revert_unaccepted_jobs() TO service_role;


-- ════════════════════════════════════════════════════════════
--  PART B: Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_has_confirmed_at  BOOLEAN;
  v_fn_apply          BOOLEAN;
  v_fn_confirm        BOOLEAN;
  v_fn_accept         BOOLEAN;
  v_fn_revert         BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'confirmed_at'
  ) INTO v_has_confirmed_at;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'apply_to_job' AND n.nspname = 'public'
  ) INTO v_fn_apply;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'confirm_tradesperson' AND n.nspname = 'public'
  ) INTO v_fn_confirm;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'accept_confirmed_job' AND n.nspname = 'public'
  ) INTO v_fn_accept;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'revert_unaccepted_jobs' AND n.nspname = 'public'
  ) INTO v_fn_revert;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'jobs.confirmed_at column         : %', CASE WHEN v_has_confirmed_at THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'function apply_to_job()          : %', CASE WHEN v_fn_apply   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'function confirm_tradesperson()  : %', CASE WHEN v_fn_confirm THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'function accept_confirmed_job()  : %', CASE WHEN v_fn_accept  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'function revert_unaccepted_jobs(): %', CASE WHEN v_fn_revert  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_has_confirmed_at AND v_fn_apply AND v_fn_confirm AND v_fn_accept AND v_fn_revert) THEN
    RAISE EXCEPTION 'Task 4 verification failed – see NOTICE output above';
  END IF;

  RAISE NOTICE '✅ Task 4 complete: RPC state-machine functions created';
END;
$$;
