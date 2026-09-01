-- ============================================================================
-- Flexible-job push dispatch: match on the company's FULL industry list
-- Date: 2026-09-01
--
-- Context:
--   A flexible job (urgency_type = 'flexible') is dispatched via
--   POST /api/jobs/[id]/dispatch-flexible → find_companies_for_flexible_dispatch.
--   Its industry test was `cp.industry ILIKE %p_industry%` — the single PRIMARY
--   industry only. A multi-trade company (industry = 'Plumbing',
--   industries = {'Plumbing','Plastering'}) got NO push for a 'Plastering'
--   flexible job unless one of their free-text services happened to match.
--
-- Fix:
--   Add a branch that matches any element of cp.industries[] (bidirectional
--   ILIKE). All other gates are unchanged from 20260414000007:
--     • open_for_business = true
--     • flexible_job_notifications = true   (column DEFAULT true)
--     • within the tradesperson's trade_job_notifications_distance (miles)
--     • not already in job_notifications_sent (dedup)
--
-- Companion to 20260901000002 (which fixed the urgent / manual notification
-- path, find_companies_for_trade_job_notification).
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
    WHERE cp.open_for_business          = true
      AND cp.flexible_job_notifications = true
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
  RAISE NOTICE 'find_companies_for_flexible_dispatch: industry match now includes cp.industries[]';
END $$;
