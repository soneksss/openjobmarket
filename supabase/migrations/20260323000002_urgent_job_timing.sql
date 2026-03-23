-- ============================================================
-- Urgent Job Timing + Smart Response Flow
-- ============================================================
-- Adds soft timing system with no hard cutoff:
--   1. search_started_at  — when ASAP search began
--   2. homeowner_last_activity — tracks homeowner engagement
--   3. job_state          — rich state machine for UI logic
--   4. advance_job_state() — transition engine (safe to call on every poll)
--   5. mark_applications_waiting_optional() — gives tradespeople freedom after 15 min
-- ============================================================

-- ── 1. Add columns ───────────────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS search_started_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS homeowner_last_activity TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS job_state               TEXT DEFAULT 'searching';

-- Backfill search_started_at for existing ASAP jobs
UPDATE public.jobs
SET search_started_at = created_at
WHERE urgency_type = 'asap'
  AND search_started_at IS NULL
  AND created_at IS NOT NULL;

DO $$ BEGIN RAISE NOTICE '✓ job timing columns added'; END; $$;


-- ── 2. advance_job_state() ───────────────────────────────────
-- Safe to call on every poll. Transitions:
--   searching         → pending_homeowner (first application arrives)
--   searching         → no_matches       (expired with 0 apps)
--   pending_homeowner → pending_homeowner (stays until homeowner acts)
--   in_progress / completed              (terminal — never touched)
--
-- Returns the current (possibly updated) job_state text.

CREATE OR REPLACE FUNCTION public.advance_job_state(p_job_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state    TEXT;
  v_expires  TIMESTAMPTZ;
  v_app_cnt  INT;
BEGIN
  SELECT job_state, expires_at
    INTO v_state, v_expires
    FROM public.jobs
   WHERE id = p_job_id;

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Terminal states — never override
  IF v_state IN ('in_progress', 'completed') THEN
    RETURN v_state;
  END IF;

  -- Count non-cancelled applications
  SELECT COUNT(*) INTO v_app_cnt
    FROM public.job_applications
   WHERE job_id  = p_job_id
     AND status NOT IN ('AUTO_CANCELLED', 'REJECTED', 'DECLINED', 'waiting_optional');

  -- Include waiting_optional in total so the search stops at 3 total
  IF v_app_cnt = 0 THEN
    SELECT COUNT(*) INTO v_app_cnt
      FROM public.job_applications
     WHERE job_id = p_job_id
       AND status NOT IN ('AUTO_CANCELLED', 'REJECTED', 'DECLINED');
  END IF;

  -- Expired with no apps → no_matches
  IF v_expires IS NOT NULL AND NOW() > v_expires AND v_app_cnt = 0 THEN
    UPDATE public.jobs SET job_state = 'no_matches' WHERE id = p_job_id;
    RETURN 'no_matches';
  END IF;

  -- Has at least 1 application → move to pending_homeowner
  IF v_app_cnt > 0 AND v_state = 'searching' THEN
    UPDATE public.jobs SET job_state = 'pending_homeowner' WHERE id = p_job_id;
    RETURN 'pending_homeowner';
  END IF;

  RETURN COALESCE(v_state, 'searching');
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_job_state(UUID)
  TO service_role, authenticated;

DO $$ BEGIN RAISE NOTICE '✓ advance_job_state() created'; END; $$;


-- ── 3. mark_applications_waiting_optional() ──────────────────
-- After 15 minutes a tradesperson's PENDING application becomes
-- "waiting_optional" — they are still in the pool but free to
-- take other jobs without guilt.
-- The homeowner still sees them; it just unlocks their schedule.

CREATE OR REPLACE FUNCTION public.mark_applications_waiting_optional(p_job_id UUID)
RETURNS INT   -- number of rows updated
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.job_applications
     SET status = 'waiting_optional'
   WHERE job_id    = p_job_id
     AND status    = 'PENDING'
     AND created_at < NOW() - INTERVAL '15 minutes'
  RETURNING 1;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_applications_waiting_optional(UUID)
  TO service_role, authenticated;

DO $$ BEGIN RAISE NOTICE '✓ mark_applications_waiting_optional() created'; END; $$;


-- ── 4. Summary ───────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=== Urgent Job Timing v1 ===';
  RAISE NOTICE '  search_started_at column      : ✓';
  RAISE NOTICE '  homeowner_last_activity column : ✓';
  RAISE NOTICE '  job_state column               : ✓';
  RAISE NOTICE '  advance_job_state()            : ✓';
  RAISE NOTICE '  mark_applications_waiting_optional() : ✓';
  RAISE NOTICE '';
  RAISE NOTICE 'job_state values:';
  RAISE NOTICE '  searching         — initial state, no applications yet';
  RAISE NOTICE '  pending_homeowner — >=1 application received';
  RAISE NOTICE '  in_progress       — homeowner confirmed a tradesperson';
  RAISE NOTICE '  completed         — job done';
  RAISE NOTICE '  no_matches        — expired with 0 applications';
END;
$$;
