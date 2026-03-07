-- ============================================================
-- Migration: Step 6 — Performance indexes for urgent-job ranking
-- ============================================================
--
-- Spec calls for:
--   create index on profiles using gist(location)
--   create index on profiles(availability)
--   create index on profiles(avg_rating)
--
-- Mapped to actual schema (contractor_profiles):
--
--   Spec column          Actual column        Index              Status
--   ─────────────────── ──────────────────── ────────────────── ──────────
--   location (GIST)    → geom geography      idx_cp_geom        ✓ Step 2
--                                            idx_cp_geom_eligible ✓ Step 2
--   availability       → available_247       idx_cp_available_247 ✓ mig-002
--   avg_rating         → average_rating      idx_cp_avg_rating  ✗ NEW
--   (rating threshold) → reviews_count       idx_cp_reviews_count ✗ NEW
--   accept_rate        → accept_rate         idx_cp_accept_rate ✓ Step 1
--   completion_rate    → completion_rate     idx_cp_completion_rate ✓ Step 1
--   all (composite)    → all above           idx_cp_ranking_eligible ✓ Step 1
--
-- This migration adds the two missing indexes and
-- re-declares every other index as IF NOT EXISTS (idempotent).
-- Ends with ANALYZE to refresh planner statistics.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  1. GIST on geom — spatial filter (Step 2, idempotent)
-- ════════════════════════════════════════════════════════════

-- Full GIST — used by any geospatial query on this table
CREATE INDEX IF NOT EXISTS idx_cp_geom
  ON public.contractor_profiles
  USING GIST (geom);

-- Partial GIST — used by the ranking RPC hot path
-- Planner will prefer this narrower index when the WHERE clause matches
CREATE INDEX IF NOT EXISTS idx_cp_geom_eligible
  ON public.contractor_profiles
  USING GIST (geom)
  WHERE geom         IS NOT NULL
    AND available_247 = true;


-- ════════════════════════════════════════════════════════════
--  2. B-tree on available_247 — availability filter (idempotent)
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_contractor_profiles_available_247
  ON public.contractor_profiles (available_247)
  WHERE available_247 = true;


-- ════════════════════════════════════════════════════════════
--  3. B-tree on average_rating — NEW
--     Used by:
--       a) ORDER BY score (indirectly, via rating component)
--       b) Future admin "top-rated" queries
--     Partial: only eligible candidates (available + has location)
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_cp_avg_rating
  ON public.contractor_profiles (average_rating DESC)
  WHERE available_247  = true
    AND geom           IS NOT NULL;


-- ════════════════════════════════════════════════════════════
--  4. B-tree on reviews_count — NEW
--     Used by the rating branch in the ranking CTE:
--       CASE WHEN reviews_count >= 3 THEN ... ELSE 70 END
--     Partial: same eligibility predicate as avg_rating
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_cp_reviews_count
  ON public.contractor_profiles (reviews_count)
  WHERE available_247  = true
    AND geom           IS NOT NULL;


-- ════════════════════════════════════════════════════════════
--  5. B-tree on accept_rate / completion_rate (Step 1, idempotent)
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_cp_accept_rate
  ON public.contractor_profiles (accept_rate)
  WHERE available_247 = true AND latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cp_completion_rate
  ON public.contractor_profiles (completion_rate)
  WHERE available_247 = true AND latitude IS NOT NULL;


-- ════════════════════════════════════════════════════════════
--  6. Composite covering index (Step 1, idempotent)
--     Covers the full ranking-eligible filter in a single scan.
--     The planner can satisfy average_rating, accept_rate, and
--     completion_rate reads from this index alone (index-only scan).
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_cp_ranking_eligible
  ON public.contractor_profiles (
    available_247,
    latitude,
    longitude,
    average_rating,
    accept_rate,
    completion_rate
  )
  WHERE available_247 = true
    AND latitude  IS NOT NULL
    AND longitude IS NOT NULL;


-- ════════════════════════════════════════════════════════════
--  7. ANALYZE — refresh planner statistics
--     After adding new indexes the planner needs fresh stats
--     to choose the right access path for the ranking query.
-- ════════════════════════════════════════════════════════════

ANALYZE public.contractor_profiles;

DO $$ BEGIN
  RAISE NOTICE '✓ ANALYZE complete — planner statistics refreshed';
END; $$;


-- ════════════════════════════════════════════════════════════
--  Verification — complete index audit
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_geom_full        BOOLEAN;
  v_geom_eligible    BOOLEAN;
  v_availability     BOOLEAN;
  v_avg_rating       BOOLEAN;  -- NEW
  v_reviews_count    BOOLEAN;  -- NEW
  v_accept_rate      BOOLEAN;
  v_completion_rate  BOOLEAN;
  v_composite        BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'contractor_profiles' AND indexname = 'idx_cp_geom')              INTO v_geom_full;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'contractor_profiles' AND indexname = 'idx_cp_geom_eligible')     INTO v_geom_eligible;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'contractor_profiles' AND indexname = 'idx_contractor_profiles_available_247') INTO v_availability;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'contractor_profiles' AND indexname = 'idx_cp_avg_rating')        INTO v_avg_rating;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'contractor_profiles' AND indexname = 'idx_cp_reviews_count')     INTO v_reviews_count;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'contractor_profiles' AND indexname = 'idx_cp_accept_rate')       INTO v_accept_rate;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'contractor_profiles' AND indexname = 'idx_cp_completion_rate')   INTO v_completion_rate;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'contractor_profiles' AND indexname = 'idx_cp_ranking_eligible')  INTO v_composite;

  RAISE NOTICE '─────────────────────────────────────────────────────────────────';
  RAISE NOTICE 'Step 6 — Ranking Index Audit (contractor_profiles)';
  RAISE NOTICE '';
  RAISE NOTICE '  Spec: location  → idx_cp_geom (GIST full)           : %', CASE WHEN v_geom_full       THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  Spec: location  → idx_cp_geom_eligible (GIST part.) : %', CASE WHEN v_geom_eligible   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  Spec: avail.    → idx_contractor_profiles_avail_247 : %', CASE WHEN v_availability    THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  Spec: avg_rating→ idx_cp_avg_rating           [NEW] : %', CASE WHEN v_avg_rating      THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  Internal        → idx_cp_reviews_count         [NEW] : %', CASE WHEN v_reviews_count  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  Internal        → idx_cp_accept_rate                 : %', CASE WHEN v_accept_rate    THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  Internal        → idx_cp_completion_rate             : %', CASE WHEN v_completion_rate THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  Composite       → idx_cp_ranking_eligible            : %', CASE WHEN v_composite      THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '';

  IF NOT (v_geom_full AND v_geom_eligible AND v_availability
       AND v_avg_rating AND v_reviews_count
       AND v_accept_rate AND v_completion_rate AND v_composite) THEN
    RAISE EXCEPTION 'Step 6 verification failed — one or more indexes missing';
  END IF;

  RAISE NOTICE '✅ Step 6 complete — all ranking indexes present';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE ' FULL SYSTEM READY — urgent job ranking pipeline:';
  RAISE NOTICE '';
  RAISE NOTICE '  Step 1  contractor_profiles columns  accept_rate, completion_rate';
  RAISE NOTICE '  Step 2  PostGIS + geom column + ST_DWithin candidate query';
  RAISE NOTICE '  Step 3  select_top_tradespeople_for_urgent_job() RPC';
  RAISE NOTICE '          Weights: 40%% dist · 25%% lang · 25%% rating · 10%% reliability';
  RAISE NOTICE '  Step 4  /api/jobs/[id]/dispatch-urgent  — creates applications';
  RAISE NOTICE '          and notifications for top 5 (status=PENDING, not confirmed)';
  RAISE NOTICE '  Step 6  Indexes — deterministic, fast, scalable, fair';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END;
$$;
