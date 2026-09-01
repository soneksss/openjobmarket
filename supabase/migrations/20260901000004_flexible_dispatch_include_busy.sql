-- ============================================================================
-- Flexible-job dispatch: notify BUSY tradespeople too + use canonical flag
-- Date: 2026-09-01
--
-- Two changes to find_companies_for_flexible_dispatch:
--
--   1. Remove the `cp.open_for_business = true` gate. A flexible job has no time
--      pressure, so a tradesperson who is currently "busy" should still hear
--      about it and decide for themselves. URGENT dispatch is unchanged —
--      select_top_tradespeople_for_urgent_job still requires open_for_business,
--      so urgent alerts only reach tradespeople who marked themselves available.
--
--   2. Gate on `flexible_notifications_enabled` (the canonical column from
--      20260517000001) instead of the deprecated `flexible_job_notifications`,
--      with COALESCE fallback so either flag (or an unset row) still works.
--      Both default TRUE, so every matching tradesperson in radius is notified
--      unless they explicitly turned flexible alerts off.
--
-- Industry match (primary OR any industries[] entry OR a listed service),
-- dedup, and radius are identical to 20260901000003.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_companies_for_flexible_dispatch(
  p_job_id   UUID,
  p_job_lat  FLOAT,
  p_job_lon  FLOAT,
  p_industry TEXT DEFAULT NULL,
  p_service  TEXT DEFAULT NULL
)
RETURNS TABLE (
  company_id     UUID,
  user_id        UUID,
  company_name   TEXT,
  distance_miles FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT
      cp.id            AS company_id,
      cp.user_id,
      cp.company_name,
      cp.trade_job_notifications_distance,
      (3958.8 * acos(
        LEAST(1.0,
          cos(radians(p_job_lat)) * cos(radians(cp.latitude))
          * cos(radians(cp.longitude) - radians(p_job_lon))
          + sin(radians(p_job_lat)) * sin(radians(cp.latitude))
        )
      ))::float        AS dist_mi
    FROM company_profiles cp
    WHERE COALESCE(cp.flexible_notifications_enabled, cp.flexible_job_notifications, true) = true
      AND cp.latitude  IS NOT NULL
      AND cp.longitude IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM job_notifications_sent jns
        WHERE  jns.job_id = p_job_id AND jns.company_id = cp.id
      )
      AND (
        (p_industry IS NULL AND p_service IS NULL)
        -- primary industry
        OR (p_industry IS NOT NULL AND cp.industry ILIKE '%' || p_industry || '%')
        -- any secondary industry in the industries[] list
        OR (p_industry IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(COALESCE(cp.industries, ARRAY[]::text[])) ind
              WHERE ind ILIKE '%' || p_industry || '%'
                 OR p_industry ILIKE '%' || ind || '%'
            ))
        -- listed service matches the job service (or its industry)
        OR (p_service  IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(cp.services) svc
              WHERE svc ILIKE '%' || p_service  || '%'
                 OR svc ILIKE '%' || COALESCE(p_industry, '') || '%'
            ))
      )
  )
  SELECT company_id, user_id, company_name, dist_mi AS distance_miles
  FROM   candidates
  WHERE  dist_mi <= trade_job_notifications_distance   -- never NULL: DEFAULT 10, NOT NULL
  ORDER  BY dist_mi ASC;
$$;

GRANT EXECUTE ON FUNCTION public.find_companies_for_flexible_dispatch(UUID, FLOAT, FLOAT, TEXT, TEXT)
  TO anon, authenticated;

DO $$ BEGIN
  RAISE NOTICE 'find_companies_for_flexible_dispatch: busy tradespeople included; gated on flexible_notifications_enabled';
END $$;
