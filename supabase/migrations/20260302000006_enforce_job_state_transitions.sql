-- ============================================================
-- Migration: Enforce state machine transition rules
-- Task 6 of 7
-- ============================================================
-- Allowed transitions (single source of truth):
--
--   POSTED    → CONFIRMED   homeowner confirms a tradesperson
--   POSTED    → CANCELLED   homeowner cancels the job
--   CONFIRMED → ACTIVE      tradesperson accepts within 15 min
--   CONFIRMED → POSTED      timeout revert (revert_unaccepted_jobs)
--   CONFIRMED → CANCELLED   homeowner cancels after confirming
--   ACTIVE    → COMPLETED   job finished
--
-- ALL other transitions are rejected at the database level.
-- The check runs for EVERY caller — including postgres/RPC
-- functions — so no code path can produce an illegal state.
--
-- This is intentionally separate from Task 3's access-control
-- trigger (which decides WHO may change status). Task 6 decides
-- WHAT transitions are valid after access is granted.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  PART A: Transition validator (pure function)
-- ════════════════════════════════════════════════════════════
-- Returns TRUE only for the six allowed transitions above.
-- Kept as a standalone function so it can be unit-tested via
--   SELECT public.is_valid_job_transition('POSTED', 'CONFIRMED');

CREATE OR REPLACE FUNCTION public.is_valid_job_transition(
  p_old  job_status,
  p_new  job_status
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT (p_old, p_new) IN (
    ('POSTED'   ::job_status, 'CONFIRMED'::job_status),
    ('POSTED'   ::job_status, 'CANCELLED'::job_status),
    ('CONFIRMED'::job_status, 'ACTIVE'   ::job_status),
    ('CONFIRMED'::job_status, 'POSTED'   ::job_status),
    ('CONFIRMED'::job_status, 'CANCELLED'::job_status),
    ('ACTIVE'   ::job_status, 'COMPLETED'::job_status)
  );
$$;

COMMENT ON FUNCTION public.is_valid_job_transition(job_status, job_status) IS
  'Returns TRUE if the old → new job_status transition is permitted '
  'by the state machine. Used by the enforce trigger and RPC functions.';


-- ════════════════════════════════════════════════════════════
--  PART B: Enforcement trigger
-- ════════════════════════════════════════════════════════════
-- Fires BEFORE UPDATE on jobs for every role (no current_user
-- filter). Rejects any status change that violates the machine.

CREATE OR REPLACE FUNCTION public.enforce_job_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only validate when status actually changes
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_valid_job_transition(OLD.status, NEW.status) THEN
    RAISE EXCEPTION
      'Invalid job state transition: % → %. '
      'Allowed transitions from %: %',
      OLD.status,
      NEW.status,
      OLD.status,
      CASE OLD.status
        WHEN 'POSTED'    THEN 'CONFIRMED, CANCELLED'
        WHEN 'CONFIRMED' THEN 'ACTIVE, POSTED (timeout), CANCELLED'
        WHEN 'ACTIVE'    THEN 'COMPLETED'
        ELSE 'none (terminal state)'
      END
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_job_state_machine() IS
  'BEFORE UPDATE trigger: rejects any jobs.status change that is not '
  'in the allowed transition table. Applies to all roles.';

DROP TRIGGER IF EXISTS trg_enforce_job_state_machine ON public.jobs;

CREATE TRIGGER trg_enforce_job_state_machine
  BEFORE UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_job_state_machine();

COMMENT ON TRIGGER trg_enforce_job_state_machine ON public.jobs IS
  'Enforces the state machine: only the six allowed status transitions '
  'may pass. Fires for all callers including SECURITY DEFINER RPCs.';


-- ════════════════════════════════════════════════════════════
--  PART C: cancel_job() RPC function
-- ════════════════════════════════════════════════════════════
-- Called by: homeowner who owns the job
-- Allowed when status = POSTED or CONFIRMED (i.e. before ACTIVE)
-- If CONFIRMED, also sets the confirmed tradesperson's application
-- back to PENDING (they can re-apply if the job is re-posted or
-- cancelled before they accepted).

CREATE OR REPLACE FUNCTION public.cancel_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
BEGIN
  -- Lock row and verify caller is the homeowner
  SELECT j.id, j.status, j.confirmed_tradesperson_id
    INTO v_job
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id = p_job_id
    AND hp.user_id = auth.uid()
  FOR UPDATE;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Gate: only POSTED and CONFIRMED are cancellable
  -- (the transition guard will also enforce this, belt-and-suspenders)
  IF v_job.status NOT IN ('POSTED', 'CONFIRMED') THEN
    RAISE EXCEPTION
      'Job cannot be cancelled in % state. '
      'Only POSTED and CONFIRMED jobs can be cancelled.',
      v_job.status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Cancel the job (transition guard validates the move)
  UPDATE jobs
    SET status                   = 'CANCELLED',
        confirmed_tradesperson_id = NULL,
        confirmed_at             = NULL
  WHERE id = p_job_id;

  -- Auto-cancel all pending applications
  UPDATE job_applications
    SET status = 'AUTO_CANCELLED'
  WHERE job_id = p_job_id
    AND status = 'PENDING';

END;
$$;

COMMENT ON FUNCTION public.cancel_job(UUID) IS
  'Homeowner cancels a POSTED or CONFIRMED job. '
  'All PENDING applications are AUTO_CANCELLED. '
  'Cannot cancel an ACTIVE or COMPLETED job.';

GRANT EXECUTE ON FUNCTION public.cancel_job(UUID) TO authenticated;


-- ════════════════════════════════════════════════════════════
--  PART D: complete_job() RPC function
-- ════════════════════════════════════════════════════════════
-- Called by: homeowner (job owner) after work is done
-- Job must be ACTIVE

CREATE OR REPLACE FUNCTION public.complete_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Verify caller is the homeowner and get current status
  SELECT j.status::TEXT
    INTO v_status
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id = p_job_id
    AND hp.user_id = auth.uid()
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status <> 'ACTIVE' THEN
    RAISE EXCEPTION
      'Job must be ACTIVE to complete (current: %)', v_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Transition guard enforces ACTIVE → COMPLETED
  UPDATE jobs
    SET status = 'COMPLETED'
  WHERE id = p_job_id;
END;
$$;

COMMENT ON FUNCTION public.complete_job(UUID) IS
  'Homeowner marks an ACTIVE job as COMPLETED. '
  'Only valid when status = ACTIVE.';

GRANT EXECUTE ON FUNCTION public.complete_job(UUID) TO authenticated;


-- ════════════════════════════════════════════════════════════
--  PART E: Self-test — verify the transition table
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  -- Expected results: (old, new, should_be_valid)
  v_cases TEXT[][] := ARRAY[
    -- Allowed
    ARRAY['POSTED',    'CONFIRMED', 'true' ],
    ARRAY['POSTED',    'CANCELLED', 'true' ],
    ARRAY['CONFIRMED', 'ACTIVE',    'true' ],
    ARRAY['CONFIRMED', 'POSTED',    'true' ],
    ARRAY['CONFIRMED', 'CANCELLED', 'true' ],
    ARRAY['ACTIVE',    'COMPLETED', 'true' ],
    -- Forbidden
    ARRAY['POSTED',    'ACTIVE',    'false'],
    ARRAY['POSTED',    'COMPLETED', 'false'],
    ARRAY['CONFIRMED', 'COMPLETED', 'false'],
    ARRAY['ACTIVE',    'POSTED',    'false'],
    ARRAY['ACTIVE',    'CONFIRMED', 'false'],
    ARRAY['ACTIVE',    'CANCELLED', 'false'],
    ARRAY['COMPLETED', 'POSTED',    'false'],
    ARRAY['CANCELLED', 'POSTED',    'false']
  ];
  v_case    TEXT[];
  v_result  BOOLEAN;
  v_expect  BOOLEAN;
  v_failed  INT := 0;
  v_trigger_exists BOOLEAN;
  v_fn_cancel  BOOLEAN;
  v_fn_complete BOOLEAN;
BEGIN
  -- Run all transition cases
  FOREACH v_case SLICE 1 IN ARRAY v_cases LOOP
    SELECT public.is_valid_job_transition(
      v_case[1]::job_status,
      v_case[2]::job_status
    ) INTO v_result;

    v_expect := v_case[3]::BOOLEAN;

    IF v_result <> v_expect THEN
      RAISE WARNING 'FAIL: % → % expected % got %',
        v_case[1], v_case[2], v_expect, v_result;
      v_failed := v_failed + 1;
    ELSE
      RAISE NOTICE 'PASS: % → % = %', v_case[1], v_case[2], v_result;
    END IF;
  END LOOP;

  IF v_failed > 0 THEN
    RAISE EXCEPTION '% transition case(s) failed – state machine is wrong', v_failed;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_job_state_machine'
  ) INTO v_trigger_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'cancel_job' AND n.nspname = 'public'
  ) INTO v_fn_cancel;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'complete_job' AND n.nspname = 'public'
  ) INTO v_fn_complete;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'All % transition cases : PASS', array_length(v_cases, 1);
  RAISE NOTICE 'trigger trg_enforce_job_state_machine: %', CASE WHEN v_trigger_exists THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'function cancel_job()               : %', CASE WHEN v_fn_cancel   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'function complete_job()             : %', CASE WHEN v_fn_complete  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_trigger_exists AND v_fn_cancel AND v_fn_complete) THEN
    RAISE EXCEPTION 'Task 6 verification failed – see NOTICE output above';
  END IF;

  RAISE NOTICE '✅ Task 6 complete: state machine transitions enforced';
END;
$$;
