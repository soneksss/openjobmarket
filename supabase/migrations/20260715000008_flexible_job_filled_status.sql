-- ============================================================================
-- Migration: Flexible job cap → FILLED status, enforced server-side only
-- ============================================================================
-- Root cause: the RPC actually called by the app for every application —
-- apply_to_job(), used by both urgent and flexible jobs via
-- POST /api/jobs/[id]/urgent-responses — has zero cap enforcement. A
-- separate, properly atomic try_apply_flexible_job() DOES check the cap
-- correctly, but nothing in the app ever calls it — dead code.
--
-- Fix: move the cap check (with the same advisory-lock pattern
-- try_apply_flexible_job used) directly into apply_to_job(), the one real
-- entry point, and drop the dead function so there's only one implementation
-- to maintain. When the cap is reached, atomically transition the job to a
-- new FILLED status — components/homeowner-dashboard.tsx already has a
-- (previously dead) UI branch rendering a purple "Filled" badge for exactly
-- this status string, so no UI code needs to change.
-- ============================================================================

-- ── 1. Add FILLED to the job_status enum (same proven pattern as EXPIRED) ──

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.job_status'::regtype
      AND enumlabel  = 'FILLED'
  ) THEN
    ALTER TYPE public.job_status ADD VALUE 'FILLED';
    RAISE NOTICE '✓ FILLED added to job_status enum';
  ELSE
    RAISE NOTICE '· FILLED already in job_status enum — skipping';
  END IF;
END;
$$;


-- ── 2. Allow POSTED→FILLED and FILLED→{COMPLETED,CANCELLED} for flexible jobs ──
-- Everything else in this function is unchanged from 20260304000004.

CREATE OR REPLACE FUNCTION public.enforce_job_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- ── Flexible jobs (is_urgent = false) ─────────────────────
  IF NOT COALESCE(NEW.is_urgent, FALSE) THEN
    IF (OLD.status::TEXT, NEW.status::TEXT) IN (
      ('POSTED',    'ACTIVE'    ),   -- optional in-progress step
      ('POSTED',    'COMPLETED' ),   -- direct completion
      ('POSTED',    'CANCELLED' ),   -- homeowner deletes
      ('POSTED',    'EXPIRED'   ),   -- system auto-expiry
      ('POSTED',    'FILLED'    ),   -- response cap reached          ← NEW
      ('FILLED',    'COMPLETED' ),   -- homeowner completes after filling   ← NEW
      ('FILLED',    'CANCELLED' ),   -- homeowner cancels after filling     ← NEW
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
        WHEN 'POSTED'    THEN 'ACTIVE, COMPLETED, CANCELLED, EXPIRED, FILLED'
        WHEN 'FILLED'    THEN 'COMPLETED, CANCELLED'
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
  'POSTED→FILLED (response cap reached), FILLED→COMPLETED, FILLED→CANCELLED, '
  'POSTED→ACTIVE (optional), ACTIVE→COMPLETED, ACTIVE→CANCELLED.';

DO $$ BEGIN RAISE NOTICE '✓ enforce_job_state_machine updated — POSTED→FILLED allowed for flexible jobs'; END; $$;


-- ── 3. apply_to_job() — atomic cap check + FILLED transition, single source ──
-- Merges try_apply_flexible_job()'s advisory-lock cap logic into the one RPC
-- actually called by the app (POST /api/jobs/[id]/urgent-responses), for both
-- urgent and flexible jobs. Urgent-job behaviour is unchanged (is_urgent jobs
-- have no max_responses cap in practice). The exception message deliberately
-- includes the substring "maximum number" — the API route already classifies
-- errors containing that phrase as a 409 business-rule rejection rather than
-- a 500, so no application-code change is needed for correct error handling.

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
  -- check below to be race-free (two simultaneous inserts must not both
  -- slip in at the boundary).
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
      AND status NOT IN ('AUTO_CANCELLED', 'REJECTED', 'DECLINED');

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
  -- Still inside the same advisory-locked transaction as the insert above,
  -- so this can never race with another concurrent application.
  IF NOT v_is_urgent THEN
    SELECT COUNT(*) INTO v_count
    FROM job_applications
    WHERE job_id = p_job_id
      AND status NOT IN ('AUTO_CANCELLED', 'REJECTED', 'DECLINED');

    IF v_count >= v_cap THEN
      UPDATE jobs SET status = 'FILLED' WHERE id = p_job_id AND status = 'POSTED';
      RAISE NOTICE '[apply_to_job] Job % reached response cap (%) — status set to FILLED', p_job_id, v_cap;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_to_job(UUID) TO authenticated;

DO $$ BEGIN RAISE NOTICE '✓ apply_to_job: flexible-job response cap + FILLED transition consolidated in'; END; $$;


-- ── 4. Drop the dead, never-called duplicate implementation ─────────────────

DROP FUNCTION IF EXISTS public.try_apply_flexible_job(UUID, UUID, UUID, TEXT);

DO $$ BEGIN RAISE NOTICE '✓ try_apply_flexible_job() dropped (superseded by apply_to_job)'; END; $$;


-- ── 5. FILLED jobs also drop out of active browse listings ──────────────────
-- Same trigger that already does this for COMPLETED/CANCELLED
-- (20260707000002_auto_inactive_on_completion.sql) — a filled job shouldn't
-- keep showing up as open-to-interest, same reasoning as those two.

CREATE OR REPLACE FUNCTION public.jobs_set_inactive_on_terminal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('COMPLETED', 'CANCELLED', 'FILLED') AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN RAISE NOTICE '✓ jobs_set_inactive_on_terminal_status updated — FILLED also sets is_active=false'; END; $$;


DO $$ BEGIN RAISE NOTICE '✅ Migration 20260715000008 (flexible job FILLED status) complete'; END; $$;
