-- ============================================================
-- Migration: Reliability Auto-Update Engine
-- ============================================================
--
-- Keeps contractor_profiles.accept_rate and completion_rate
-- accurate by triggering on state machine transitions.
--
-- Counter columns added to contractor_profiles:
--   urgent_dispatch_count  — # times system dispatched this contractor
--   urgent_confirm_count   — # times a homeowner confirmed (selected) them
--   urgent_active_count    — # times they accepted in the 15-min window (→ ACTIVE)
--   urgent_complete_count  — # times the job reached COMPLETED
--   urgent_ignore_count    — # times they timed out (CONFIRMED → POSTED revert)
--
-- Rate formulas (same as ranking RPC):
--   accept_rate     = urgent_active_count  / urgent_dispatch_count
--   completion_rate = urgent_complete_count / urgent_active_count
--   (Both clamped [0.0, 1.0]; default 1.0 when denominator = 0)
--
-- Triggered by:
--   1. urgent_job_dispatch_alerts INSERT    → dispatch_count++, accept_rate recalc
--   2. jobs.status POSTED    → CONFIRMED   → confirm_count++
--   3. jobs.status CONFIRMED → ACTIVE      → active_count++,   both rates recalc
--   4. jobs.status ACTIVE    → COMPLETED   → complete_count++, completion_rate recalc
--   5. jobs.status CONFIRMED → POSTED      → ignore_count++    (timeout revert)
--
-- Bridge note:
--   The state machine stores jobs.confirmed_tradesperson_id → company_profiles.id
--   The ranking RPC reads accept_rate / completion_rate from contractor_profiles
--   These two profile types are linked via shared user_id.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  1. Add raw counter columns to contractor_profiles
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.contractor_profiles
  ADD COLUMN IF NOT EXISTS urgent_dispatch_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgent_confirm_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgent_active_count    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgent_complete_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgent_ignore_count    INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.contractor_profiles.urgent_dispatch_count  IS
  '# times the system dispatched this contractor for an urgent job (via select_top_tradespeople_for_urgent_job).';
COMMENT ON COLUMN public.contractor_profiles.urgent_confirm_count   IS
  '# times a homeowner confirmed (selected) this contractor — job moved POSTED→CONFIRMED.';
COMMENT ON COLUMN public.contractor_profiles.urgent_active_count    IS
  '# times contractor accepted within the 15-min window — job moved CONFIRMED→ACTIVE.';
COMMENT ON COLUMN public.contractor_profiles.urgent_complete_count  IS
  '# times a job this contractor was active on reached COMPLETED status.';
COMMENT ON COLUMN public.contractor_profiles.urgent_ignore_count    IS
  '# times contractor timed out in the 15-min window — job reverted CONFIRMED→POSTED.';

DO $$ BEGIN
  RAISE NOTICE '✓ Counter columns added to contractor_profiles';
END; $$;


-- ════════════════════════════════════════════════════════════
--  2. Trigger: urgent_job_dispatch_alerts INSERT
--     → dispatch_count++, accept_rate recalculated
-- ════════════════════════════════════════════════════════════
--
-- The dispatch route (app/api/jobs/[id]/dispatch-urgent) inserts
-- one row per contractor selected by the ranking RPC.
-- contractor_id is a direct foreign key to contractor_profiles.

CREATE OR REPLACE FUNCTION public.trg_fn_dispatch_alert_reliability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only contractor_profiles recipients are ranked; skip others.
  IF NEW.contractor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Increment dispatch_count and recalculate accept_rate in one atomic UPDATE.
  -- accept_rate = active_count / (dispatch_count + 1)
  UPDATE public.contractor_profiles
    SET
      urgent_dispatch_count = urgent_dispatch_count + 1,
      accept_rate = LEAST(1.0, GREATEST(0.0,
        COALESCE(
          urgent_active_count::NUMERIC / NULLIF(urgent_dispatch_count + 1, 0),
          1.0   -- default: no data yet → optimistic 100%
        )
      ))
  WHERE id = NEW.contractor_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_fn_dispatch_alert_reliability() IS
  'AFTER INSERT on urgent_job_dispatch_alerts: increments urgent_dispatch_count '
  'on contractor_profiles and recalculates accept_rate = active / dispatch.';

DROP TRIGGER IF EXISTS trg_dispatch_alert_reliability
  ON public.urgent_job_dispatch_alerts;

CREATE TRIGGER trg_dispatch_alert_reliability
  AFTER INSERT ON public.urgent_job_dispatch_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_dispatch_alert_reliability();

DO $$ BEGIN
  RAISE NOTICE '✓ Dispatch alert reliability trigger created';
END; $$;


-- ════════════════════════════════════════════════════════════
--  3. Trigger: jobs.status transitions
--     → confirm / active / complete / ignore counts updated
-- ════════════════════════════════════════════════════════════
--
-- Transitions:
--   POSTED    → CONFIRMED  confirm_count++  (homeowner picked them)
--   CONFIRMED → ACTIVE     active_count++   (accepted in window) + rate recalc
--   ACTIVE    → COMPLETED  complete_count++ + completion_rate recalc
--   CONFIRMED → POSTED     ignore_count++   (15-min window expired / cron revert)
--
-- Bridge: jobs.confirmed_tradesperson_id → company_profiles.id
--         company_profiles.user_id       → contractor_profiles.user_id
--
-- IMPORTANT: revert_unaccepted_jobs() clears confirmed_tradesperson_id = NULL
-- on the same UPDATE that sets status = POSTED. So for CONFIRMED→POSTED we
-- must read OLD.confirmed_tradesperson_id (already captured before the UPDATE).

CREATE OR REPLACE FUNCTION public.trg_fn_job_status_reliability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status  TEXT;
  v_new_status  TEXT;
  v_cp_id       UUID;   -- company_profiles.id (state machine tradesperson)
  v_cont_id     UUID;   -- contractor_profiles.id (where rates live)
BEGIN
  v_old_status := OLD.status::TEXT;
  v_new_status := NEW.status::TEXT;

  -- ── Guard: only urgent jobs use the state machine ────────────
  IF NOT COALESCE(NEW.is_urgent, OLD.is_urgent, FALSE) THEN
    RETURN NEW;
  END IF;

  -- ── Guard: only the four transitions we care about ───────────
  IF NOT (
    (v_old_status = 'POSTED'    AND v_new_status = 'CONFIRMED') OR
    (v_old_status = 'CONFIRMED' AND v_new_status = 'ACTIVE'   ) OR
    (v_old_status = 'ACTIVE'    AND v_new_status = 'COMPLETED' ) OR
    (v_old_status = 'CONFIRMED' AND v_new_status = 'POSTED'    )
  ) THEN
    RETURN NEW;
  END IF;

  -- ── Resolve which tradesperson this event belongs to ─────────
  -- For CONFIRMED→POSTED (timeout revert), revert_unaccepted_jobs()
  -- sets confirmed_tradesperson_id = NULL on NEW; use OLD instead.
  IF v_old_status = 'CONFIRMED' AND v_new_status = 'POSTED' THEN
    v_cp_id := OLD.confirmed_tradesperson_id;
  ELSE
    v_cp_id := NEW.confirmed_tradesperson_id;
  END IF;

  IF v_cp_id IS NULL THEN
    RETURN NEW;  -- No tradesperson on this row — nothing to track.
  END IF;

  -- ── Bridge: company_profiles → contractor_profiles ───────────
  -- company_profiles and contractor_profiles share the same user_id
  -- when a user has created both profile types.
  SELECT cont.id
    INTO v_cont_id
  FROM public.contractor_profiles cont
  JOIN public.company_profiles    comp ON comp.user_id = cont.user_id
  WHERE comp.id = v_cp_id;

  IF v_cont_id IS NULL THEN
    -- This tradesperson has a company_profile but no contractor_profile.
    -- Skip silently — their reliability stats live elsewhere (if at all).
    RETURN NEW;
  END IF;

  -- ── Apply counter increment + rate recalculation ─────────────

  IF v_old_status = 'POSTED' AND v_new_status = 'CONFIRMED' THEN
    -- Homeowner selected this contractor.
    -- confirm_count is for analytics only; does not affect accept_rate or
    -- completion_rate (those are based on dispatch/active/complete counts).
    UPDATE public.contractor_profiles
      SET urgent_confirm_count = urgent_confirm_count + 1
    WHERE id = v_cont_id;

  ELSIF v_old_status = 'CONFIRMED' AND v_new_status = 'ACTIVE' THEN
    -- Contractor accepted within the 15-minute window.
    -- accept_rate     = (active_count + 1) / dispatch_count
    -- completion_rate = complete_count     / (active_count + 1)
    UPDATE public.contractor_profiles
      SET
        urgent_active_count = urgent_active_count + 1,
        accept_rate = LEAST(1.0, GREATEST(0.0,
          COALESCE(
            (urgent_active_count + 1)::NUMERIC / NULLIF(urgent_dispatch_count, 0),
            1.0
          )
        )),
        completion_rate = LEAST(1.0, GREATEST(0.0,
          COALESCE(
            urgent_complete_count::NUMERIC / NULLIF(urgent_active_count + 1, 0),
            1.0
          )
        ))
    WHERE id = v_cont_id;

  ELSIF v_old_status = 'ACTIVE' AND v_new_status = 'COMPLETED' THEN
    -- Job completed successfully.
    -- completion_rate = (complete_count + 1) / active_count
    UPDATE public.contractor_profiles
      SET
        urgent_complete_count = urgent_complete_count + 1,
        completion_rate = LEAST(1.0, GREATEST(0.0,
          COALESCE(
            (urgent_complete_count + 1)::NUMERIC / NULLIF(urgent_active_count, 0),
            1.0
          )
        ))
    WHERE id = v_cont_id;

  ELSIF v_old_status = 'CONFIRMED' AND v_new_status = 'POSTED' THEN
    -- 15-minute window expired — contractor timed out / ignored.
    -- ignore_count is for analytics; the lower accept_rate emerges naturally
    -- from: more dispatches, fewer actives → accept_rate drops over time.
    UPDATE public.contractor_profiles
      SET urgent_ignore_count = urgent_ignore_count + 1
    WHERE id = v_cont_id;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_fn_job_status_reliability() IS
  'AFTER UPDATE OF status on jobs: increments the appropriate reliability counter '
  'on contractor_profiles and recalculates accept_rate / completion_rate. '
  'Handles POSTED→CONFIRMED (confirm), CONFIRMED→ACTIVE (accept), '
  'ACTIVE→COMPLETED (complete), CONFIRMED→POSTED (ignore / 15-min timeout). '
  'Bridges jobs.confirmed_tradesperson_id (company_profiles) → contractor_profiles '
  'via shared user_id.';

DROP TRIGGER IF EXISTS trg_job_status_reliability
  ON public.jobs;

CREATE TRIGGER trg_job_status_reliability
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trg_fn_job_status_reliability();

DO $$ BEGIN
  RAISE NOTICE '✓ Job status reliability trigger created';
END; $$;


-- ════════════════════════════════════════════════════════════
--  4. Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_col_dispatch   BOOLEAN;
  v_col_confirm    BOOLEAN;
  v_col_active     BOOLEAN;
  v_col_complete   BOOLEAN;
  v_col_ignore     BOOLEAN;
  v_fn_dispatch    BOOLEAN;
  v_fn_job         BOOLEAN;
  v_trg_dispatch   BOOLEAN;
  v_trg_job        BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contractor_profiles' AND column_name = 'urgent_dispatch_count') INTO v_col_dispatch;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contractor_profiles' AND column_name = 'urgent_confirm_count')  INTO v_col_confirm;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contractor_profiles' AND column_name = 'urgent_active_count')   INTO v_col_active;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contractor_profiles' AND column_name = 'urgent_complete_count') INTO v_col_complete;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contractor_profiles' AND column_name = 'urgent_ignore_count')   INTO v_col_ignore;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'trg_fn_dispatch_alert_reliability' AND n.nspname = 'public'
  ) INTO v_fn_dispatch;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'trg_fn_job_status_reliability' AND n.nspname = 'public'
  ) INTO v_fn_job;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trg_dispatch_alert_reliability'
      AND c.relname = 'urgent_job_dispatch_alerts'
      AND n.nspname = 'public'
  ) INTO v_trg_dispatch;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trg_job_status_reliability'
      AND c.relname = 'jobs'
      AND n.nspname = 'public'
  ) INTO v_trg_job;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Migration 000011 — Reliability Auto-Update Engine';
  RAISE NOTICE '';
  RAISE NOTICE '  Counter columns (contractor_profiles):';
  RAISE NOTICE '    urgent_dispatch_count  : %', CASE WHEN v_col_dispatch  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '    urgent_confirm_count   : %', CASE WHEN v_col_confirm   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '    urgent_active_count    : %', CASE WHEN v_col_active    THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '    urgent_complete_count  : %', CASE WHEN v_col_complete  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '    urgent_ignore_count    : %', CASE WHEN v_col_ignore    THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '  Trigger functions:';
  RAISE NOTICE '    trg_fn_dispatch_alert_reliability() : %', CASE WHEN v_fn_dispatch THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '    trg_fn_job_status_reliability()     : %', CASE WHEN v_fn_job      THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '  Triggers:';
  RAISE NOTICE '    trg_dispatch_alert_reliability (urgent_job_dispatch_alerts) : %', CASE WHEN v_trg_dispatch THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '    trg_job_status_reliability     (jobs)                       : %', CASE WHEN v_trg_job     THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (
    v_col_dispatch AND v_col_confirm AND v_col_active AND v_col_complete AND v_col_ignore
    AND v_fn_dispatch AND v_fn_job
    AND v_trg_dispatch AND v_trg_job
  ) THEN
    RAISE EXCEPTION 'Migration 000011 verification failed — check NOTICE output above';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Reliability auto-update engine is live.';
  RAISE NOTICE '';
  RAISE NOTICE 'Event → counter → rates affected:';
  RAISE NOTICE '  dispatch alert INSERT          → dispatch_count++   | accept_rate recalc';
  RAISE NOTICE '  POSTED    → CONFIRMED          → confirm_count++    | (analytics only)';
  RAISE NOTICE '  CONFIRMED → ACTIVE             → active_count++     | accept_rate + completion_rate recalc';
  RAISE NOTICE '  ACTIVE    → COMPLETED          → complete_count++   | completion_rate recalc';
  RAISE NOTICE '  CONFIRMED → POSTED (timeout)   → ignore_count++     | (analytics only; accept_rate degrades naturally)';
  RAISE NOTICE '';
  RAISE NOTICE 'Formulas:';
  RAISE NOTICE '  accept_rate     = urgent_active_count  / urgent_dispatch_count  [0.0 – 1.0, default 1.0]';
  RAISE NOTICE '  completion_rate = urgent_complete_count / urgent_active_count   [0.0 – 1.0, default 1.0]';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
