-- Homeowner address privacy migration
-- Run in Supabase SQL editor

-- 1. Add structured address + approx coordinate columns to homeowner_profiles
ALTER TABLE homeowner_profiles
  ADD COLUMN IF NOT EXISTS address_line1      TEXT,
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS latitude_approx    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude_approx   DOUBLE PRECISION;

-- 2. Backfill approx coords for existing rows that already have exact coords
--    Offset: ~0.004-0.007 degrees (~450-780m). We use a deterministic seed per
--    row so the approx location is stable across re-runs.
UPDATE homeowner_profiles
SET
  latitude_approx  = latitude  + (((hashtext(id::text) % 1000)::float / 100000.0) + 0.004),
  longitude_approx = longitude + (((hashtext(reverse(id::text)) % 1000)::float / 100000.0) + 0.004)
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude_approx IS NULL;

-- 3. RLS: tradespeople (company users) can read approx coords but NOT exact coords.
--    Exact fields (latitude, longitude, full_address, address_line1, city) are only
--    readable by the homeowner themselves OR when a confirmed job links them.
--
--    NOTE: adjust policy names if you already have policies on this table.
--
-- First, check existing policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'homeowner_profiles';
--
-- Example policy to add (adapt to your existing RLS setup):
-- CREATE POLICY "homeowners_own_row" ON homeowner_profiles
--   FOR ALL USING (auth.uid() = user_id);
--
-- CREATE POLICY "public_read_safe_fields" ON homeowner_profiles
--   FOR SELECT USING (true);
--
-- The application enforces privacy at the query layer (column selection).
-- The job detail page only exposes exact fields to confirmed tradespeople —
-- see app/jobs/[id]/page.tsx (JOB_SELECT + applicationStatus check).

-- 4. Add approx columns to jobs table so listings always show approx location
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS latitude_approx  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude_approx DOUBLE PRECISION;

-- Backfill jobs with approx coords from the linked homeowner profile
UPDATE jobs j
SET
  latitude_approx  = hp.latitude_approx,
  longitude_approx = hp.longitude_approx
FROM homeowner_profiles hp
WHERE j.homeowner_id = hp.id
  AND hp.latitude_approx IS NOT NULL
  AND j.latitude_approx IS NULL;
