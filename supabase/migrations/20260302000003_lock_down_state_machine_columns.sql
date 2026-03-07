-- ============================================================
-- Migration: Lock down state machine columns
-- Task 3 of 7
-- ============================================================
-- Goals:
--   1. Confirm RLS is enabled on jobs and job_applications.
--   2. Create a BEFORE UPDATE trigger guard that blocks
--      end-user roles (anon / authenticated) from directly
--      changing state machine columns:
--        • jobs.status
--        • jobs.confirmed_tradesperson_id
--        • job_applications.status
--   3. Allow changes ONLY through SECURITY DEFINER RPC
--      functions (Tasks 4-5). Those run as 'postgres' so
--      current_user ≠ 'authenticated' inside the trigger.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  PART A: Ensure RLS is active on both tables
-- ════════════════════════════════════════════════════════════

-- jobs already had RLS from an earlier migration; idempotent.
ALTER TABLE public.jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications  ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════
--  PART B: Column-update guard trigger function
-- ════════════════════════════════════════════════════════════
-- PostgreSQL RLS cannot block individual column changes within
-- an UPDATE (only whole-row access). A BEFORE UPDATE trigger
-- is the correct mechanism.
--
-- Security model:
--   • The function is intentionally NOT SECURITY DEFINER.
--     With the default SECURITY INVOKER behaviour, current_user
--     inside the trigger reflects whoever issued the UPDATE:
--       – direct API call  → current_user = 'authenticated'/'anon'
--       – SECURITY DEFINER RPC (owned by postgres) → current_user = 'postgres'
--   • We block only 'authenticated' and 'anon'. All internal
--     roles (postgres, service_role, supabase_admin, etc.)
--     pass through so migrations and RPC functions are unaffected.
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_job_state_machine_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow any role that is not an end-user API role.
  -- SECURITY DEFINER RPC functions run as 'postgres', so they
  -- bypass this guard automatically.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  -- ── jobs table guards ───────────────────────────────────────
  IF TG_TABLE_NAME = 'jobs' THEN

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION
        'Direct update of jobs.status is not permitted '
        '(tried % → %). Use confirm_tradesperson(), '
        'cancel_job(), or complete_job() RPC.',
        OLD.status, NEW.status
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.confirmed_tradesperson_id IS DISTINCT FROM OLD.confirmed_tradesperson_id THEN
      RAISE EXCEPTION
        'Direct update of jobs.confirmed_tradesperson_id is not permitted. '
        'Use the confirm_tradesperson() RPC.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

  -- ── job_applications table guards ──────────────────────────
  ELSIF TG_TABLE_NAME = 'job_applications' THEN

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION
        'Direct update of job_applications.status is not permitted '
        '(tried % → %). Use withdraw_application() or the '
        'auto-cancel logic inside confirm_tradesperson() RPC.',
        OLD.status, NEW.status
        USING ERRCODE = 'insufficient_privilege';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_job_state_machine_columns() IS
  'BEFORE UPDATE trigger that blocks end-user roles from directly '
  'mutating state machine columns (jobs.status, '
  'jobs.confirmed_tradesperson_id, job_applications.status). '
  'Changes must go through SECURITY DEFINER RPC functions.';


-- ════════════════════════════════════════════════════════════
--  PART C: Attach triggers
-- ════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_guard_jobs_state_columns
  ON public.jobs;

CREATE TRIGGER trg_guard_jobs_state_columns
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_job_state_machine_columns();

COMMENT ON TRIGGER trg_guard_jobs_state_columns ON public.jobs IS
  'Blocks direct API updates to jobs.status and confirmed_tradesperson_id.';


DROP TRIGGER IF EXISTS trg_guard_applications_state_columns
  ON public.job_applications;

CREATE TRIGGER trg_guard_applications_state_columns
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_job_state_machine_columns();

COMMENT ON TRIGGER trg_guard_applications_state_columns ON public.job_applications IS
  'Blocks direct API updates to job_applications.status.';


-- ════════════════════════════════════════════════════════════
--  PART D: Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_jobs_rls     BOOLEAN;
  v_apps_rls     BOOLEAN;
  v_jobs_trig    BOOLEAN;
  v_apps_trig    BOOLEAN;
  v_fn_exists    BOOLEAN;
BEGIN
  SELECT relrowsecurity
    INTO v_jobs_rls
  FROM pg_class
  WHERE relname = 'jobs' AND relnamespace = 'public'::regnamespace;

  SELECT relrowsecurity
    INTO v_apps_rls
  FROM pg_class
  WHERE relname = 'job_applications' AND relnamespace = 'public'::regnamespace;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_guard_jobs_state_columns'
  ) INTO v_jobs_trig;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_guard_applications_state_columns'
  ) INTO v_apps_trig;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'guard_job_state_machine_columns'
      AND n.nspname = 'public'
  ) INTO v_fn_exists;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'RLS on jobs                       : %', CASE WHEN v_jobs_rls  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'RLS on job_applications           : %', CASE WHEN v_apps_rls  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'guard function exists             : %', CASE WHEN v_fn_exists THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'trigger on jobs                   : %', CASE WHEN v_jobs_trig THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'trigger on job_applications       : %', CASE WHEN v_apps_trig THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_jobs_rls AND v_apps_rls AND v_fn_exists AND v_jobs_trig AND v_apps_trig) THEN
    RAISE EXCEPTION 'Task 3 verification failed – see NOTICE output above';
  END IF;

  RAISE NOTICE '✅ Task 3 complete: state machine columns locked down';
END;
$$;
