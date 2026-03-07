-- ============================================================
-- Migration: Fix ranking query plan — guarantee GIST index use
-- ============================================================
--
-- Two problems addressed:
--
-- A. Planner statistics on geom are too coarse (default target=100)
--    → planner underestimates spatial selectivity
--    → may choose Seq Scan when table has few rows or patchy data
--    Fix: raise statistics_target to 500 on geom, 200 on avg_rating
--
-- B. random() in the `scored` CTE creates a VOLATILE dependency
--    that can prevent PostgreSQL from inlining the `candidates` CTE.
--    If `candidates` is materialised (PostgreSQL <12 or forced), the
--    inner ST_DWithin predicate is no longer visible to the planner
--    at index-selection time → Seq Scan.
--    Fix: move random() OUTSIDE the CTE chain entirely.
--    The candidates CTE becomes pure STABLE → always inlined →
--    ST_DWithin is always index-sargable.
--
-- Result: guaranteed plan shape =
--   Limit → Sort → Bitmap Heap Scan (or Index Scan) via idx_cp_geom_eligible
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  A. Boost planner statistics on spatial & ranking columns
-- ════════════════════════════════════════════════════════════

-- geom: PostGIS geometry/geography needs more histogram buckets
-- to estimate spatial selectivity accurately.
-- 500 = 5× default; recommended by PostGIS documentation for
-- tables used in heavy spatial queries.
ALTER TABLE public.contractor_profiles
  ALTER COLUMN geom            SET STATISTICS 500;

-- average_rating: used in ORDER-BY scoring; more buckets help
-- cost estimates for range predicates (reviews_count >= 3).
ALTER TABLE public.contractor_profiles
  ALTER COLUMN average_rating  SET STATISTICS 200;

-- Re-analyse with the new targets so the planner picks them up
-- immediately (without waiting for autovacuum).
ANALYZE public.contractor_profiles;

DO $$ BEGIN
  RAISE NOTICE '✓ Statistics targets updated and ANALYZE complete';
END; $$;


-- ════════════════════════════════════════════════════════════
--  B. Rewrite RPC — isolate random() from the candidate CTEs
-- ════════════════════════════════════════════════════════════
--
-- Before (problem):
--   WITH candidates AS (... ST_DWithin ...)    -- STABLE
--        scored     AS (... random()   ...)    -- VOLATILE ← poisons candidates
--   SELECT ... ORDER BY total_score DESC LIMIT 5
--
-- PostgreSQL may materialise `candidates` because the CTE tree
-- contains at least one VOLATILE expression (random()), even though
-- random() is only in `scored`.
--
-- After (fix):
--   WITH candidates AS (... ST_DWithin ...)    -- STABLE, always inlined
--   SELECT
--     tradesperson_id,
--     (<stable score expr> + random() * 5) AS total_score  ← random() in SELECT
--   FROM candidates
--   ORDER BY total_score DESC
--   LIMIT 5
--
-- The CTE chain is now purely STABLE → the planner inlines it and
-- sees ST_DWithin directly → uses idx_cp_geom_eligible.
-- random() lives in the top-level SELECT, evaluated AFTER the filter.
-- ============================================================

CREATE OR REPLACE FUNCTION public.select_top_tradespeople_for_urgent_job(
  p_job_id UUID
)
RETURNS TABLE (
  tradesperson_id UUID,
  total_score     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_location geography(Point, 4326);
  v_language     TEXT;
BEGIN

  -- ── Validate job ─────────────────────────────────────────────
  SELECT
    ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
    j.preferred_language
  INTO
    v_job_location,
    v_language
  FROM public.jobs j
  WHERE j.id             = p_job_id
    AND j.status         = 'POSTED'
    AND j.is_urgent      = true
    AND j.latitude       IS NOT NULL
    AND j.longitude      IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Invalid job for dispatch: job % must exist, status=POSTED, '
      'is_urgent=true, and have coordinates set.',
      p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Ranked top-5 ─────────────────────────────────────────────
  --
  -- KEY CHANGE: random() is in the top-level SELECT, NOT inside a CTE.
  -- This keeps the `candidates` CTE purely STABLE so PostgreSQL will
  -- always inline it, keeping ST_DWithin visible to the index planner.
  --
  -- Expected plan:
  --   Limit
  --     -> Sort (total_score DESC)
  --          -> Result (random() added here, after spatial filter)
  --               -> Bitmap Heap Scan on contractor_profiles
  --                    -> Bitmap Index Scan on idx_cp_geom_eligible
  --                         Index Cond: (geom && <bbox of v_job_location+20km>)

  RETURN QUERY
  WITH candidates AS (
    SELECT
      cp.id                                                          AS tradesperson_id,
      ST_Distance(cp.geom, v_job_location) / 1000.0                 AS distance_km,

      CASE
        WHEN v_language IS NOT NULL
         AND v_language = ANY(cp.languages) THEN 100
        ELSE 0
      END::NUMERIC                                                   AS language_score,

      CASE
        WHEN cp.reviews_count >= 3
          THEN (cp.average_rating / 5.0) * 100
        ELSE 70
      END::NUMERIC                                                   AS rating_score,

      (
        (COALESCE(cp.accept_rate,     1.0) * 0.5) +
        (COALESCE(cp.completion_rate, 1.0) * 0.5)
      ) * 100                                                        AS reliability_score

    FROM public.contractor_profiles cp
    WHERE cp.available_247  = true
      AND cp.geom            IS NOT NULL
      AND ST_DWithin(
            cp.geom,
            v_job_location,
            20000             -- 20 km radius (metres)
          )
  )
  SELECT
    c.tradesperson_id,
    (
      -- Stable weighted score (computed first — no volatility here)
      GREATEST(0, 100 - (c.distance_km  * 5))  * 0.40
      + c.language_score                         * 0.25
      + c.rating_score                           * 0.25
      + c.reliability_score                      * 0.10
      -- Anti-starvation tiebreaker added LAST — random() stays out of CTEs
      + (random() * 5)
    )::NUMERIC(8,4)                                                  AS total_score
  FROM   candidates c
  ORDER  BY total_score DESC
  LIMIT  5;

END;
$$;

COMMENT ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID) IS
  'Scores all available contractors within 20 km of the given urgent POSTED '
  'job and returns the top 5 by weighted score. '
  'Weights: 40%% distance, 25%% language, 25%% rating, 10%% reliability, +5 random. '
  'random() is placed in the top-level SELECT (not a CTE) so the candidates CTE '
  'remains STABLE and ST_DWithin is always index-sargable via idx_cp_geom_eligible.';

GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID)
  TO service_role;

DO $$ BEGIN
  RAISE NOTICE '✓ select_top_tradespeople_for_urgent_job() rewritten — random() moved out of CTE';
END; $$;


-- ════════════════════════════════════════════════════════════
--  Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_geom_stats    INTEGER;
  v_rating_stats  INTEGER;
  v_fn_exists     BOOLEAN;
  v_idx_eligible  BOOLEAN;
BEGIN
  SELECT CASE WHEN attstattarget = -1 THEN 100 ELSE attstattarget END
  INTO   v_geom_stats
  FROM   pg_attribute
  WHERE  attrelid  = 'public.contractor_profiles'::regclass
    AND  attname   = 'geom';

  SELECT CASE WHEN attstattarget = -1 THEN 100 ELSE attstattarget END
  INTO   v_rating_stats
  FROM   pg_attribute
  WHERE  attrelid  = 'public.contractor_profiles'::regclass
    AND  attname   = 'average_rating';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'select_top_tradespeople_for_urgent_job'
      AND n.nspname = 'public'
  ) INTO v_fn_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'contractor_profiles'
      AND indexname  = 'idx_cp_geom_eligible'
  ) INTO v_idx_eligible;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Migration 000010 — Query Plan Fix';
  RAISE NOTICE '  geom statistics_target (want 500) : %', v_geom_stats;
  RAISE NOTICE '  avg_rating statistics_target (200) : %', v_rating_stats;
  RAISE NOTICE '  RPC function exists                : %', CASE WHEN v_fn_exists    THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  idx_cp_geom_eligible GIST index    : %', CASE WHEN v_idx_eligible THEN '✓' ELSE '✗' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_geom_stats >= 500 AND v_rating_stats >= 200 AND v_fn_exists AND v_idx_eligible) THEN
    RAISE EXCEPTION 'Migration 000010 verification failed — check output above';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Query plan fix applied.';
  RAISE NOTICE '';
  RAISE NOTICE 'Verify in SQL editor (supabase/diagnostics/ranking-query-plan.sql):';
  RAISE NOTICE '  1. Find a POSTED urgent job ID';
  RAISE NOTICE '  2. Run the EXPLAIN block with its lat/lon substituted';
  RAISE NOTICE '  3. Confirm plan shows Bitmap Index Scan on idx_cp_geom_eligible';
  RAISE NOTICE '  4. Confirm NO "Seq Scan on contractor_profiles"';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
