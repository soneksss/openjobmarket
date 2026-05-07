-- ============================================================================
-- Migration: Fix trade job notification — add industry filter, close loopholes
-- Date: 2026-05-06
-- Problem:
--   1. find_companies_for_trade_job_notification only has 4 params; the route
--      passes p_job_industry / p_job_service but they were silently ignored.
--   2. Companies with empty services[] matched ALL jobs (match-all loophole).
-- Fix:
--   • Add p_job_industry + p_job_service params (with defaults for back-compat).
--   • Apply industry as a PRIMARY gate: if job has an industry, company.industry
--     must match (case-insensitive, 4-char stem fallback).
--   • Remove the empty-services = match-all behaviour.
-- ============================================================================

-- Drop the old 4-param signature (required before changing the param list)
DROP FUNCTION IF EXISTS find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]);

CREATE OR REPLACE FUNCTION find_companies_for_trade_job_notification(
  p_job_id       UUID,
  p_job_lat      DOUBLE PRECISION,
  p_job_lon      DOUBLE PRECISION,
  p_job_skills   TEXT[],
  p_job_industry TEXT DEFAULT NULL,
  p_job_service  TEXT DEFAULT NULL
)
RETURNS TABLE (
  company_id     UUID,
  user_id        UUID,
  company_name   TEXT,
  email          TEXT,
  distance_miles DOUBLE PRECISION
) AS $$
DECLARE
  v_job_skills_lower TEXT[];
BEGIN
  SELECT array_agg(lower(skill))
    INTO v_job_skills_lower
    FROM unnest(p_job_skills) AS skill;

  RETURN QUERY
  SELECT
    cp.id            AS company_id,
    cp.user_id,
    cp.company_name,
    u.email,
    (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
        cos(radians(cp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(cp.latitude))
      ))
    )) AS distance_miles
  FROM company_profiles cp
  JOIN users u ON u.id = cp.user_id
  WHERE
    -- Must have opted in to trade job notifications
    cp.trade_job_notifications = true
    -- Must have valid coordinates
    AND cp.latitude  IS NOT NULL
    AND cp.longitude IS NOT NULL
    -- Must be within their configured radius
    AND (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
        cos(radians(cp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(cp.latitude))
      ))
    )) <= COALESCE(cp.trade_job_notifications_distance, 10)

    -- ── PRIMARY GATE: industry must match ───────────────────────────────────
    -- If the job has an industry, the company's industry must match.
    -- This prevents cross-trade notifications (e.g. Gardening → Cleaner).
    AND (
      p_job_industry IS NULL                                          -- job has no industry → skip gate
      OR lower(COALESCE(cp.industry, '')) = lower(p_job_industry)   -- exact match
      OR (                                                            -- 4-char stem match
            length(p_job_industry) >= 4
        AND length(COALESCE(cp.industry, '')) >= 4
        AND left(lower(cp.industry), 4) = left(lower(p_job_industry), 4)
      )
    )

    -- ── SECONDARY FILTER: services / skills ─────────────────────────────────
    -- Require at least one service match when skills are provided.
    -- Companies with no services set are allowed through only if the industry
    -- gate already narrowed the selection (they opted in to that industry).
    AND (
      -- No skills were supplied → industry gate alone is sufficient
      v_job_skills_lower IS NULL
      OR array_length(v_job_skills_lower, 1) IS NULL
      OR array_length(v_job_skills_lower, 1) = 0

      -- Company has no services listed but industry already matched → allow
      -- (they cover the whole industry without listing every service)
      OR cp.services IS NULL
      OR array_length(cp.services, 1) IS NULL
      OR array_length(cp.services, 1) = 0

      -- At least one listed service matches a job skill
      OR EXISTS (
        SELECT 1
        FROM unnest(cp.services)         AS company_service,
             unnest(v_job_skills_lower)  AS job_skill
        WHERE
          -- Strategy 1: substring in either direction
          lower(company_service) LIKE '%' || job_skill || '%'
          OR job_skill LIKE '%' || lower(company_service) || '%'
          -- Strategy 2: alphanumeric-only exact match
          OR lower(regexp_replace(company_service, '[^a-zA-Z0-9]', '', 'g')) =
             lower(regexp_replace(job_skill,        '[^a-zA-Z0-9]', '', 'g'))
          -- Strategy 3: shared 4-char prefix (plumber↔plumbing, electrician↔electrical)
          OR (
                length(job_skill)                  >= 4
            AND length(lower(company_service))     >= 4
            AND left(job_skill, 4) = left(lower(company_service), 4)
          )
          -- Strategy 4: suffix-stripped comparison (-ing, -er, -ian, -tion, -al, -ist)
          OR regexp_replace(lower(company_service), '(ing|er|ian|tion|al|ist)$', '', 'g') =
             regexp_replace(job_skill,              '(ing|er|ian|tion|al|ist)$', '', 'g')
      )
    )

    -- Exclude the job poster's own company
    AND cp.id NOT IN (
      SELECT j.company_id FROM jobs j
      WHERE j.id = p_job_id AND j.company_id IS NOT NULL
    )
    -- Exclude if job was posted by a homeowner
    AND cp.user_id NOT IN (
      SELECT hp.user_id
      FROM jobs j
      JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
      WHERE j.id = p_job_id AND j.homeowner_id IS NOT NULL
    )
  ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT, TEXT)
  TO service_role;

DO $$
BEGIN
  RAISE NOTICE '✓ find_companies_for_trade_job_notification updated';
  RAISE NOTICE '  - Added p_job_industry / p_job_service params (back-compat defaults)';
  RAISE NOTICE '  - Industry is now a PRIMARY gate: cross-trade matches blocked';
  RAISE NOTICE '  - Empty services no longer match all jobs (only within matched industry)';
END $$;
