-- ============================================================================
-- Trade-job notifications: match on the company's FULL industry list
-- Date: 2026-09-01
--
-- Problem:
--   find_companies_for_trade_job_notification's industry gate only compared
--   the job industry against cp.industry (the single PRIMARY industry).
--   A multi-trade company — e.g. industry = 'Plumbing',
--   industries = {'Plumbing','Plastering'} — was NOT notified about a
--   'Plastering' job, even though they list plastering as one of their trades.
--
-- Fix:
--   Extend the industry gate to also match any element of the cp.industries[]
--   array (exact + 4-char stem), keeping the existing cp.industry checks.
--   Everything else (distance, services/skills secondary filter, poster
--   exclusion) is unchanged from 20260506000001.
-- ============================================================================

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
    cp.trade_job_notifications = true
    AND cp.latitude  IS NOT NULL
    AND cp.longitude IS NOT NULL
    AND (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
        cos(radians(cp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(cp.latitude))
      ))
    )) <= COALESCE(cp.trade_job_notifications_distance, 10)

    -- ── PRIMARY GATE: industry must match ───────────────────────────────────
    -- The job industry must match the company's PRIMARY industry OR any trade
    -- in their industries[] list (exact, or 4-char stem for plumber↔plumbing).
    AND (
      p_job_industry IS NULL
      OR lower(COALESCE(cp.industry, '')) = lower(p_job_industry)
      OR (
            length(p_job_industry) >= 4
        AND length(COALESCE(cp.industry, '')) >= 4
        AND left(lower(cp.industry), 4) = left(lower(p_job_industry), 4)
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(COALESCE(cp.industries, ARRAY[]::text[])) AS ind
        WHERE ind IS NOT NULL
          AND (
            lower(ind) = lower(p_job_industry)
            OR (
                  length(p_job_industry) >= 4
              AND length(ind) >= 4
              AND left(lower(ind), 4) = left(lower(p_job_industry), 4)
            )
          )
      )
    )

    -- ── SECONDARY FILTER: services / skills ─────────────────────────────────
    AND (
      v_job_skills_lower IS NULL
      OR array_length(v_job_skills_lower, 1) IS NULL
      OR array_length(v_job_skills_lower, 1) = 0

      OR cp.services IS NULL
      OR array_length(cp.services, 1) IS NULL
      OR array_length(cp.services, 1) = 0

      OR EXISTS (
        SELECT 1
        FROM unnest(cp.services)         AS company_service,
             unnest(v_job_skills_lower)  AS job_skill
        WHERE
          lower(company_service) LIKE '%' || job_skill || '%'
          OR job_skill LIKE '%' || lower(company_service) || '%'
          OR lower(regexp_replace(company_service, '[^a-zA-Z0-9]', '', 'g')) =
             lower(regexp_replace(job_skill,        '[^a-zA-Z0-9]', '', 'g'))
          OR (
                length(job_skill)                  >= 4
            AND length(lower(company_service))     >= 4
            AND left(job_skill, 4) = left(lower(company_service), 4)
          )
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

DO $$ BEGIN
  RAISE NOTICE 'find_companies_for_trade_job_notification: industry gate now matches cp.industries[] too';
END $$;
