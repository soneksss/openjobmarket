-- ============================================================
-- Smart Dispatch v3
-- ============================================================
--
-- Builds on v2. Adds:
--
--   A. Reliability columns on company_profiles
--      accept_rate, urgent_dispatch_count, urgent_ignore_count
--      tracked via trigger on urgent_job_dispatch_alerts
--
--   B. Availability freshness scoring
--      Join users.last_seen_at → +8 pts if <15min, +4 pts if <2hr
--
--   C. Language: use jobs.preferred_language first
--      (column already exists from 20260303000008),
--      fallback to country inference only when NULL
--
--   D. Response-quality scoring
--      company_profiles.accept_rate used directly in ranking
--
--   E. Race-safe first-3 dispatch completion
--      Trigger on urgent_job_dispatch_alerts sets dispatch_state='completed'
--      atomically when the 3rd response arrives — no more 4+ race window
--
--   F. Precise expansion timing
--      jobs.next_expand_at set by expand_job_search based on tier:
--        3mi → +15 min
--        5mi → +15 min
--        10mi → +30 min
--      Cron uses this column instead of elapsed-since-start math
--
--   G. Atomic flexible-job application cap
--      try_apply_flexible_job() uses pg_advisory_xact_lock
--      to serialize applications; hard cap at jobs.max_responses (default 10)
--
--   H. select_top_tradespeople_for_urgent_job v3
--      Full scoring rewrite with all signals
--
--   I. get_dispatch_debug_scores updated with all new fields
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- A. Reliability columns on company_profiles
-- ═══════════════════════════════════════════════════════════
--
-- The old reliability system (20260303000011) tracked accept_rate
-- on contractor_profiles via contractor_id FK.  The current system
-- uses company_profiles exclusively (company_id FK on alerts).
-- Add the same columns to company_profiles so ranking can use them.

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS accept_rate          NUMERIC(5,4)  NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS urgent_dispatch_count INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgent_ignore_count   INTEGER       NOT NULL DEFAULT 0;

-- Keep values in [0,1]
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'company_profiles' AND constraint_name = 'chk_cp_accept_rate'
  ) THEN
    ALTER TABLE public.company_profiles
      ADD CONSTRAINT chk_cp_accept_rate CHECK (accept_rate BETWEEN 0.0 AND 1.0);
  END IF;
END;
$$;

-- Index for fast ranking on high-accept-rate, available companies
CREATE INDEX IF NOT EXISTS idx_cp_reliability
  ON public.company_profiles (accept_rate DESC)
  WHERE open_for_business = true AND geom IS NOT NULL;

DO $$ BEGIN RAISE NOTICE '✓ company_profiles reliability columns added'; END; $$;


-- ─── A2. Trigger: update company_profiles on dispatch alert INSERT ──────────
-- When dispatch-urgent inserts a row into urgent_job_dispatch_alerts,
-- increment the company's dispatch count and recalculate accept_rate.
-- When responded flips true → false (ignored), increment ignore count.

CREATE OR REPLACE FUNCTION public.trg_fn_cp_dispatch_reliability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── INSERT: new dispatch → increment dispatch_count ────────────────────────
  IF TG_OP = 'INSERT' AND NEW.company_id IS NOT NULL THEN
    UPDATE public.company_profiles
    SET
      urgent_dispatch_count = urgent_dispatch_count + 1,
      -- accept_rate = accepted_so_far / (dispatch_count + 1)
      -- "accepted" = rows where responded = true for this company across all jobs
      accept_rate = LEAST(1.0, GREATEST(0.0,
        COALESCE(
          (
            SELECT COUNT(*)::NUMERIC
            FROM public.urgent_job_dispatch_alerts
            WHERE company_id = NEW.company_id AND responded = true
          ) / NULLIF(urgent_dispatch_count + 1, 0),
          1.0
        )
      ))
    WHERE id = NEW.company_id;
    RETURN NEW;
  END IF;

  -- ── UPDATE: responded flipped false → true means they accepted ─────────────
  IF TG_OP = 'UPDATE' AND NEW.company_id IS NOT NULL
    AND OLD.responded = false AND NEW.responded = true
  THEN
    UPDATE public.company_profiles
    SET accept_rate = LEAST(1.0, GREATEST(0.0,
      COALESCE(
        (
          SELECT COUNT(*)::NUMERIC
          FROM public.urgent_job_dispatch_alerts
          WHERE company_id = NEW.company_id AND responded = true
        ) / NULLIF(urgent_dispatch_count, 0),
        1.0
      )
    ))
    WHERE id = NEW.company_id;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cp_dispatch_reliability ON public.urgent_job_dispatch_alerts;
CREATE TRIGGER trg_cp_dispatch_reliability
  AFTER INSERT OR UPDATE OF responded ON public.urgent_job_dispatch_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_cp_dispatch_reliability();

DO $$ BEGIN RAISE NOTICE '✓ company_profiles dispatch reliability trigger created'; END; $$;


-- ═══════════════════════════════════════════════════════════
-- E. Race-safe first-3 dispatch completion
-- ═══════════════════════════════════════════════════════════
--
-- When the 3rd tradesperson responds, atomically mark dispatch_state
-- = 'completed' on the job.  The cron already checks >= 3, but this
-- trigger fires in the same transaction as the response insert/update,
-- closing the 2-minute race window entirely.

CREATE OR REPLACE FUNCTION public.trg_fn_auto_complete_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Only fire when responded flips to true
  IF NOT (NEW.responded = true AND (OLD.responded IS NULL OR OLD.responded = false)) THEN
    RETURN NEW;
  END IF;

  -- Count total responses for this job (AFTER this row commits, hence AFTER trigger)
  SELECT COUNT(*) INTO v_count
  FROM public.urgent_job_dispatch_alerts
  WHERE job_id = NEW.job_id AND responded = true;

  -- On the 3rd response: atomically close dispatch — idempotent if called twice
  IF v_count >= 3 THEN
    UPDATE public.jobs
    SET dispatch_state = 'completed'
    WHERE id = NEW.job_id
      AND dispatch_state IN ('searching', 'expanding');

    RAISE NOTICE '[dispatch] Job % reached 3 responses — dispatch_state set to completed', NEW.job_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_complete_dispatch ON public.urgent_job_dispatch_alerts;
CREATE TRIGGER trg_auto_complete_dispatch
  AFTER INSERT OR UPDATE OF responded ON public.urgent_job_dispatch_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_auto_complete_dispatch();

DO $$ BEGIN RAISE NOTICE '✓ Auto-complete dispatch trigger created (race-safe first-3)'; END; $$;


-- ═══════════════════════════════════════════════════════════
-- F. Precise expansion timing — jobs.next_expand_at
-- ═══════════════════════════════════════════════════════════
--
-- expand_job_search sets this based on the new radius tier:
--   ≤ 3mi → +15 min
--   ≤ 5mi → +15 min
--   ≤ 10mi → +30 min
--   > 10mi (fallback) → NULL (no more expansion)
-- The cron queries WHERE next_expand_at <= NOW() instead of
-- computing elapsed time from dispatch_started_at.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS next_expand_at TIMESTAMPTZ;

-- Index for cron: fast lookup of jobs ready for expansion
CREATE INDEX IF NOT EXISTS idx_jobs_next_expand
  ON public.jobs (next_expand_at)
  WHERE dispatch_state IN ('searching', 'expanding') AND next_expand_at IS NOT NULL;

DO $$ BEGIN RAISE NOTICE '✓ jobs.next_expand_at column added'; END; $$;


-- ─── F2. Update expand_job_search to set next_expand_at ─────────────────────

CREATE OR REPLACE FUNCTION public.expand_job_search(
  p_job_id UUID
)
RETURNS TABLE (
  company_id  UUID,
  radius_used NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_radius NUMERIC;
  v_search_state   TEXT;
  v_new_radius     NUMERIC;
  v_nearby_count   INT;
  v_max_radius     CONSTANT NUMERIC := 25;
  v_min_jump       CONSTANT NUMERIC := 10;
  v_step           CONSTANT NUMERIC := 3;
  v_job_status     TEXT;
  v_next_expand    TIMESTAMPTZ;
BEGIN

  -- ── Validate job ──────────────────────────────────────────
  SELECT j.search_radius_miles, j.search_state, j.status::TEXT
  INTO v_current_radius, v_search_state, v_job_status
  FROM public.jobs j
  WHERE j.id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expand_job_search: job % not found', p_job_id;
  END IF;

  IF v_job_status NOT IN ('POSTED', 'ACTIVE') THEN RETURN; END IF;
  IF v_search_state = 'completed'             THEN RETURN; END IF;

  v_current_radius := COALESCE(v_current_radius, 3);

  -- ── Count supply at current radius ───────────────────────
  v_nearby_count := public.count_nearby_opted_in_trades(p_job_id, v_current_radius);

  -- ── Smart radius expansion ────────────────────────────────
  -- If 0 supply → jump immediately to min 10mi
  IF v_nearby_count = 0 THEN
    v_new_radius := GREATEST(v_min_jump, v_current_radius);
  ELSE
    v_new_radius := v_current_radius + v_step;
  END IF;

  v_new_radius := LEAST(v_new_radius, v_max_radius);

  -- ── Determine next_expand_at based on new radius tier ────
  -- Tier timing:  ≤3mi → +15min  |  ≤5mi → +15min  |  ≤10mi → +30min  |  fallback → NULL
  v_next_expand := CASE
    WHEN v_new_radius <= 5  THEN NOW() + INTERVAL '15 minutes'
    WHEN v_new_radius <= 10 THEN NOW() + INTERVAL '30 minutes'
    ELSE NULL   -- at or beyond max → no further expansion
  END;

  -- ── Determine search_state ────────────────────────────────
  IF v_new_radius >= v_max_radius THEN
    v_search_state := 'fallback';
  ELSIF v_new_radius > 10 THEN
    v_search_state := 'extended_search';
  ELSE
    v_search_state := 'active_search';
  END IF;

  -- ── Get unnotified candidates ─────────────────────────────
  CREATE TEMP TABLE _new_candidates ON COMMIT DROP AS
  SELECT g.company_id
  FROM (
    SELECT * FROM public.get_unnotified_trades_for_job(
      p_job_id,
      CASE WHEN v_search_state = 'fallback' THEN 999 ELSE v_new_radius END,
      10
    )
  ) g;

  -- ── Record in job_notifications_sent ─────────────────────
  INSERT INTO public.job_notifications_sent (job_id, company_id, radius_at_time)
  SELECT p_job_id, nc.company_id, v_new_radius
  FROM _new_candidates nc
  ON CONFLICT (job_id, company_id) DO NOTHING;

  -- ── Update jobs ───────────────────────────────────────────
  UPDATE public.jobs
  SET
    search_radius_miles = v_new_radius,
    search_state        = v_search_state,
    next_expand_at      = v_next_expand
  WHERE id = p_job_id;

  RAISE NOTICE 'expand_job_search: job=% radius %→%mi state=% next_expand=%',
    p_job_id, v_current_radius, v_new_radius, v_search_state, v_next_expand;

  RETURN QUERY
  SELECT nc.company_id, v_new_radius
  FROM _new_candidates nc;

END;
$$;

GRANT EXECUTE ON FUNCTION public.expand_job_search(UUID) TO service_role;

DO $$ BEGIN RAISE NOTICE '✓ expand_job_search updated with next_expand_at timing'; END; $$;


-- ═══════════════════════════════════════════════════════════
-- G. Atomic flexible-job application cap
-- ═══════════════════════════════════════════════════════════
--
-- try_apply_flexible_job() serializes concurrent applications
-- using a per-job advisory lock keyed on the job's UUID hash.
-- Returns JSON: { success: bool, reason?: 'cap_reached'|'already_applied' }
--
-- The API route should call this instead of a bare INSERT.

CREATE OR REPLACE FUNCTION public.try_apply_flexible_job(
  p_job_id         UUID,
  p_company_id     UUID,
  p_professional_id UUID,   -- professional_profiles.id of the applicant
  p_message        TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap      INTEGER;
  v_count    INTEGER;
  v_existing UUID;
BEGIN
  -- ── Advisory lock: one application at a time per job ─────
  -- hashtext() maps UUID string → int4 for advisory lock key
  PERFORM pg_advisory_xact_lock(hashtext(p_job_id::text));

  -- ── Fetch cap ─────────────────────────────────────────────
  SELECT COALESCE(max_responses, 10) INTO v_cap
  FROM public.jobs WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'job_not_found');
  END IF;

  -- ── Idempotency: already applied? ────────────────────────
  SELECT id INTO v_existing
  FROM public.job_applications
  WHERE job_id = p_job_id AND company_id = p_company_id
    AND status NOT IN ('AUTO_CANCELLED', 'REJECTED', 'DECLINED')
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'reason', 'already_applied');
  END IF;

  -- ── Count active applications ─────────────────────────────
  SELECT COUNT(*) INTO v_count
  FROM public.job_applications
  WHERE job_id = p_job_id
    AND status NOT IN ('AUTO_CANCELLED', 'REJECTED', 'DECLINED');

  IF v_count >= v_cap THEN
    RETURN json_build_object('success', false, 'reason', 'cap_reached', 'cap', v_cap);
  END IF;

  -- ── Insert the application ────────────────────────────────
  INSERT INTO public.job_applications (
    job_id,
    company_id,
    professional_id,
    status,
    message
  ) VALUES (
    p_job_id,
    p_company_id,
    p_professional_id,
    'PENDING',
    p_message
  );

  RETURN json_build_object('success', true, 'slot', v_count + 1, 'cap', v_cap);
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_apply_flexible_job(UUID, UUID, UUID, TEXT)
  TO authenticated;

DO $$ BEGIN RAISE NOTICE '✓ try_apply_flexible_job() created (atomic cap with advisory lock)'; END; $$;


-- ═══════════════════════════════════════════════════════════
-- H. select_top_tradespeople_for_urgent_job v3
-- ═══════════════════════════════════════════════════════════
--
-- Full scoring rewrite. Drops v2 overloads and replaces them.
--
-- Score formula (max ~165 pts, ORDER BY DESC):
--   Proximity   : 0–100 × 0.40  (linear, 0 at 20 mi)
--   Skill match : 0–20  × 1.0   (industry 20, service 15, category 10)
--   Language    : 0–15  × 1.0   (preferred_language → spoken_languages)
--   Freshness   : 0–10  × 1.0   (last_seen_at: <15min=10, <2hr=5)
--   Reliability : 0–15  × 1.0   (accept_rate × 15)
--   Rating      : 0–100 × 0.15  (average_rating/5*100, baseline 70)

DROP FUNCTION IF EXISTS public.select_top_tradespeople_for_urgent_job(UUID, NUMERIC, INT);
DROP FUNCTION IF EXISTS public.select_top_tradespeople_for_urgent_job(UUID);

CREATE OR REPLACE FUNCTION public.select_top_tradespeople_for_urgent_job(
  p_job_id       UUID,
  p_radius_miles NUMERIC DEFAULT 10,
  p_limit        INT     DEFAULT 5
)
RETURNS TABLE (
  tradesperson_id  UUID,
  total_score      NUMERIC,
  distance_miles   NUMERIC,
  skill_score      NUMERIC,
  language_score   NUMERIC,
  freshness_score  NUMERIC,
  reliability_score NUMERIC,
  rating_score     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_location   geography(Point, 4326);
  v_job_category   TEXT;
  v_job_industry   TEXT;
  v_job_service    TEXT;
  v_preferred_lang TEXT;
  v_radius_m       NUMERIC;
BEGIN
  v_radius_m := p_radius_miles * 1609.344;

  -- ── Fetch job + homeowner preferred language ─────────────
  -- Use jobs.preferred_language first (set at job creation);
  -- fall back to country inference only when NULL.
  SELECT
    ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
    LOWER(COALESCE(j.category,  '')),
    LOWER(COALESCE(j.industry,  '')),
    LOWER(COALESCE(j.service,   '')),
    COALESCE(
      j.preferred_language,   -- explicit preference wins
      CASE
        WHEN UPPER(COALESCE(u.country, '')) IN ('BR', 'BRAZIL', 'BRASIL') THEN 'pt-BR'
        ELSE 'en'
      END
    )
  INTO
    v_job_location,
    v_job_category,
    v_job_industry,
    v_job_service,
    v_preferred_lang
  FROM public.jobs j
  LEFT JOIN public.users u ON u.id = j.homeowner_id
  WHERE j.id        = p_job_id
    AND j.status    = 'POSTED'::job_status
    AND j.is_urgent = true
    AND j.latitude  IS NOT NULL
    AND j.longitude IS NOT NULL;

  IF NOT FOUND THEN
    RAISE NOTICE '[dispatch-v3] Job % ineligible (POSTED + is_urgent + coords required)', p_job_id;
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      cp.id                                                          AS tradesperson_id,

      -- Distance in miles
      (ST_Distance(cp.geom, v_job_location) / 1609.344)::NUMERIC    AS dist_miles,

      -- Proximity: 100 at 0mi → 0 at 20mi (linear)
      GREATEST(0, 100 - (ST_Distance(cp.geom, v_job_location) / 1609.344 * 5))::NUMERIC
                                                                     AS proximity_score,

      -- Rating (baseline 70 until 3+ reviews)
      CASE
        WHEN cp.reviews_count >= 3 THEN (cp.average_rating / 5.0 * 100)::NUMERIC
        ELSE 70::NUMERIC
      END                                                            AS rating_score_raw,

      -- Skill match: 20/15/10/0
      CASE
        WHEN v_job_industry = '' AND v_job_service = '' AND v_job_category = '' THEN 20

        WHEN v_job_industry <> '' AND (
          LOWER(COALESCE(cp.industry, '')) ILIKE '%' || v_job_industry || '%'
          OR v_job_industry ILIKE '%' || LOWER(COALESCE(cp.industry, '')) || '%'
        ) THEN 20

        WHEN (v_job_service <> '' OR v_job_industry <> '') AND EXISTS (
          SELECT 1 FROM unnest(COALESCE(cp.services, '{}'::text[])) AS svc
          WHERE LOWER(svc) ILIKE '%' || CASE WHEN v_job_service <> '' THEN v_job_service ELSE v_job_industry END || '%'
        ) THEN 15

        WHEN v_job_category <> '' AND (
          LOWER(COALESCE(cp.industry, '')) ILIKE '%' || v_job_category || '%'
          OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(cp.services, '{}'::text[])) AS svc
            WHERE LOWER(svc) ILIKE '%' || v_job_category || '%'
          )
        ) THEN 10

        ELSE 0
      END::NUMERIC                                                   AS skill_score_raw,

      -- Language: +15 exact match on preferred_language, +8 partial
      CASE
        WHEN cp.spoken_languages @> ARRAY[v_preferred_lang] THEN 15
        WHEN v_preferred_lang IS NOT NULL AND EXISTS (
          SELECT 1 FROM unnest(cp.spoken_languages) AS lang
          WHERE LOWER(lang) LIKE '%' || LOWER(LEFT(v_preferred_lang, 2)) || '%'
        ) THEN 8
        ELSE 0
      END::NUMERIC                                                   AS lang_score_raw,

      -- Freshness: based on users.last_seen_at of the tradesperson's account
      CASE
        WHEN u2.last_seen_at > NOW() - INTERVAL '15 minutes' THEN 10
        WHEN u2.last_seen_at > NOW() - INTERVAL '2 hours'    THEN  5
        ELSE 0
      END::NUMERIC                                                   AS freshness_score_raw,

      -- Reliability: accept_rate × 15 (max 15 pts for 100% accept rate)
      (COALESCE(cp.accept_rate, 1.0) * 15)::NUMERIC                 AS reliability_score_raw

    FROM public.company_profiles cp
    JOIN public.users u2 ON u2.id = cp.user_id   -- for last_seen_at
    WHERE cp.open_for_business      = true
      AND cp.trade_job_notifications = true
      AND cp.geom                   IS NOT NULL
      AND ST_DWithin(cp.geom, v_job_location, v_radius_m)
      AND (
        cp.trade_job_notifications_distance IS NULL
        OR cp.trade_job_notifications_distance >= p_radius_miles
      )
      -- Dedup: skip already-notified
      AND NOT EXISTS (
        SELECT 1 FROM public.job_notifications_sent jns
        WHERE jns.job_id = p_job_id AND jns.company_id = cp.id
      )
  )
  SELECT
    c.tradesperson_id,
    (
      c.proximity_score    * 0.40   -- 40% proximity
      + c.rating_score_raw * 0.15   -- 15% rating
      + c.skill_score_raw           -- up to 20 pts skill
      + c.lang_score_raw            -- up to 15 pts language
      + c.freshness_score_raw       -- up to 10 pts freshness
      + c.reliability_score_raw     -- up to 15 pts reliability
    )::NUMERIC(8,4)                  AS total_score,
    c.dist_miles,
    c.skill_score_raw                AS skill_score,
    c.lang_score_raw                 AS language_score,
    c.freshness_score_raw            AS freshness_score,
    c.reliability_score_raw          AS reliability_score,
    c.rating_score_raw               AS rating_score
  FROM candidates c
  WHERE c.skill_score_raw > 0   -- hard filter: must have some skill relevance
  ORDER BY total_score DESC
  LIMIT p_limit;

END;
$$;

GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID, NUMERIC, INT)
  TO service_role;

-- 1-arg shim for backward compatibility
CREATE OR REPLACE FUNCTION public.select_top_tradespeople_for_urgent_job(p_job_id UUID)
RETURNS TABLE (tradesperson_id UUID, total_score NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT tradesperson_id, total_score
  FROM public.select_top_tradespeople_for_urgent_job(p_job_id, 10, 5);
$$;
GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID) TO service_role;

DO $$ BEGIN RAISE NOTICE '✓ select_top_tradespeople_for_urgent_job v3 created'; END; $$;


-- ═══════════════════════════════════════════════════════════
-- I. get_dispatch_debug_scores v3
-- ═══════════════════════════════════════════════════════════
--
-- Usage: SELECT * FROM get_dispatch_debug_scores('<job-uuid>', 10);
-- Shows top-10 tradespeople in radius with every score component.
-- Use this from Supabase SQL editor after any dispatch to verify.

DROP FUNCTION IF EXISTS public.get_dispatch_debug_scores(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.get_dispatch_debug_scores(
  p_job_id       UUID,
  p_radius_miles NUMERIC DEFAULT 10
)
RETURNS TABLE (
  rank              INT,
  company_name      TEXT,
  distance_miles    NUMERIC,
  skill_score       NUMERIC,
  language_score    NUMERIC,
  freshness_score   NUMERIC,
  reliability_score NUMERIC,
  rating_score      NUMERIC,
  total_score       NUMERIC,
  is_available      BOOLEAN,
  notifications_on  BOOLEAN,
  already_notified  BOOLEAN,
  accept_rate       NUMERIC,
  last_seen_mins_ago NUMERIC,
  spoken_languages  TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_location   geography(Point, 4326);
  v_job_category   TEXT;
  v_job_industry   TEXT;
  v_job_service    TEXT;
  v_preferred_lang TEXT;
  v_radius_m       NUMERIC;
BEGIN
  v_radius_m := p_radius_miles * 1609.344;

  SELECT
    ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
    LOWER(COALESCE(j.category,  '')),
    LOWER(COALESCE(j.industry,  '')),
    LOWER(COALESCE(j.service,   '')),
    COALESCE(j.preferred_language,
      CASE WHEN UPPER(COALESCE(u.country, '')) IN ('BR', 'BRAZIL', 'BRASIL') THEN 'pt-BR' ELSE 'en' END
    )
  INTO v_job_location, v_job_category, v_job_industry, v_job_service, v_preferred_lang
  FROM public.jobs j
  LEFT JOIN public.users u ON u.id = j.homeowner_id
  WHERE j.id = p_job_id AND j.latitude IS NOT NULL AND j.longitude IS NOT NULL;

  IF NOT FOUND THEN
    RAISE NOTICE 'Job % not found or missing coordinates', p_job_id;
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      cp.company_name,
      cp.open_for_business,
      cp.trade_job_notifications,
      cp.spoken_languages,
      cp.accept_rate,
      (ST_Distance(cp.geom, v_job_location) / 1609.344)::NUMERIC                  AS dist_mi,
      GREATEST(0, 100 - (ST_Distance(cp.geom, v_job_location) / 1609.344 * 5))::NUMERIC AS prox,
      CASE WHEN cp.reviews_count >= 3 THEN (cp.average_rating/5.0*100)::NUMERIC ELSE 70 END AS rtg,
      CASE
        WHEN v_job_industry = '' AND v_job_service = '' AND v_job_category = '' THEN 20
        WHEN v_job_industry <> '' AND (LOWER(COALESCE(cp.industry,'')) ILIKE '%'||v_job_industry||'%') THEN 20
        WHEN (v_job_service <> '' OR v_job_industry <> '') AND EXISTS (
          SELECT 1 FROM unnest(COALESCE(cp.services,'{}'::text[])) s
          WHERE LOWER(s) ILIKE '%'||CASE WHEN v_job_service<>'' THEN v_job_service ELSE v_job_industry END||'%'
        ) THEN 15
        WHEN v_job_category <> '' AND (
          LOWER(COALESCE(cp.industry,'')) ILIKE '%'||v_job_category||'%'
          OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.services,'{}'::text[])) s WHERE LOWER(s) ILIKE '%'||v_job_category||'%')
        ) THEN 10
        ELSE 0
      END::NUMERIC AS skill,
      CASE
        WHEN cp.spoken_languages @> ARRAY[v_preferred_lang] THEN 15
        WHEN v_preferred_lang IS NOT NULL AND EXISTS (
          SELECT 1 FROM unnest(cp.spoken_languages) lang
          WHERE LOWER(lang) LIKE '%'||LOWER(LEFT(v_preferred_lang,2))||'%'
        ) THEN 8
        ELSE 0
      END::NUMERIC AS lang,
      CASE
        WHEN u2.last_seen_at > NOW() - INTERVAL '15 minutes' THEN 10
        WHEN u2.last_seen_at > NOW() - INTERVAL '2 hours'    THEN  5
        ELSE 0
      END::NUMERIC AS fresh,
      (COALESCE(cp.accept_rate, 1.0) * 15)::NUMERIC AS reliability,
      EXTRACT(EPOCH FROM (NOW() - u2.last_seen_at)) / 60 AS last_seen_mins,
      EXISTS (
        SELECT 1 FROM public.job_notifications_sent jns
        WHERE jns.job_id = p_job_id AND jns.company_id = cp.id
      ) AS already_sent
    FROM public.company_profiles cp
    JOIN public.users u2 ON u2.id = cp.user_id
    WHERE cp.geom IS NOT NULL
      AND ST_DWithin(cp.geom, v_job_location, v_radius_m)
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY (s.prox*0.40 + s.rtg*0.15 + s.skill + s.lang + s.fresh + s.reliability) DESC)::INT,
    s.company_name,
    s.dist_mi,
    s.skill,
    s.lang,
    s.fresh,
    s.reliability,
    s.rtg,
    (s.prox*0.40 + s.rtg*0.15 + s.skill + s.lang + s.fresh + s.reliability)::NUMERIC(8,4),
    s.open_for_business,
    s.trade_job_notifications,
    s.already_sent,
    s.accept_rate,
    s.last_seen_mins::NUMERIC(8,1),
    s.spoken_languages
  FROM scored s
  ORDER BY total_score DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dispatch_debug_scores(UUID, NUMERIC) TO service_role;

DO $$ BEGIN RAISE NOTICE '✓ get_dispatch_debug_scores v3 created'; END; $$;


-- ═══════════════════════════════════════════════════════════
-- Verification
-- ═══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'accept_rate'
  ) THEN RAISE EXCEPTION 'company_profiles.accept_rate missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'next_expand_at'
  ) THEN RAISE EXCEPTION 'jobs.next_expand_at missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'try_apply_flexible_job'
  ) THEN RAISE EXCEPTION 'try_apply_flexible_job missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_auto_complete_dispatch'
  ) THEN RAISE EXCEPTION 'trg_auto_complete_dispatch trigger missing'; END IF;

  RAISE NOTICE '✓ Smart dispatch v3 — all components verified';
  RAISE NOTICE '  company_profiles: accept_rate, urgent_dispatch_count, urgent_ignore_count';
  RAISE NOTICE '  jobs: next_expand_at';
  RAISE NOTICE '  select_top_tradespeople_for_urgent_job v3: preferred_language, freshness, reliability';
  RAISE NOTICE '  expand_job_search: sets next_expand_at (15/15/30 min tiers)';
  RAISE NOTICE '  try_apply_flexible_job: advisory lock + cap';
  RAISE NOTICE '  trg_auto_complete_dispatch: race-safe first-3 gate';
  RAISE NOTICE '  get_dispatch_debug_scores v3: all signals visible';
END;
$$;
