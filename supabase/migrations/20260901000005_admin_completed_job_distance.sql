-- ============================================================================
-- Admin analytics: average travel distance for completed jobs
-- Date: 2026-09-01
--
-- Distance (great-circle miles) between the confirmed tradesperson's registered
-- location and the job location, for jobs that reached status = 'COMPLETED'.
-- Feeds the "Estimated CO₂e avoided" figure on the admin marketplace overview
-- (shorter trips = less van mileage vs. a non-local baseline).
--
-- Outliers > 500 mi are dropped (bad geocodes / test data).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_completed_job_distance_stats()
RETURNS TABLE (avg_miles double precision, sample_size bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT
      3958.8 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians(j.latitude))  * cos(radians(cp.latitude)) *
        cos(radians(cp.longitude) - radians(j.longitude)) +
        sin(radians(j.latitude))  * sin(radians(cp.latitude))
      ))) AS miles
    FROM jobs j
    JOIN company_profiles cp
      ON cp.id = COALESCE(j.confirmed_tradesperson_id, j.accepted_contractor_id)
    WHERE j.status = 'COMPLETED'
      AND j.latitude  IS NOT NULL AND j.longitude  IS NOT NULL
      AND cp.latitude IS NOT NULL AND cp.longitude IS NOT NULL
  )
  SELECT AVG(miles)::double precision AS avg_miles,
         COUNT(*)::bigint             AS sample_size
  FROM   d
  WHERE  miles < 500;
$$;

GRANT EXECUTE ON FUNCTION public.admin_completed_job_distance_stats()
  TO authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE 'admin_completed_job_distance_stats() created';
END $$;
