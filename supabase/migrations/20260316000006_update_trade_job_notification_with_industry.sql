-- Update find_companies_for_trade_job_notification to support structured
-- industry + service matching (in addition to existing skill text-matching).
--
-- New optional params:
--   p_job_industry text  — e.g. 'Electrical', 'Plumbing & Heating'
--   p_job_service  text  — e.g. 'Rewiring', 'Boiler Installation'
--
-- Matching logic (OR across all strategies):
--   1. Industry exact match:   cp.industry = p_job_industry
--   2. Service array match:    p_job_service = ANY(cp.services)
--   3. Existing skill text-match (stem/ilike strategies, unchanged)
--   4. No services defined → company matches all jobs in their area

DROP FUNCTION IF EXISTS find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]);
DROP FUNCTION IF EXISTS find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT, TEXT);

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
  SELECT array_agg(lower(skill)) INTO v_job_skills_lower
  FROM unnest(p_job_skills) AS skill;

  RETURN QUERY
  SELECT
    cp.id AS company_id,
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
    -- Within configured notification radius
    AND (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(cp.latitude)) *
        cos(radians(cp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(cp.latitude))
      ))
    )) <= COALESCE(cp.trade_job_notifications_distance, 10)
    -- Service/industry matching
    AND (
      -- 1. Company has no services defined → matches all jobs in their area
      cp.services IS NULL
      OR array_length(cp.services, 1) IS NULL
      OR array_length(cp.services, 1) = 0

      -- 2. Structured industry match: cp.industry = job.industry (exact, case-insensitive)
      OR (
        p_job_industry IS NOT NULL
        AND lower(cp.industry) = lower(p_job_industry)
      )

      -- 3. Structured service match: job.service is in company's services array
      OR (
        p_job_service IS NOT NULL
        AND lower(p_job_service) = ANY(SELECT lower(s) FROM unnest(cp.services) s)
      )

      -- 4. Legacy skill text-matching (stem / ilike strategies)
      OR (
        v_job_skills_lower IS NOT NULL
        AND array_length(v_job_skills_lower, 1) > 0
        AND EXISTS (
          SELECT 1
          FROM unnest(cp.services) AS company_service,
               unnest(v_job_skills_lower) AS job_skill
          WHERE
            lower(company_service) LIKE '%' || job_skill || '%'
            OR job_skill LIKE '%' || lower(company_service) || '%'
            OR lower(regexp_replace(company_service, '[^a-zA-Z0-9]', '', 'g')) =
               lower(regexp_replace(job_skill,       '[^a-zA-Z0-9]', '', 'g'))
            OR (
              length(job_skill) >= 4
              AND length(lower(company_service)) >= 4
              AND left(job_skill, 4) = left(lower(company_service), 4)
            )
            OR (
              regexp_replace(lower(company_service), '(ing|er|ian|tion|al|ist)$', '', 'g') =
              regexp_replace(job_skill,              '(ing|er|ian|tion|al|ist)$', '', 'g')
            )
        )
      )
    )
    -- Exclude the job poster's own company
    AND cp.id NOT IN (
      SELECT j.company_id FROM jobs j WHERE j.id = p_job_id AND j.company_id IS NOT NULL
    )
    AND cp.user_id NOT IN (
      SELECT hp.user_id
      FROM jobs j
      JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
      WHERE j.id = p_job_id AND j.homeowner_id IS NOT NULL
    )
  ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT, TEXT) TO service_role;
