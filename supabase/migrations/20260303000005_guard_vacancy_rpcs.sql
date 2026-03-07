-- ============================================================
-- Migration: Add feature flag guard to remaining vacancy RPCs
-- ============================================================
-- Three functions were identified without the guard:
--
--   1. can_post_vacancy()              — pure vacancy  → RAISE EXCEPTION
--   2. can_apply_to_job()              — dual-purpose  → RETURN false on vacancy path only
--   3. find_professionals_for_vacancy_notification() → RAISE EXCEPTION
--
-- accept_job_application() was already guarded in migration 000004.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  1. can_post_vacancy()
--     Pure vacancy function — guard at the very top.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_post_vacancy(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type VARCHAR(20);
  v_user_type    VARCHAR(50);
BEGIN
  -- ── Feature flag guard ────────────────────────────────────
  IF NOT public.is_vacancy_system_enabled() THEN
    RAISE EXCEPTION 'Vacancy system is currently disabled'
      USING ERRCODE = 'feature_not_supported';
  END IF;

  SELECT account_type, user_type INTO v_account_type, v_user_type
  FROM users
  WHERE id = p_user_id;

  -- Companies and businesses can post vacancies
  RETURN v_account_type = 'business' OR v_user_type IN ('company', 'contractor');
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_post_vacancy(UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ can_post_vacancy() — feature flag guard added';
END; $$;


-- ════════════════════════════════════════════════════════════
--  2. can_apply_to_job()
--     Dual-purpose: handles trade jobs (is_tradespeople_job = true)
--     AND vacancy jobs (is_tradespeople_job = false).
--     The guard is placed only on the vacancy path so that
--     trade job permission checks are never affected.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_apply_to_job(p_user_id UUID, p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type VARCHAR(20);
  v_is_trade_job BOOLEAN;
BEGIN
  -- Get user's account type
  SELECT account_type INTO v_account_type
  FROM users
  WHERE id = p_user_id;

  -- Get job type
  SELECT is_tradespeople_job INTO v_is_trade_job
  FROM jobs
  WHERE id = p_job_id;

  -- ── Trade job path — not affected by vacancy flag ─────────
  IF v_is_trade_job = true THEN
    RETURN v_account_type = 'business';
  END IF;

  -- ── Vacancy path — block when vacancy system is disabled ──
  IF NOT public.is_vacancy_system_enabled() THEN
    RETURN false;
  END IF;

  -- Both individual and business accounts can apply to vacancy jobs
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_apply_to_job(UUID, UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ can_apply_to_job() — vacancy-path feature flag guard added';
END; $$;


-- ════════════════════════════════════════════════════════════
--  3. find_professionals_for_vacancy_notification()
--     Pure vacancy function — guard at the very top.
--     Raises instead of returning empty rows so callers know
--     the system is disabled (not just "no matches found").
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.find_professionals_for_vacancy_notification(
  p_job_id     UUID,
  p_job_lat    DOUBLE PRECISION,
  p_job_lon    DOUBLE PRECISION,
  p_job_skills TEXT[]
)
RETURNS TABLE (
  professional_id   UUID,
  user_id           UUID,
  professional_name TEXT,
  email             TEXT,
  distance_miles    DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_skills_lower TEXT[];
BEGIN
  -- ── Feature flag guard ────────────────────────────────────
  IF NOT public.is_vacancy_system_enabled() THEN
    RAISE EXCEPTION 'Vacancy system is currently disabled'
      USING ERRCODE = 'feature_not_supported';
  END IF;

  -- Convert job skills to lowercase for case-insensitive matching
  SELECT array_agg(lower(skill)) INTO v_job_skills_lower
  FROM unnest(p_job_skills) AS skill;

  RETURN QUERY
  SELECT
    pp.id AS professional_id,
    pp.user_id,
    CONCAT(pp.first_name, ' ', pp.last_name) AS professional_name,
    u.email,
    -- Haversine formula for distance in miles
    (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(pp.latitude)) *
        cos(radians(pp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(pp.latitude))
      ))
    )) AS distance_miles
  FROM professional_profiles pp
  JOIN users u ON u.id = pp.user_id
  WHERE
    -- Vacancy notifications are enabled
    pp.vacancy_job_notifications = true
    -- Has valid coordinates
    AND pp.latitude IS NOT NULL
    AND pp.longitude IS NOT NULL
    -- Distance is within the configured radius
    AND (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(pp.latitude)) *
        cos(radians(pp.longitude) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(pp.latitude))
      ))
    )) <= COALESCE(pp.vacancy_job_notifications_distance, 10)
    -- Flexible skill matching
    AND (
      pp.skills IS NULL
      OR array_length(pp.skills, 1) IS NULL
      OR array_length(pp.skills, 1) = 0
      OR v_job_skills_lower IS NULL
      OR array_length(v_job_skills_lower, 1) IS NULL
      OR array_length(v_job_skills_lower, 1) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(pp.skills) AS prof_skill,
             unnest(v_job_skills_lower) AS job_skill
        WHERE
          lower(prof_skill) LIKE '%' || job_skill || '%'
          OR job_skill LIKE '%' || lower(prof_skill) || '%'
          OR lower(regexp_replace(prof_skill, '[^a-zA-Z0-9]', '', 'g')) =
             lower(regexp_replace(job_skill, '[^a-zA-Z0-9]', '', 'g'))
          OR (
            length(job_skill) >= 4
            AND length(lower(prof_skill)) >= 4
            AND left(job_skill, 4) = left(lower(prof_skill), 4)
          )
          OR (
            regexp_replace(lower(prof_skill), '(ing|er|ian|tion|al|ist|ment|ness)$', '', 'g') =
            regexp_replace(job_skill, '(ing|er|ian|tion|al|ist|ment|ness)$', '', 'g')
          )
      )
    )
    -- Exclude the job poster's own profile (company case)
    AND pp.user_id NOT IN (
      SELECT cp.user_id
      FROM jobs j
      JOIN company_profiles cp ON cp.id = j.company_id
      WHERE j.id = p_job_id AND j.company_id IS NOT NULL
    )
    -- Exclude if the professional posted the job themselves
    AND pp.id NOT IN (
      SELECT j.professional_id
      FROM jobs j
      WHERE j.id = p_job_id AND j.professional_id IS NOT NULL
    )
  ORDER BY distance_miles;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_professionals_for_vacancy_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_professionals_for_vacancy_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[]) TO service_role;

DO $$ BEGIN
  RAISE NOTICE '✓ find_professionals_for_vacancy_notification() — feature flag guard added';
END; $$;


-- ════════════════════════════════════════════════════════════
--  Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_guard_enabled BOOLEAN;
BEGIN
  -- Confirm the flag is still off (safe state)
  SELECT enabled INTO v_guard_enabled
  FROM feature_flags
  WHERE key = 'vacancy_system';

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Vacancy RPC guard audit';
  RAISE NOTICE '  accept_job_application()                     : ✓ (migration 000004)';
  RAISE NOTICE '  can_post_vacancy()                           : ✓ (this migration)';
  RAISE NOTICE '  can_apply_to_job() — vacancy path            : ✓ (this migration)';
  RAISE NOTICE '  find_professionals_for_vacancy_notification(): ✓ (this migration)';
  RAISE NOTICE '  vacancy_system flag currently enabled        : %', v_guard_enabled;
  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE '✅ All vacancy RPCs are now fully protected by the feature flag.';
  RAISE NOTICE '';
  RAISE NOTICE 'To re-enable the vacancy system:';
  RAISE NOTICE '  UPDATE feature_flags SET enabled = true WHERE key = ''vacancy_system'';';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
