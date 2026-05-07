-- Migration: Job location privacy columns
-- Adds postcode, address_full, location_type, latitude_approx, longitude_approx to jobs.
-- Backfills approx coords for existing exact-location jobs using a deterministic offset.

-- ── 1. Add new columns ───────────────────────────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS postcode         TEXT,
  ADD COLUMN IF NOT EXISTS address_full     TEXT,
  ADD COLUMN IF NOT EXISTS location_type    TEXT DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS latitude_approx  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude_approx DOUBLE PRECISION;

-- ── 2. Add check constraint ──────────────────────────────────────────────────
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_location_type_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_location_type_check
  CHECK (location_type IS NULL OR location_type IN ('exact', 'approx'));

-- ── 3. Backfill: mark existing jobs as 'exact' ───────────────────────────────
UPDATE public.jobs
SET location_type = 'exact'
WHERE location_type IS NULL;

-- ── 4. Backfill approx coords for existing jobs with real coordinates ─────────
-- Uses a small deterministic offset (~300m) derived from the row's creation time.
-- Angle = epoch seconds mod (2π), radius = 0.003 degrees ≈ 330m.
UPDATE public.jobs
SET
  latitude_approx  = latitude  + 0.003 * SIN(MOD(EXTRACT(EPOCH FROM created_at)::bigint, 628318) / 100000.0),
  longitude_approx = longitude + 0.003 * COS(MOD(EXTRACT(EPOCH FROM created_at)::bigint, 628318) / 100000.0)
WHERE location_type = 'exact'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude_approx IS NULL;

-- For approx jobs (none yet, but in case of migration re-run): approx = exact
UPDATE public.jobs
SET
  latitude_approx  = latitude,
  longitude_approx = longitude
WHERE location_type = 'approx'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude_approx IS NULL;

-- ── 5. Also backfill address_full from existing location text ─────────────────
UPDATE public.jobs
SET address_full = location
WHERE location_type = 'exact'
  AND location IS NOT NULL
  AND address_full IS NULL;

-- ── 6. Index for approx coordinate bounding-box queries ─────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_approx_lat_lon
  ON public.jobs (latitude_approx, longitude_approx)
  WHERE latitude_approx IS NOT NULL AND longitude_approx IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE '✓ Job location privacy columns added and backfilled';
END $$;
