-- ============================================================
-- Migration: Step 2 — PostGIS + distance-based candidate query
--            for urgent job ranking
-- ============================================================
--
-- What this migration does:
--   A. Enables the PostGIS extension (idempotent).
--   B. Adds geom geography(Point, 4326) to contractor_profiles.
--      NOTE: contractor_profiles already has a TEXT column named
--      "location" (address string, used by the profile edit form).
--      The PostGIS spatial column is therefore named "geom" to match
--      the convention used on the jobs table (jobs.geom).
--   C. Back-fills geom from the existing latitude/longitude columns.
--   D. Creates a GIST spatial index for ST_DWithin queries.
--   E. Creates a sync trigger — whenever latitude or longitude changes
--      the geom column is updated automatically.
--   F. Creates get_urgent_job_candidates(job_id, radius_miles) — a
--      reusable STABLE function that returns all available contractors
--      within the given radius, ordered by distance.
--      This is the "candidate pool" input to the Step-3 ranking RPC.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  A. Enable PostGIS
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  RAISE NOTICE '✓ PostGIS extension enabled (or already present)';
END; $$;


-- ════════════════════════════════════════════════════════════
--  B. Add geom geography(Point, 4326) to contractor_profiles
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name  = 'contractor_profiles'
      AND column_name = 'geom'
  ) THEN
    ALTER TABLE public.contractor_profiles
      ADD COLUMN geom geography(Point, 4326);

    RAISE NOTICE '✓ geom column added to contractor_profiles';
  ELSE
    RAISE NOTICE '  geom column already exists on contractor_profiles — skipped';
  END IF;
END;
$$;

COMMENT ON COLUMN public.contractor_profiles.geom IS
  'PostGIS geography point derived from (longitude, latitude). '
  'Kept in sync by trg_sync_contractor_geom. '
  'Used for ST_DWithin distance queries in the urgent-job ranking RPC. '
  'Distinct from the TEXT column "location" which stores the address string.';


-- ════════════════════════════════════════════════════════════
--  C. Back-fill geom from existing latitude / longitude
-- ════════════════════════════════════════════════════════════
-- ST_MakePoint expects (longitude, latitude) — x before y.

UPDATE public.contractor_profiles
SET    geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE  latitude  IS NOT NULL
  AND  longitude IS NOT NULL
  AND  geom      IS NULL;

DO $$ BEGIN
  RAISE NOTICE '✓ geom back-filled from latitude/longitude';
END; $$;


-- ════════════════════════════════════════════════════════════
--  D. GIST spatial index
-- ════════════════════════════════════════════════════════════

-- Full index (covers all rows, needed for general spatial queries)
CREATE INDEX IF NOT EXISTS idx_cp_geom
  ON public.contractor_profiles USING GIST (geom);

-- Partial index for the hot path: available + has coordinates
-- This is the index the ranking query will hit on every dispatch.
CREATE INDEX IF NOT EXISTS idx_cp_geom_eligible
  ON public.contractor_profiles USING GIST (geom)
  WHERE geom IS NOT NULL
    AND available_247 = true;

DO $$ BEGIN
  RAISE NOTICE '✓ GIST spatial indexes created on contractor_profiles.geom';
END; $$;


-- ════════════════════════════════════════════════════════════
--  E. Sync trigger — keep geom in sync with lat/lon
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_contractor_geom()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_contractor_geom() IS
  'BEFORE INSERT OR UPDATE trigger that keeps contractor_profiles.geom '
  'in sync with latitude and longitude columns.';

DROP TRIGGER IF EXISTS trg_sync_contractor_geom ON public.contractor_profiles;

CREATE TRIGGER trg_sync_contractor_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON public.contractor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contractor_geom();

DO $$ BEGIN
  RAISE NOTICE '✓ trg_sync_contractor_geom trigger created';
END; $$;


-- ════════════════════════════════════════════════════════════
--  F. get_urgent_job_candidates()
--     Distance-based candidate pool query.
--     Returns all available contractors within p_radius_miles
--     of the given urgent job, ordered by distance ascending.
--     Called by the Step-3 ranking RPC as its candidate source.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_urgent_job_candidates(
  p_job_id       UUID,
  p_radius_miles DOUBLE PRECISION DEFAULT 10.0
)
RETURNS TABLE (
  contractor_id   UUID,
  user_id         UUID,
  distance_miles  DOUBLE PRECISION,
  available_247   BOOLEAN,
  average_rating  NUMERIC,
  reviews_count   INTEGER,
  accept_rate     NUMERIC,
  completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_job_lat   DOUBLE PRECISION;
  v_job_lon   DOUBLE PRECISION;
  v_job_geog  geography;
  v_is_urgent BOOLEAN;
  v_status    job_status;
BEGIN
  -- ── Validate job ────────────────────────────────────────────
  SELECT j.latitude,
         j.longitude,
         j.is_urgent,
         j.status
  INTO   v_job_lat, v_job_lon, v_is_urgent, v_status
  FROM   public.jobs j
  WHERE  j.id                 = p_job_id
    AND  j.is_tradespeople_job = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found or not a trade job', p_job_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_status <> 'POSTED' THEN
    RAISE EXCEPTION 'Job % must be in POSTED status, got: %', p_job_id, v_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_is_urgent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Job % is not marked as urgent', p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_job_lat IS NULL OR v_job_lon IS NULL THEN
    RAISE EXCEPTION 'Job % has no coordinates', p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Build job geography point ────────────────────────────────
  -- ST_MakePoint takes (lon, lat) — x before y
  v_job_geog := ST_SetSRID(
    ST_MakePoint(v_job_lon, v_job_lat), 4326
  )::geography;

  -- ── Distance filter ─────────────────────────────────────────
  -- ST_DWithin with geography uses metres; 1 mile = 1 609.344 m
  -- ST_Distance returns metres; divide by 1 609.344 for miles.
  RETURN QUERY
  SELECT
    cp.id                                                      AS contractor_id,
    cp.user_id,
    ST_Distance(cp.geom, v_job_geog) / 1609.344               AS distance_miles,
    cp.available_247,
    cp.average_rating::NUMERIC,
    cp.reviews_count,
    cp.accept_rate,
    cp.completion_rate
  FROM  public.contractor_profiles cp
  WHERE cp.geom IS NOT NULL
    AND cp.available_247 = true
    AND ST_DWithin(
          cp.geom,
          v_job_geog,
          p_radius_miles * 1609.344   -- convert miles → metres
        )
  ORDER BY distance_miles ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_urgent_job_candidates(UUID, DOUBLE PRECISION)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_urgent_job_candidates(UUID, DOUBLE PRECISION) IS
  'Returns all available contractors within p_radius_miles of the given '
  'urgent POSTED job, ordered by distance ascending. '
  'Validates that the job is POSTED + is_urgent = true before querying. '
  'Used as the candidate pool input to rank_urgent_job_candidates() in Step 3.';

DO $$ BEGIN
  RAISE NOTICE '✓ get_urgent_job_candidates() created';
END; $$;


-- ════════════════════════════════════════════════════════════
--  Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_postgis    BOOLEAN;
  v_geom_col   BOOLEAN;
  v_gist_idx   BOOLEAN;
  v_trigger    BOOLEAN;
  v_fn_exists  BOOLEAN;
  v_backfilled INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) INTO v_postgis;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name  = 'contractor_profiles'
      AND column_name = 'geom'
  ) INTO v_geom_col;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'contractor_profiles'
      AND indexname  = 'idx_cp_geom_eligible'
  ) INTO v_gist_idx;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname   = 'trg_sync_contractor_geom'
      AND tgrelid  = 'public.contractor_profiles'::regclass
  ) INTO v_trigger;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'get_urgent_job_candidates'
      AND n.nspname = 'public'
  ) INTO v_fn_exists;

  SELECT COUNT(*) INTO v_backfilled
  FROM public.contractor_profiles
  WHERE geom IS NOT NULL;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Step 2 — Distance-Based Candidate Query';
  RAISE NOTICE '  PostGIS extension                : %', CASE WHEN v_postgis   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  contractor_profiles.geom column  : %', CASE WHEN v_geom_col  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  idx_cp_geom_eligible (GIST)      : %', CASE WHEN v_gist_idx  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  trg_sync_contractor_geom trigger : %', CASE WHEN v_trigger   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  get_urgent_job_candidates()      : %', CASE WHEN v_fn_exists THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  Contractors with geom populated  : %', v_backfilled;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_postgis AND v_geom_col AND v_gist_idx AND v_trigger AND v_fn_exists) THEN
    RAISE EXCEPTION 'Step 2 verification failed — see NOTICE output above';
  END IF;

  RAISE NOTICE '✅ Step 2 complete: distance-based candidate query ready';
  RAISE NOTICE '   Next: Step 3 — create rank_urgent_job_candidates() RPC';
  RAISE NOTICE '   (weighted score + randomness + top-5 selection)';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
