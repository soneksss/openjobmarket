-- ============================================================
-- Migration: Flexible job dispatch support
-- Adds per-tradesperson flexible notification toggle +
-- matching RPC for dispatch-flexible route.
-- ============================================================

-- ── 1. New column on company_profiles ────────────────────────
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS flexible_job_notifications BOOLEAN DEFAULT true;

-- ── 2. RPC: find matching tradespeople for a flexible job ─────
-- Returns every company that:
--   • is marked open_for_business (the "Available" master switch)
--   • has flexible_job_notifications = true
--   • has a location set
--   • hasn't already been notified for this job (dedup)
--   • is within their configured notification radius
--   • has at least one matching skill / industry

-- Drop any existing overloads so we can change the return type safely
DROP FUNCTION IF EXISTS public.find_companies_for_flexible_dispatch(UUID, FLOAT, FLOAT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.find_companies_for_flexible_dispatch(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT);

CREATE OR REPLACE FUNCTION find_companies_for_flexible_dispatch(
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
  SELECT
    cp.id                AS company_id,
    cp.user_id,
    cp.company_name,
    (
      3958.8 * acos(
        LEAST(1.0,
          cos(radians(p_job_lat)) * cos(radians(cp.latitude))
          * cos(radians(cp.longitude) - radians(p_job_lon))
          + sin(radians(p_job_lat)) * sin(radians(cp.latitude))
        )
      )
    )::float             AS distance_miles
  FROM company_profiles cp
  WHERE
    -- Must be online / available
    cp.open_for_business = true
    -- Must have opted in to flexible job alerts
    AND cp.flexible_job_notifications = true
    -- Must have a location set
    AND cp.latitude  IS NOT NULL
    AND cp.longitude IS NOT NULL
    -- Not already notified for this job (idempotent dedup)
    AND NOT EXISTS (
      SELECT 1 FROM job_notifications_sent jns
      WHERE jns.job_id = p_job_id AND jns.company_id = cp.id
    )
    -- Within their preferred notification radius (default 10 miles)
    AND (
      3958.8 * acos(
        LEAST(1.0,
          cos(radians(p_job_lat)) * cos(radians(cp.latitude))
          * cos(radians(cp.longitude) - radians(p_job_lon))
          + sin(radians(p_job_lat)) * sin(radians(cp.latitude))
        )
      )
    ) <= COALESCE(cp.trade_job_notifications_distance, 10)
    -- Skill / industry match — at least one criterion must hit
    AND (
      -- No filter criteria at all → match everyone in range
      (p_industry IS NULL AND p_service IS NULL)
      OR
      -- Industry match (case-insensitive substring)
      (p_industry IS NOT NULL AND cp.industry ILIKE '%' || p_industry || '%')
      OR
      -- Any listed service matches service or industry keyword
      (p_service IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(cp.services) AS svc
        WHERE svc ILIKE '%' || p_service  || '%'
           OR svc ILIKE '%' || COALESCE(p_industry, '') || '%'
      ))
    )
  ORDER BY distance_miles ASC;
$$;

GRANT EXECUTE ON FUNCTION find_companies_for_flexible_dispatch TO anon, authenticated;

-- ── Verification ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles'
      AND column_name = 'flexible_job_notifications'
  ) THEN
    RAISE EXCEPTION 'flexible_job_notifications column missing from company_profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'find_companies_for_flexible_dispatch'
  ) THEN
    RAISE EXCEPTION 'find_companies_for_flexible_dispatch function missing';
  END IF;

  RAISE NOTICE '✓ flexible_job_notifications column exists';
  RAISE NOTICE '✓ find_companies_for_flexible_dispatch RPC created';
END;
$$;
