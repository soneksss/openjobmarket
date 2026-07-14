-- ============================================================================
-- Migration: Urgent dispatch — new radius tiers + instant-skip-empty expansion
-- ============================================================================
-- Replaces the old continuous-range expansion (start 3mi, +3mi steps or jump
-- to 10mi on 0 supply, cap 25mi, variable 15/30 min waits) with a fixed,
-- Uber-style tier ladder: 0.5 → 1 → 2 → 3 → 10 miles.
--
-- Two behaviours change:
--   1. On EVERY expansion call (not just initial dispatch), if the next tier
--      has zero supply, keep walking forward through further tiers within
--      the SAME call rather than waiting for the next cron tick at each
--      empty tier — e.g. nobody at 500m but people at 5mi notifies at 5mi
--      immediately, not after three more 2-minute cron cycles of finding
--      nothing at 1mi/2mi/3mi.
--   2. Expansion timing is now uniform ~2 minutes per tier (next_expand_at =
--      NOW() + 2 min), matching the new pg_cron cadence (see the scheduler
--      migration) instead of the old variable 15/30 minute waits.
--
-- NOTE: jobs.dispatch_radius_miles and jobs.search_radius_miles are two
-- pre-existing, separately-maintained radius columns (dispatch_radius_miles
-- feeds the dispatch/cron internals; search_radius_miles is what the
-- homeowner-facing live-search poll — GET /api/jobs/[id]/urgent-responses —
-- reads and displays). Both are kept in sync here to avoid changing either
-- code path's behaviour; unifying them into one column is a separate,
-- larger cleanup outside this migration's scope.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expand_job_search(
  p_job_id UUID
)
RETURNS TABLE (
  company_id  UUID,
  radius_used NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tiers          CONSTANT NUMERIC[] := ARRAY[0.5, 1, 2, 3, 10];
  v_current_radius NUMERIC;
  v_current_idx    INT;
  v_new_idx        INT;
  v_new_radius     NUMERIC;
  v_nearby_count   INT;
  v_search_state   TEXT;
  v_job_status     TEXT;
  v_next_expand    TIMESTAMPTZ;
BEGIN

  -- ── Validate job ──────────────────────────────────────────
  SELECT COALESCE(j.dispatch_radius_miles, j.search_radius_miles), j.status::TEXT
  INTO v_current_radius, v_job_status
  FROM public.jobs j
  WHERE j.id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expand_job_search: job % not found', p_job_id;
  END IF;

  IF v_job_status NOT IN ('POSTED', 'ACTIVE') THEN RETURN; END IF;

  -- Snap the stored radius onto the tier ladder (handles legacy values from
  -- before this migration, e.g. an old job sitting at 3mi from the previous
  -- 3/5/10 scheme — treated as tier index for "3").
  v_current_idx := COALESCE(array_position(v_tiers, v_current_radius), 1);

  -- Already at max tier — nothing further to expand to.
  IF v_current_idx >= array_length(v_tiers, 1) THEN
    UPDATE public.jobs SET next_expand_at = NULL WHERE id = p_job_id;
    RETURN;
  END IF;

  -- ── Walk forward through tiers, skipping empty ones within this same call ──
  v_new_idx := v_current_idx;
  LOOP
    v_new_idx := v_new_idx + 1;
    v_nearby_count := public.count_nearby_opted_in_trades(p_job_id, v_tiers[v_new_idx]);
    EXIT WHEN v_nearby_count > 0 OR v_new_idx >= array_length(v_tiers, 1);
  END LOOP;

  v_new_radius := v_tiers[v_new_idx];

  -- ── Timing: uniform ~2min per tier, matching the pg_cron cadence ─────────
  v_next_expand := CASE
    WHEN v_new_idx < array_length(v_tiers, 1) THEN NOW() + INTERVAL '2 minutes'
    ELSE NULL   -- at max tier → no further expansion
  END;

  v_search_state := CASE
    WHEN v_new_idx >= array_length(v_tiers, 1) THEN 'fallback'
    ELSE 'active_search'
  END;

  -- ── Get unnotified candidates at the chosen tier ─────────────────────────
  CREATE TEMP TABLE _new_candidates ON COMMIT DROP AS
  SELECT g.company_id
  FROM public.get_unnotified_trades_for_job(p_job_id, v_new_radius, 10) g;

  -- ── Record in job_notifications_sent (dedup for future expansions) ──────
  INSERT INTO public.job_notifications_sent (job_id, company_id, radius_at_time)
  SELECT p_job_id, nc.company_id, v_new_radius
  FROM _new_candidates nc
  ON CONFLICT (job_id, company_id) DO NOTHING;

  -- ── Update jobs (both radius columns — see note above) ──────────────────
  UPDATE public.jobs
  SET
    dispatch_radius_miles = v_new_radius,
    search_radius_miles   = v_new_radius,
    search_state          = v_search_state,
    next_expand_at         = v_next_expand
  WHERE id = p_job_id;

  RAISE NOTICE 'expand_job_search: job=% radius %→%mi state=% next_expand=%',
    p_job_id, v_current_radius, v_new_radius, v_search_state, v_next_expand;

  RETURN QUERY
  SELECT nc.company_id, v_new_radius
  FROM _new_candidates nc;

END;
$$;

GRANT EXECUTE ON FUNCTION public.expand_job_search(UUID) TO service_role;

-- New jobs start at the first (tightest) tier.
ALTER TABLE public.jobs
  ALTER COLUMN dispatch_radius_miles SET DEFAULT 0.5;

DO $$ BEGIN RAISE NOTICE '✅ Migration 20260715000007 (radius tiers rework) complete'; END; $$;
