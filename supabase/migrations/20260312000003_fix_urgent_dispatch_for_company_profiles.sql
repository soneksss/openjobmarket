-- ============================================================
-- Migration: Fix urgent job dispatch for 2-role system
-- ============================================================
--
-- The original select_top_tradespeople_for_urgent_job() RPC
-- queried contractor_profiles. In the 2-role system all
-- tradespeople are company type stored in company_profiles.
--
-- Changes:
--   1. Add geom (PostGIS geography) column to company_profiles
--      and populate it from existing latitude/longitude values
--   2. Create a trigger to keep geom in sync with lat/lng
--   3. Create a spatial index for fast ST_DWithin lookups
--   4. Rewrite select_top_tradespeople_for_urgent_job() to
--      query company_profiles instead of contractor_profiles
-- ============================================================


-- ── 1. Add geom column ──────────────────────────────────────
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);

-- Populate from existing coordinates
UPDATE public.company_profiles
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

DO $$ BEGIN
  RAISE NOTICE '✓ company_profiles.geom column added and populated';
END; $$;


-- ── 2. Trigger to keep geom in sync ─────────────────────────
CREATE OR REPLACE FUNCTION public.sync_company_profile_geom()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_sync_company_profile_geom ON public.company_profiles;
CREATE TRIGGER trg_sync_company_profile_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_company_profile_geom();

DO $$ BEGIN
  RAISE NOTICE '✓ geom sync trigger created on company_profiles';
END; $$;


-- ── 3. Spatial index ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_company_profiles_geom
  ON public.company_profiles USING GIST(geom)
  WHERE geom IS NOT NULL AND open_for_business = true;

DO $$ BEGIN
  RAISE NOTICE '✓ Spatial index created on company_profiles.geom';
END; $$;


-- ── 4. Rewrite RPC ──────────────────────────────────────────
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
BEGIN

  -- Validate: job must be open/active, urgent, and have coordinates
  SELECT
    ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography
  INTO v_job_location
  FROM public.jobs j
  WHERE j.id          = p_job_id
    AND j.status      = 'POSTED'::job_status
    AND j.is_urgent   = true
    AND j.latitude    IS NOT NULL
    AND j.longitude   IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Invalid job for dispatch: job % must exist, status=POSTED, is_urgent=true, and have coordinates set.',
      p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Ranked top-5 tradespeople from company_profiles
  RETURN QUERY
  WITH candidates AS (
    SELECT
      cp.id                                                AS tradesperson_id,
      ST_Distance(cp.geom, v_job_location) / 1000.0       AS distance_km,
      CASE
        WHEN cp.reviews_count >= 3
          THEN (cp.average_rating / 5.0) * 100
        ELSE 70
      END::NUMERIC                                         AS rating_score
    FROM public.company_profiles cp
    WHERE cp.open_for_business = true
      AND cp.geom IS NOT NULL
      AND ST_DWithin(cp.geom, v_job_location, 20000)       -- 20 km radius
  )
  SELECT
    c.tradesperson_id,
    (
      GREATEST(0, 100 - (c.distance_km * 5)) * 0.65        -- 65% proximity
      + c.rating_score                        * 0.30        -- 30% rating
      + (random() * 5)                                      -- 5% tiebreaker
    )::NUMERIC(8,4)                           AS total_score
  FROM   candidates c
  ORDER  BY total_score DESC
  LIMIT  5;

END;
$$;

GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID)
  TO service_role;

COMMENT ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID) IS
  'Returns the top 5 tradespeople (company_profiles) ranked by proximity and '
  'rating for urgent job dispatch. Used by /api/jobs/[id]/dispatch-urgent.';

DO $$ BEGIN
  RAISE NOTICE '✓ select_top_tradespeople_for_urgent_job() rewritten for company_profiles';
END; $$;


-- ── 5. Fix urgent_job_dispatch_alerts FK ────────────────────
-- Original table had job_id → homeowner_jobs(id).
-- Trade jobs (urgent) are in the `jobs` table, so we need to
-- point the FK there instead.

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  -- Find and drop the old FK constraint (name varies by creation method)
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.urgent_job_dispatch_alerts'::regclass
    AND contype = 'f'
    AND conname LIKE '%job_id%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.urgent_job_dispatch_alerts DROP CONSTRAINT ' || quote_ident(v_constraint);
    RAISE NOTICE '✓ Dropped old FK constraint % from urgent_job_dispatch_alerts', v_constraint;
  END IF;
END;
$$;

-- Add new FK pointing to jobs(id)
ALTER TABLE public.urgent_job_dispatch_alerts
  ADD CONSTRAINT urgent_job_dispatch_alerts_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✓ urgent_job_dispatch_alerts.job_id now references jobs(id)';
END; $$;
