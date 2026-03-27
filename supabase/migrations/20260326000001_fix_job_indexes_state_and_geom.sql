-- ============================================================
-- Fix: Job indexes, advance_job_state(), geom backfill
-- ============================================================
--
-- Problems fixed:
--
--   1. Stale partial indexes use WHERE status = 'open' — never
--      matched by queries that filter status = 'POSTED'.
--      Result: every search does a full table scan → 10s timeout.
--
--   2. advance_job_state() uses invalid application_status enum
--      values ('REJECTED', 'DECLINED', 'waiting_optional') →
--      22P02 on every poll, silently swallowed, state never advances.
--
--   3. mark_applications_waiting_optional() writes 'waiting_optional'
--      which is not in the application_status enum → 22P02.
--      Function is dropped entirely.
--
--   4. company_profiles.geom may be NULL for profiles inserted before
--      the geom-sync trigger was created → select_top_tradespeople_for_urgent_job
--      finds 0 candidates → no push dispatches.
--
-- ============================================================


-- ── 1. Drop stale partial indexes ────────────────────────────
-- These were created with WHERE status = 'open' (pre-state-machine).
-- All queries now use status = 'POSTED' so these are never hit.

DROP INDEX IF EXISTS public.idx_jobs_search_base;
DROP INDEX IF EXISTS public.idx_jobs_vacancies_common;
DROP INDEX IF EXISTS public.idx_jobs_trades_common;

DO $$ BEGIN RAISE NOTICE '✓ Stale partial indexes dropped'; END; $$;


-- ── 2. Create corrected partial indexes ──────────────────────
-- Match the actual query predicate: status = 'POSTED', is_active = true

-- Base composite (covers both vacancies and trade-job queries)
CREATE INDEX IF NOT EXISTS idx_jobs_search_posted
  ON public.jobs (status, is_active, is_tradespeople_job)
  WHERE status = 'POSTED' AND is_active = true;

-- Trade-job specific (jobs_tasks tab — includes expires_at for the OR filter)
CREATE INDEX IF NOT EXISTS idx_jobs_trades_posted
  ON public.jobs (status, is_active, is_tradespeople_job, expires_at)
  WHERE status = 'POSTED' AND is_active = true AND is_tradespeople_job = true;

-- Vacancy specific
CREATE INDEX IF NOT EXISTS idx_jobs_vacancies_posted
  ON public.jobs (status, is_active, is_tradespeople_job)
  WHERE status = 'POSTED' AND is_active = true AND is_tradespeople_job = false;

-- Spatial: only rows with coordinates (used by bounding-box filter)
CREATE INDEX IF NOT EXISTS idx_jobs_latlon
  ON public.jobs (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

DO $$ BEGIN RAISE NOTICE '✓ Corrected partial indexes created'; END; $$;


-- ── 3. Fix advance_job_state() ────────────────────────────────
-- Remove invalid enum values ('REJECTED', 'DECLINED', 'waiting_optional').
-- Valid application_status values: PENDING, WITHDRAWN, AUTO_CANCELLED, EXPIRED.
-- Active applications are those still PENDING.
-- State transition: searching → pending_homeowner when ≥1 PENDING app exists.
-- State transition: expired with 0 PENDING apps → no_matches.

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
  IF v_state IN ('in_progress', 'completed', 'no_matches') THEN
    RETURN v_state;
  END IF;

  -- Count active (PENDING) applications
  SELECT COUNT(*) INTO v_app_cnt
    FROM public.job_applications
   WHERE job_id = p_job_id
     AND status = 'PENDING'::application_status;

  -- Expired with no active apps → no_matches
  IF v_expires IS NOT NULL AND NOW() > v_expires AND v_app_cnt = 0 THEN
    UPDATE public.jobs SET job_state = 'no_matches' WHERE id = p_job_id;
    RETURN 'no_matches';
  END IF;

  -- Has at least 1 PENDING application → move to pending_homeowner
  IF v_app_cnt > 0 AND v_state = 'searching' THEN
    UPDATE public.jobs SET job_state = 'pending_homeowner' WHERE id = p_job_id;
    RETURN 'pending_homeowner';
  END IF;

  RETURN COALESCE(v_state, 'searching');
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_job_state(UUID)
  TO service_role, authenticated;

DO $$ BEGIN RAISE NOTICE '✓ advance_job_state() fixed (valid enum values only)'; END; $$;


-- ── 4. Drop mark_applications_waiting_optional() ─────────────
-- This function wrote 'waiting_optional' which is not in the
-- application_status enum, causing 22P02 errors.
-- It is no longer called anywhere — safe to drop.

DROP FUNCTION IF EXISTS public.mark_applications_waiting_optional(UUID);

DO $$ BEGIN RAISE NOTICE '✓ mark_applications_waiting_optional() dropped'; END; $$;


-- ── 5. Backfill company_profiles.geom ────────────────────────
-- Profiles inserted before the geom-sync trigger was added may
-- have lat/lng but no geom. select_top_tradespeople_for_urgent_job
-- requires geom IS NOT NULL, so missing geom = 0 dispatch candidates.

UPDATE public.company_profiles
SET    geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE  latitude  IS NOT NULL
  AND  longitude IS NOT NULL
  AND  geom      IS NULL;

DO $$ BEGIN
  RAISE NOTICE '✓ company_profiles.geom backfilled for lat/lng rows missing geom';
END; $$;


-- ── 6. Summary ───────────────────────────────────────────────
DO $$
DECLARE
  v_idx_posted  BOOL;
  v_idx_trades  BOOL;
  v_idx_latlon  BOOL;
  v_fn_advance  BOOL;
  v_missing_geom INT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_search_posted')    INTO v_idx_posted;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_trades_posted')    INTO v_idx_trades;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_latlon')           INTO v_idx_latlon;
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'advance_job_state')                      INTO v_fn_advance;
  SELECT COUNT(*) INTO v_missing_geom
    FROM public.company_profiles
   WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

  RAISE NOTICE '=== Fix: Job Indexes + State Functions ===';
  RAISE NOTICE '  idx_jobs_search_posted : %', CASE WHEN v_idx_posted THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  idx_jobs_trades_posted : %', CASE WHEN v_idx_trades THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  idx_jobs_latlon        : %', CASE WHEN v_idx_latlon THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  advance_job_state()    : %', CASE WHEN v_fn_advance THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  company_profiles missing geom after backfill: %', v_missing_geom;
END;
$$;
