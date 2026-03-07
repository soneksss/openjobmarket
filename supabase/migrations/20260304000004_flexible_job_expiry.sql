-- ============================================================
-- Migration: Flexible job auto-expiry (EXPIRED terminal state)
-- ============================================================
--
-- Flexible job lifecycle (final):
--
--   POSTED ──── homeowner marks done ──────────► COMPLETED  (terminal)
--          ──── homeowner deletes ─────────────► CANCELLED  (terminal)
--          ──── expires_at passes (pg_cron) ───► EXPIRED    (terminal ← NEW)
--
-- No ACTIVE state required for MVP.
-- ACTIVE transitions remain in the state machine for optional use
-- but are not part of the core lifecycle.
--
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  1. Add EXPIRED to the job_status enum
-- ════════════════════════════════════════════════════════════
-- ADD VALUE IF NOT EXISTS is safe to re-run (Postgres 9.6+).
-- Note: enum additions cannot be rolled back — this is intentional.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.job_status'::regtype
      AND enumlabel  = 'EXPIRED'
  ) THEN
    ALTER TYPE public.job_status ADD VALUE 'EXPIRED';
    RAISE NOTICE '✓ EXPIRED added to job_status enum';
  ELSE
    RAISE NOTICE '· EXPIRED already in job_status enum — skipping';
  END IF;
END;
$$;


-- ════════════════════════════════════════════════════════════
--  2. Allow POSTED → EXPIRED in the state machine
-- ════════════════════════════════════════════════════════════
-- Rewrite enforce_job_state_machine() to add POSTED → EXPIRED
-- for flexible jobs. All other transitions remain unchanged.

CREATE OR REPLACE FUNCTION public.enforce_job_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- No change in status — nothing to validate.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- ── Flexible jobs (is_urgent = false) ─────────────────────
  IF NOT COALESCE(NEW.is_urgent, FALSE) THEN
    IF (OLD.status::TEXT, NEW.status::TEXT) IN (
      ('POSTED',    'ACTIVE'    ),   -- optional in-progress step
      ('POSTED',    'COMPLETED' ),   -- direct completion
      ('POSTED',    'CANCELLED' ),   -- homeowner deletes
      ('POSTED',    'EXPIRED'   ),   -- system auto-expiry  ← NEW
      ('ACTIVE',    'COMPLETED' ),
      ('ACTIVE',    'CANCELLED' )
    ) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'Invalid flexible-job state transition: % → %. '
      'Allowed from %: %',
      OLD.status, NEW.status, OLD.status,
      CASE OLD.status::TEXT
        WHEN 'POSTED'    THEN 'ACTIVE, COMPLETED, CANCELLED, EXPIRED'
        WHEN 'ACTIVE'    THEN 'COMPLETED, CANCELLED'
        ELSE 'none (terminal state)'
      END
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Urgent jobs — existing machine ────────────────────────
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
  'BEFORE UPDATE trigger: enforces allowed status transitions. '
  'Urgent jobs: POSTED→CONFIRMED→ACTIVE→COMPLETED (15-min window). '
  'Flexible jobs: POSTED→COMPLETED, POSTED→CANCELLED, POSTED→EXPIRED (auto), '
  'POSTED→ACTIVE (optional), ACTIVE→COMPLETED, ACTIVE→CANCELLED.';

DO $$ BEGIN
  RAISE NOTICE '✓ enforce_job_state_machine updated — POSTED→EXPIRED allowed for flexible jobs';
END; $$;


-- ════════════════════════════════════════════════════════════
--  3. expire_flexible_jobs() — called by pg_cron
-- ════════════════════════════════════════════════════════════
-- Transitions every POSTED flexible job whose expires_at has
-- passed to EXPIRED.  Returns the count of rows affected.
--
-- SECURITY DEFINER so pg_cron (which runs as postgres/supabase_admin)
-- can bypass RLS without needing explicit privileges.

CREATE OR REPLACE FUNCTION public.expire_flexible_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE jobs
  SET    status = 'EXPIRED'
  WHERE  status      = 'POSTED'
    AND  is_urgent   = FALSE
    AND  expires_at  IS NOT NULL
    AND  expires_at  < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RAISE LOG 'expire_flexible_jobs: expired % job(s)', v_count;
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.expire_flexible_jobs() IS
  'Called by pg_cron every hour. Transitions POSTED flexible jobs '
  'whose expires_at has passed to EXPIRED. '
  'Returns the number of jobs expired.';

-- No GRANT to authenticated — only called by pg_cron / service role.

DO $$ BEGIN
  RAISE NOTICE '✓ expire_flexible_jobs() created';
END; $$;


-- ════════════════════════════════════════════════════════════
--  4. Schedule via pg_cron (runs every hour at :00)
-- ════════════════════════════════════════════════════════════
-- pg_cron is available on all Supabase plans.
-- cron.schedule() is idempotent on name — it upserts the job.
--
-- To verify after deploy:
--   SELECT * FROM cron.job WHERE jobname = 'expire-flexible-jobs';
--   SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-flexible-jobs') ORDER BY start_time DESC LIMIT 10;

DO $$
BEGIN
  -- Only schedule if pg_cron extension is present
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'expire-flexible-jobs',          -- job name (upserts on conflict)
      '0 * * * *',                     -- every hour at :00
      'SELECT public.expire_flexible_jobs()'
    );
    RAISE NOTICE '✓ pg_cron job "expire-flexible-jobs" scheduled (hourly)';
  ELSE
    RAISE NOTICE '⚠ pg_cron extension not found — schedule expire_flexible_jobs() manually';
    RAISE NOTICE '  Options:';
    RAISE NOTICE '    1. Enable pg_cron in Supabase Dashboard → Extensions';
    RAISE NOTICE '    2. Call SELECT public.expire_flexible_jobs() from a scheduled Edge Function';
  END IF;
END;
$$;


-- ════════════════════════════════════════════════════════════
--  Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_enum_ok   BOOLEAN;
  v_fn_ok     BOOLEAN;
  v_cron_ok   BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.job_status'::regtype
      AND enumlabel  = 'EXPIRED'
  ) INTO v_enum_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'expire_flexible_jobs' AND n.nspname = 'public'
  ) INTO v_fn_ok;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'expire-flexible-jobs'
    ) INTO v_cron_ok;
  ELSE
    v_cron_ok := FALSE;
  END IF;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Migration — Flexible Job Auto-Expiry';
  RAISE NOTICE '';
  RAISE NOTICE '  EXPIRED enum value added      : %', CASE WHEN v_enum_ok THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  expire_flexible_jobs() created: %', CASE WHEN v_fn_ok   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  pg_cron job scheduled         : %', CASE WHEN v_cron_ok THEN '✓' ELSE '· skipped (no pg_cron)' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Final flexible job lifecycle:';
  RAISE NOTICE '  POSTED → COMPLETED  homeowner calls complete_job()';
  RAISE NOTICE '  POSTED → CANCELLED  homeowner cancels';
  RAISE NOTICE '  POSTED → EXPIRED    pg_cron after expires_at (hourly)';
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_enum_ok AND v_fn_ok) THEN
    RAISE EXCEPTION 'Migration verification failed — check NOTICE output above';
  END IF;
END;
$$;
