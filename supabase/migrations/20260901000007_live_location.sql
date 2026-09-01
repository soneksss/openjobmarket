-- ============================================================================
-- Tradesperson live location — "Available now" drives a temporary GPS position
-- Date: 2026-09-01
--
-- company_profiles.latitude/longitude is the PERMANENT business location and is
-- never touched by GPS. While "Available now" (urgent_notifications_enabled) is
-- ON, the device streams its position into tradesperson_live_locations. The
-- public map shows a live green van there, and job-matching RPCs use that
-- position instead of the business location while it stays fresh (< 120 s).
--
-- Turning "Available now" OFF (manual toggle OR the existing 9:00 AM
-- expire-availability cron) flips is_active = false via a trigger on
-- company_profiles — no cron/route changes needed.
-- ============================================================================

-- ── 1. Table ────────────────────────────────────────────────────────────────
-- One row per tradesperson (PK = company_id) → exactly one live record each.

CREATE TABLE IF NOT EXISTS public.tradesperson_live_locations (
  company_id  uuid PRIMARY KEY REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude    double precision NOT NULL,
  longitude   double precision NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tll_active_fresh
  ON public.tradesperson_live_locations (updated_at)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_tll_active_bbox
  ON public.tradesperson_live_locations (latitude, longitude)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_tll_user
  ON public.tradesperson_live_locations (user_id);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
-- Owner-only for every operation. The public map (/api/traders) uses the
-- service-role client and every matching function is SECURITY DEFINER, so no
-- broader SELECT policy is required.

ALTER TABLE public.tradesperson_live_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tll_select_own ON public.tradesperson_live_locations;
CREATE POLICY tll_select_own ON public.tradesperson_live_locations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS tll_insert_own ON public.tradesperson_live_locations;
CREATE POLICY tll_insert_own ON public.tradesperson_live_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS tll_update_own ON public.tradesperson_live_locations;
CREATE POLICY tll_update_own ON public.tradesperson_live_locations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS tll_delete_own ON public.tradesperson_live_locations;
CREATE POLICY tll_delete_own ON public.tradesperson_live_locations
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tradesperson_live_locations TO authenticated;

-- ── 3. Deactivation trigger ─────────────────────────────────────────────────
-- When a company goes "not available" (open_for_business OR
-- urgent_notifications_enabled true→false) — from the toggle, the client
-- expiry guard, or the 9:00 AM cron — deactivate its live row in the same
-- statement. Never re-activates: the client re-creates an active row on the
-- next GPS ping when the tradesperson turns "Available now" back on.

CREATE OR REPLACE FUNCTION public.deactivate_live_location_on_unavailable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(OLD.open_for_business, false)           AND NOT COALESCE(NEW.open_for_business, false))
  OR (COALESCE(OLD.urgent_notifications_enabled, false) AND NOT COALESCE(NEW.urgent_notifications_enabled, false))
  THEN
    UPDATE public.tradesperson_live_locations
    SET    is_active = false
    WHERE  company_id = NEW.id AND is_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deactivate_live_location ON public.company_profiles;
CREATE TRIGGER trg_deactivate_live_location
AFTER UPDATE OF open_for_business, urgent_notifications_enabled ON public.company_profiles
FOR EACH ROW
EXECUTE FUNCTION public.deactivate_live_location_on_unavailable();

-- ============================================================================
-- 4. Matching RPCs — use the live position when Available now + fresh (<120 s),
--    otherwise fall back to the permanent business location.
--    Each function below is the current definition, verbatim, with only:
--      • a LEFT JOIN tradesperson_live_locations tll
--      • cp.latitude  -> COALESCE(tll.latitude,  cp.latitude)   in haversines
--      • cp.longitude -> COALESCE(tll.longitude, cp.longitude)  in haversines
--    The `cp.latitude IS NOT NULL` guards stay on the business columns — a
--    candidate still needs a business location on file.
-- ============================================================================

-- Shared join clause (documentation):
--   LEFT JOIN tradesperson_live_locations tll
--     ON tll.company_id = cp.id
--    AND tll.is_active
--    AND tll.updated_at > now() - interval '120 seconds'


-- ── 4a. find_companies_for_flexible_dispatch (was 20260901000004) ───────────

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
          cos(radians(p_job_lat)) * cos(radians(COALESCE(tll.latitude, cp.latitude)))
          * cos(radians(COALESCE(tll.longitude, cp.longitude)) - radians(p_job_lon))
          + sin(radians(p_job_lat)) * sin(radians(COALESCE(tll.latitude, cp.latitude)))
        )
      ))::float        AS dist_mi
    FROM company_profiles cp
    LEFT JOIN tradesperson_live_locations tll
      ON tll.company_id = cp.id
     AND tll.is_active
     AND tll.updated_at > now() - interval '120 seconds'
    WHERE COALESCE(cp.flexible_notifications_enabled, cp.flexible_job_notifications, true) = true
      AND cp.latitude  IS NOT NULL
      AND cp.longitude IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM job_notifications_sent jns
        WHERE  jns.job_id = p_job_id AND jns.company_id = cp.id
      )
      AND (
        (p_industry IS NULL AND p_service IS NULL)
        OR (p_industry IS NOT NULL AND cp.industry ILIKE '%' || p_industry || '%')
        OR (p_industry IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(COALESCE(cp.industries, ARRAY[]::text[])) ind
              WHERE ind ILIKE '%' || p_industry || '%'
                 OR p_industry ILIKE '%' || ind || '%'
            ))
        OR (p_service  IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(cp.services) svc
              WHERE svc ILIKE '%' || p_service  || '%'
                 OR svc ILIKE '%' || COALESCE(p_industry, '') || '%'
            ))
      )
  )
  SELECT company_id, user_id, company_name, dist_mi AS distance_miles
  FROM   candidates
  WHERE  dist_mi <= trade_job_notifications_distance
  ORDER  BY dist_mi ASC;
$$;

GRANT EXECUTE ON FUNCTION public.find_companies_for_flexible_dispatch(UUID, FLOAT, FLOAT, TEXT, TEXT)
  TO anon, authenticated;


-- ── 4b. find_companies_for_trade_job_notification (was 20260901000002) ──────

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
        cos(radians(p_job_lat)) * cos(radians(COALESCE(tll.latitude, cp.latitude))) *
        cos(radians(COALESCE(tll.longitude, cp.longitude)) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(COALESCE(tll.latitude, cp.latitude)))
      ))
    )) AS distance_miles
  FROM company_profiles cp
  JOIN users u ON u.id = cp.user_id
  LEFT JOIN tradesperson_live_locations tll
    ON tll.company_id = cp.id
   AND tll.is_active
   AND tll.updated_at > now() - interval '120 seconds'
  WHERE
    cp.trade_job_notifications = true
    AND cp.latitude  IS NOT NULL
    AND cp.longitude IS NOT NULL
    AND (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_job_lat)) * cos(radians(COALESCE(tll.latitude, cp.latitude))) *
        cos(radians(COALESCE(tll.longitude, cp.longitude)) - radians(p_job_lon)) +
        sin(radians(p_job_lat)) * sin(radians(COALESCE(tll.latitude, cp.latitude)))
      ))
    )) <= COALESCE(cp.trade_job_notifications_distance, 10)

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

    AND cp.id NOT IN (
      SELECT j.company_id FROM jobs j
      WHERE j.id = p_job_id AND j.company_id IS NOT NULL
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

GRANT EXECUTE ON FUNCTION find_companies_for_trade_job_notification(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT, TEXT)
  TO authenticated, service_role;


-- ── 4c. select_top_tradespeople_for_urgent_job (was 20260414000007) ────────

CREATE OR REPLACE FUNCTION public.select_top_tradespeople_for_urgent_job(
  p_job_id       UUID,
  p_radius_miles NUMERIC DEFAULT 10,
  p_limit        INT     DEFAULT 5
)
RETURNS TABLE (
  tradesperson_id   UUID,
  total_score       NUMERIC,
  distance_miles    NUMERIC,
  skill_score       NUMERIC,
  language_score    NUMERIC,
  freshness_score   NUMERIC,
  reliability_score NUMERIC,
  rating_score      NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_lat        NUMERIC;
  v_job_lon        NUMERIC;
  v_job_industry   TEXT;
  v_job_service    TEXT;
  v_job_category   TEXT;
  v_preferred_lang TEXT;
  v_job_country    TEXT;
  v_homeowner_lang TEXT;
BEGIN
  SELECT latitude, longitude, industry, service, category, preferred_language
  INTO   v_job_lat, v_job_lon, v_job_industry, v_job_service, v_job_category, v_preferred_lang
  FROM   jobs
  WHERE  id = p_job_id;

  IF v_job_lat IS NULL OR v_job_lon IS NULL THEN
    RETURN;
  END IF;

  IF v_preferred_lang IS NULL THEN
    SELECT u.country INTO v_job_country
    FROM   jobs j
    JOIN   auth.users u ON u.id = j.user_id
    WHERE  j.id = p_job_id;

    v_homeowner_lang := CASE WHEN v_job_country = 'BR' THEN 'pt-BR' ELSE 'en' END;
  ELSE
    v_homeowner_lang := v_preferred_lang;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      cp.id                                                                AS cp_id,
      cp.spoken_languages,
      cp.trade_job_notifications_distance,
      COALESCE(cp.average_rating, 0)::NUMERIC                             AS avg_rating,
      COALESCE(cp.accept_rate,    1.0)::NUMERIC                           AS a_rate,
      u.last_seen_at,
      (3958.8 * acos(
        LEAST(1.0,
          cos(radians(v_job_lat)) * cos(radians(COALESCE(tll.latitude, cp.latitude)))
          * cos(radians(COALESCE(tll.longitude, cp.longitude)) - radians(v_job_lon))
          + sin(radians(v_job_lat)) * sin(radians(COALESCE(tll.latitude, cp.latitude)))
        )
      ))::NUMERIC                                                          AS dist_mi
    FROM  company_profiles cp
    LEFT  JOIN auth.users u ON u.id = cp.user_id
    LEFT  JOIN tradesperson_live_locations tll
      ON tll.company_id = cp.id
     AND tll.is_active
     AND tll.updated_at > now() - interval '120 seconds'
    WHERE cp.open_for_business          = true
      AND cp.trade_job_notifications    = true
      AND cp.latitude  IS NOT NULL
      AND cp.longitude IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM job_notifications_sent jns
        WHERE  jns.job_id = p_job_id AND jns.company_id = cp.id
      )
      AND (
        (v_job_industry IS NULL AND v_job_service IS NULL AND v_job_category IS NULL)
        OR (v_job_industry IS NOT NULL AND cp.industry ILIKE '%' || v_job_industry || '%')
        OR (v_job_service  IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(cp.services) s
              WHERE  s ILIKE '%' || v_job_service || '%'
            ))
        OR (v_job_category IS NOT NULL AND (
              cp.industry ILIKE '%' || v_job_category || '%'
              OR EXISTS (
                SELECT 1 FROM unnest(cp.services) s
                WHERE  s ILIKE '%' || v_job_category || '%'
              )
            ))
      )
  ),
  in_range AS (
    SELECT * FROM candidates
    WHERE dist_mi <= p_radius_miles
      AND dist_mi <= trade_job_notifications_distance
  ),
  scored AS (
    SELECT
      cp_id,
      dist_mi,
      ROUND(GREATEST(0, 40.0 * (1.0 - dist_mi / NULLIF(p_radius_miles, 0))), 2)  AS prox_score,
      ROUND(LEAST(15, avg_rating * 3.0), 2)                                        AS rat_score,
      20::NUMERIC                                                                   AS skl_score,
      CASE
        WHEN spoken_languages IS NOT NULL
         AND v_homeowner_lang = ANY(spoken_languages) THEN 15
        ELSE 0
      END::NUMERIC                                                                  AS lang_score,
      CASE
        WHEN last_seen_at > NOW() - INTERVAL '15 minutes' THEN 10
        WHEN last_seen_at > NOW() - INTERVAL '2 hours'    THEN 5
        ELSE 0
      END::NUMERIC                                                                  AS fresh_score,
      ROUND(a_rate * 15.0, 2)                                                       AS rel_score
    FROM in_range
  )
  SELECT
    s.cp_id                                                                    AS tradesperson_id,
    s.prox_score + s.rat_score + s.skl_score + s.lang_score
      + s.fresh_score + s.rel_score                                            AS total_score,
    s.dist_mi                                                                  AS distance_miles,
    s.skl_score                                                                AS skill_score,
    s.lang_score                                                               AS language_score,
    s.fresh_score                                                              AS freshness_score,
    s.rel_score                                                                AS reliability_score,
    s.rat_score                                                                AS rating_score
  FROM scored s
  ORDER BY total_score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID, NUMERIC, INT)
  TO anon, authenticated;

DO $$ BEGIN
  RAISE NOTICE 'tradesperson_live_locations created; flexible/notification/urgent matching now prefer a fresh live position';
END $$;
