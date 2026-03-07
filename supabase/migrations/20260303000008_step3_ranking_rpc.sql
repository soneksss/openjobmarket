-- ============================================================
-- Migration: Step 3 — Weighted ranking RPC for urgent jobs
--            select_top_tradespeople_for_urgent_job()
-- ============================================================
--
-- Adapts the provided template to this project's schema.
--
-- Column mapping (template → actual):
--   profiles p              → contractor_profiles cp
--   p.location geography    → cp.geom  geography(Point, 4326)  [Step 2]
--   p.availability          → cp.available_247
--   p.avg_rating            → cp.average_rating  DECIMAL(3,2)
--   p.rating_count          → cp.reviews_count   INTEGER
--   p.languages             → cp.languages       TEXT[]
--   p.accept_rate           → cp.accept_rate     NUMERIC(5,4)  [Step 1]
--   p.completion_rate       → cp.completion_rate NUMERIC(5,4)  [Step 1]
--   jobs.location geography → derived: ST_MakePoint(j.longitude, j.latitude)
--   jobs.preferred_language → j.preferred_language TEXT        [added below]
--   tradesperson_id (output)→ contractor_profiles.id
--
-- Scoring weights (unchanged from spec):
--   40 % — distance    (0–100, linear decay: -5 pts per km, floor 0)
--   25 % — language    (100 if language match, 0 otherwise)
--   25 % — rating      (avg_rating/5 × 100, baseline 70 if < 3 reviews)
--   10 % — reliability ((accept_rate × 0.5 + completion_rate × 0.5) × 100)
--    +      randomness  (random() × 5, anti-starvation tiebreaker)
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  A. Add preferred_language to jobs
--     NULL = no language preference; every candidate scores 0
--     on the language component, so all are treated equally.
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS preferred_language TEXT;

COMMENT ON COLUMN public.jobs.preferred_language IS
  'Optional language preference for this job (ISO 639-1 code or free text). '
  'When set, contractors whose languages[] contains this value receive a +25 '
  'language-score bonus in the urgent-job ranking. NULL = no preference.';

DO $$ BEGIN
  RAISE NOTICE '✓ jobs.preferred_language column ensured';
END; $$;


-- ════════════════════════════════════════════════════════════
--  B. select_top_tradespeople_for_urgent_job()
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.select_top_tradespeople_for_urgent_job(
  p_job_id UUID
)
RETURNS TABLE (
  tradesperson_id UUID,
  total_score     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_location geography(Point, 4326);
  v_language     TEXT;
BEGIN

  -- ── Validate job and load location + language preference ────
  -- jobs.latitude / longitude → build geography point on the fly.
  -- (jobs may also have a geom geometry column from an earlier
  --  migration; we use geography here for metric accuracy.)

  SELECT
    ST_SetSRID(
      ST_MakePoint(j.longitude, j.latitude), 4326
    )::geography,
    j.preferred_language
  INTO
    v_job_location,
    v_language
  FROM public.jobs j
  WHERE j.id            = p_job_id
    AND j.status        = 'POSTED'
    AND j.is_urgent     = true
    AND j.latitude      IS NOT NULL
    AND j.longitude     IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Invalid job for dispatch: job % must exist, status = POSTED, '
      'is_urgent = true, and have coordinates set.',
      p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Ranked top-5 query ───────────────────────────────────────
  RETURN QUERY
  WITH candidates AS (
    SELECT
      cp.id AS tradesperson_id,

      -- Distance in km (geography → metres; divide by 1 000)
      ST_Distance(cp.geom, v_job_location) / 1000.0  AS distance_km,

      -- Language score: 100 if job language matches any contractor language,
      -- 0 otherwise.  When v_language IS NULL the CASE falls to else → 0,
      -- so NULL preference means nobody is penalised or rewarded.
      CASE
        WHEN v_language IS NOT NULL
         AND v_language = ANY(cp.languages) THEN 100
        ELSE 0
      END::NUMERIC                                    AS language_score,

      -- Rating score: proportional when ≥ 3 reviews, baseline 70 otherwise
      CASE
        WHEN cp.reviews_count >= 3
          THEN (cp.average_rating / 5.0) * 100
        ELSE 70  -- neutral baseline for new / unrated contractors
      END::NUMERIC                                    AS rating_score,

      -- Reliability score: equal weight on accept_rate + completion_rate
      (
        (COALESCE(cp.accept_rate,     1.0) * 0.5) +
        (COALESCE(cp.completion_rate, 1.0) * 0.5)
      ) * 100                                         AS reliability_score

    FROM public.contractor_profiles cp
    WHERE cp.available_247  = true
      AND cp.geom            IS NOT NULL
      AND ST_DWithin(
            cp.geom,
            v_job_location,
            20000   -- 20 km hard radius (metres)
          )
  ),

  scored AS (
    SELECT
      c.tradesperson_id,
      (
        -- Distance component  (40 %)
        GREATEST(0, 100 - (c.distance_km * 5)) * 0.40

        -- Language component  (25 %)
        + c.language_score                      * 0.25

        -- Rating component    (25 %)
        + c.rating_score                        * 0.25

        -- Reliability component (10 %)
        + c.reliability_score                   * 0.10

        -- Anti-starvation randomness (max +5, non-weighted)
        + (random() * 5)
      )::NUMERIC(8,4)                             AS total_score
    FROM candidates c
  )

  SELECT
    s.tradesperson_id,
    s.total_score
  FROM scored s
  ORDER BY s.total_score DESC
  LIMIT 5;

END;
$$;

COMMENT ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID) IS
  'Scores all available contractors within 20 km of the given urgent POSTED '
  'job and returns the top 5 by weighted score. '
  'Weights: 40% distance, 25% language, 25% rating, 10% reliability, +5 random. '
  'Called by the dispatch system after a new urgent job is created.';

GRANT EXECUTE ON FUNCTION public.select_top_tradespeople_for_urgent_job(UUID)
  TO service_role;
-- Not granted to authenticated — dispatching is a server-side operation only.

DO $$ BEGIN
  RAISE NOTICE '✓ select_top_tradespeople_for_urgent_job() created';
END; $$;


-- ════════════════════════════════════════════════════════════
--  C. Supporting index — partial on status + is_urgent
--     (already partially covered by idx_jobs_status in the
--      reviews migration; this targets the dispatch hot path)
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_jobs_urgent_dispatch
  ON public.jobs (id, latitude, longitude, preferred_language)
  WHERE status    = 'POSTED'
    AND is_urgent = true
    AND latitude  IS NOT NULL
    AND longitude IS NOT NULL;

DO $$ BEGIN
  RAISE NOTICE '✓ idx_jobs_urgent_dispatch index created';
END; $$;


-- ════════════════════════════════════════════════════════════
--  D. Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_col_pref_lang  BOOLEAN;
  v_fn_exists      BOOLEAN;
  v_idx_dispatch   BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name  = 'jobs'
      AND column_name = 'preferred_language'
  ) INTO v_col_pref_lang;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'select_top_tradespeople_for_urgent_job'
      AND n.nspname = 'public'
  ) INTO v_fn_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'jobs'
      AND indexname  = 'idx_jobs_urgent_dispatch'
  ) INTO v_idx_dispatch;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Step 3 — Ranking RPC';
  RAISE NOTICE '  jobs.preferred_language column             : %', CASE WHEN v_col_pref_lang THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  select_top_tradespeople_for_urgent_job()   : %', CASE WHEN v_fn_exists     THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  idx_jobs_urgent_dispatch index             : %', CASE WHEN v_idx_dispatch  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_col_pref_lang AND v_fn_exists AND v_idx_dispatch) THEN
    RAISE EXCEPTION 'Step 3 verification failed — see NOTICE output above';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Step 3 complete: ranking RPC ready';
  RAISE NOTICE '';
  RAISE NOTICE 'Scoring breakdown:';
  RAISE NOTICE '  40 %% — distance    (100 - dist_km×5, floor 0)';
  RAISE NOTICE '  25 %% — language    (100 if match, 0 otherwise)';
  RAISE NOTICE '  25 %% — rating      (avg/5×100, baseline 70 if <3 reviews)';
  RAISE NOTICE '  10 %% — reliability ((accept_rate×0.5 + completion_rate×0.5)×100)';
  RAISE NOTICE '   +     randomness   (random()×5 anti-starvation tiebreaker)';
  RAISE NOTICE '';
  RAISE NOTICE 'Call pattern:';
  RAISE NOTICE '  SELECT * FROM select_top_tradespeople_for_urgent_job(''<job-uuid>'');';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Step 4 — dispatch loop / notification trigger';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
