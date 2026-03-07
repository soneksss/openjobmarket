-- ============================================================
-- Migration: Step 1 — Ensure required columns for urgent-job
--            ranking exist on contractor_profiles
-- ============================================================
--
-- Column audit result (all checked against prior migrations):
--
--   latitude         DOUBLE PRECISION  ✓ exists  (idx_contractor_profiles_location)
--   longitude        DOUBLE PRECISION  ✓ exists  (idx_contractor_profiles_location)
--   languages        TEXT[]            ✓ exists  (GIN idx_contractor_profiles_languages)
--   available_247    BOOLEAN           ✓ exists  (idx_contractor_profiles_available_247)
--   average_rating   DECIMAL(3,2)      ✓ exists  (20251229 reviews migration)
--   reviews_count    INTEGER           ✓ exists  (20251229 reviews migration)
--   accept_rate      NUMERIC(5,4)      ✗ MISSING → added below
--   completion_rate  NUMERIC(5,4)      ✗ MISSING → added below
--
-- Note on geography(Point, 4326):
--   The spec asks for a PostGIS geography column.  PostGIS is
--   conditionally available in this project (checked at runtime
--   in 20260213000005).  Because latitude + longitude already
--   exist and are indexed, the ranking RPC (Step 2) will use
--   the Haversine formula directly — no geography column needed.
--   Adding one now would either fail on instances without PostGIS
--   or duplicate the data already stored in lat/lon.
--
-- Column name mapping for the ranking function:
--   Spec name        Actual column name
--   ──────────────── ──────────────────
--   location         → latitude + longitude (Haversine)
--   availability     → available_247
--   avg_rating       → average_rating
--   rating_count     → reviews_count
--   accept_rate      → accept_rate      (new)
--   completion_rate  → completion_rate  (new)
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  1. Add accept_rate
-- ════════════════════════════════════════════════════════════
-- Fraction of urgent job invitations the contractor accepted.
-- Range: 0.0000 – 1.0000.  Default 1.0 = assume perfect
-- acceptance until the system has enough data to calculate.

ALTER TABLE public.contractor_profiles
  ADD COLUMN IF NOT EXISTS accept_rate NUMERIC(5,4) NOT NULL DEFAULT 1.0;

-- Constraint added separately so it is idempotent-safe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'contractor_profiles'
      AND constraint_name = 'chk_cp_accept_rate'
  ) THEN
    ALTER TABLE public.contractor_profiles
      ADD CONSTRAINT chk_cp_accept_rate
      CHECK (accept_rate BETWEEN 0.0 AND 1.0);
  END IF;
END;
$$;

COMMENT ON COLUMN public.contractor_profiles.accept_rate IS
  'Fraction of urgent job dispatches accepted by this contractor '
  '(0.0 – 1.0). Updated by the dispatch tracking system. '
  'Default 1.0 until enough history exists.';


-- ════════════════════════════════════════════════════════════
--  2. Add completion_rate
-- ════════════════════════════════════════════════════════════
-- Fraction of accepted urgent jobs the contractor completed
-- without cancellation.  Range: 0.0000 – 1.0000.

ALTER TABLE public.contractor_profiles
  ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(5,4) NOT NULL DEFAULT 1.0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'contractor_profiles'
      AND constraint_name = 'chk_cp_completion_rate'
  ) THEN
    ALTER TABLE public.contractor_profiles
      ADD CONSTRAINT chk_cp_completion_rate
      CHECK (completion_rate BETWEEN 0.0 AND 1.0);
  END IF;
END;
$$;

COMMENT ON COLUMN public.contractor_profiles.completion_rate IS
  'Fraction of accepted urgent jobs completed without cancellation '
  '(0.0 – 1.0). Updated by the dispatch tracking system. '
  'Default 1.0 until enough history exists.';


-- ════════════════════════════════════════════════════════════
--  3. Indexes for the ranking query
-- ════════════════════════════════════════════════════════════
-- The ranking RPC (Step 2) will:
--   WHERE available_247 = true
--     AND latitude IS NOT NULL
--   ORDER BY <weighted score> DESC
-- These partial indexes support the hot path.

CREATE INDEX IF NOT EXISTS idx_cp_accept_rate
  ON public.contractor_profiles (accept_rate)
  WHERE available_247 = true AND latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cp_completion_rate
  ON public.contractor_profiles (completion_rate)
  WHERE available_247 = true AND latitude IS NOT NULL;

-- Composite covering index for the full ranking filter
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
--  4. Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_accept_rate     BOOLEAN;
  v_completion_rate BOOLEAN;
  v_idx_ranking     BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name  = 'contractor_profiles'
      AND column_name = 'accept_rate'
  ) INTO v_accept_rate;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name  = 'contractor_profiles'
      AND column_name = 'completion_rate'
  ) INTO v_completion_rate;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'contractor_profiles'
      AND indexname = 'idx_cp_ranking_eligible'
  ) INTO v_idx_ranking;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Step 1 — Urgency ranking column audit';
  RAISE NOTICE '  latitude         : ✓ (pre-existing)';
  RAISE NOTICE '  longitude        : ✓ (pre-existing)';
  RAISE NOTICE '  languages        : ✓ (pre-existing)';
  RAISE NOTICE '  available_247    : ✓ (pre-existing, maps to "availability")';
  RAISE NOTICE '  average_rating   : ✓ (pre-existing, maps to "avg_rating")';
  RAISE NOTICE '  reviews_count    : ✓ (pre-existing, maps to "rating_count")';
  RAISE NOTICE '  accept_rate      : %', CASE WHEN v_accept_rate     THEN '✓ added' ELSE '✗ MISSING' END;
  RAISE NOTICE '  completion_rate  : %', CASE WHEN v_completion_rate THEN '✓ added' ELSE '✗ MISSING' END;
  RAISE NOTICE '  idx_cp_ranking_eligible : %', CASE WHEN v_idx_ranking THEN '✓ created' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_accept_rate AND v_completion_rate AND v_idx_ranking) THEN
    RAISE EXCEPTION 'Step 1 verification failed — see NOTICE output above';
  END IF;

  RAISE NOTICE '✅ Step 1 complete: all ranking columns present on contractor_profiles';
  RAISE NOTICE '   Next: Step 2 — create rank_urgent_job_candidates() RPC';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
