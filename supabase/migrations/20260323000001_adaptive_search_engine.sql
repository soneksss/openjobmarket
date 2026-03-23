-- ============================================================
-- Adaptive Job Search Engine
-- ============================================================
--
-- Adds the missing pieces for smart radius expansion:
--
--   1. job_notifications_sent          — lightweight dedup table
--   2. count_nearby_opted_in_trades()  — "is there supply here?"
--   3. get_unnotified_trades_for_job() — new candidates not yet notified
--   4. expand_job_search()             — the adaptive engine
--
-- Adapts the suggested schema to the existing system:
--   - Uses jobs.search_radius_miles + jobs.search_state (already exist)
--     instead of a separate job_search_sessions table
--   - Uses PostGIS ST_DWithin (company_profiles.geom exists) not haversine
--   - Uses industry TEXT matching, not industry_id UUID
--   - Respects company_profiles.trade_job_notifications_distance
--   - grants to service_role only
-- ============================================================


-- ── 1. job_notifications_sent ────────────────────────────────
-- Tracks every (job, company) pair that has been sent a
-- notification during adaptive search.  Used to prevent
-- duplicate dispatches across multiple radius expansions.
-- (Separate from urgent_job_dispatch_alerts, which records
-- the full dispatch event.)

CREATE TABLE IF NOT EXISTS public.job_notifications_sent (
  job_id      UUID        NOT NULL REFERENCES public.jobs(id)              ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES public.company_profiles(id)  ON DELETE CASCADE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  radius_at_time NUMERIC,            -- radius (miles) at which this company was added
  PRIMARY KEY (job_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_jns_job_id
  ON public.job_notifications_sent (job_id);

-- RLS: service_role bypasses RLS; authenticated users can only
-- read rows for their own company.
ALTER TABLE public.job_notifications_sent ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'job_notifications_sent' AND policyname = 'company_own_rows'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY company_own_rows ON public.job_notifications_sent
        FOR SELECT TO authenticated
        USING (
          company_id IN (
            SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END; $$;

DO $$ BEGIN RAISE NOTICE '✓ job_notifications_sent table ready'; END; $$;


-- ── 2. count_nearby_opted_in_trades() ───────────────────────
-- Returns the number of company_profiles that:
--   • are open for business + opted in for trade notifications
--   • are within p_radius_miles of the job location
--   • match the job's category (industry / services)
--
-- Used by expand_job_search() to decide whether to jump radius.

CREATE OR REPLACE FUNCTION public.count_nearby_opted_in_trades(
  p_job_id      UUID,
  p_radius_miles NUMERIC
)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_geom  geography(Point, 4326);
  v_category  TEXT;
  v_count     INT;
  v_radius_m  NUMERIC;
BEGIN
  v_radius_m := p_radius_miles * 1609.344;   -- miles → metres

  -- Fetch job location + category
  SELECT
    ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
    j.category
  INTO v_job_geom, v_category
  FROM public.jobs j
  WHERE j.id = p_job_id
    AND j.latitude  IS NOT NULL
    AND j.longitude IS NOT NULL;

  IF v_job_geom IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM public.company_profiles cp
  WHERE cp.open_for_business      = true
    AND cp.trade_job_notifications = true
    AND cp.geom                   IS NOT NULL
    AND ST_DWithin(cp.geom, v_job_geom, v_radius_m)
    -- Respect the company's own max-distance preference
    AND (cp.trade_job_notifications_distance IS NULL
         OR cp.trade_job_notifications_distance >= p_radius_miles)
    -- Industry / category match (flexible: partial text overlap)
    AND (
      v_category IS NULL
      OR cp.industry  ILIKE '%' || v_category || '%'
      OR v_category   ILIKE '%' || cp.industry || '%'
      OR EXISTS (
           SELECT 1 FROM unnest(cp.services) s
           WHERE s ILIKE '%' || v_category || '%'
              OR v_category ILIKE '%' || s || '%'
         )
    );

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_nearby_opted_in_trades(UUID, NUMERIC)
  TO service_role;

DO $$ BEGIN RAISE NOTICE '✓ count_nearby_opted_in_trades() created'; END; $$;


-- ── 3. get_unnotified_trades_for_job() ──────────────────────
-- Returns company_profile IDs that:
--   • match the criteria above
--   • have NOT yet been recorded in job_notifications_sent
--
-- Guarantees no duplicate notifications across expansions.

CREATE OR REPLACE FUNCTION public.get_unnotified_trades_for_job(
  p_job_id      UUID,
  p_radius_miles NUMERIC,
  p_limit       INT DEFAULT 10
)
RETURNS TABLE (company_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_geom geography(Point, 4326);
  v_category TEXT;
  v_radius_m NUMERIC;
BEGIN
  v_radius_m := p_radius_miles * 1609.344;

  SELECT
    ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
    j.category
  INTO v_job_geom, v_category
  FROM public.jobs j
  WHERE j.id = p_job_id
    AND j.latitude  IS NOT NULL
    AND j.longitude IS NOT NULL;

  IF v_job_geom IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT cp.id
  FROM public.company_profiles cp
  WHERE cp.open_for_business      = true
    AND cp.trade_job_notifications = true
    AND cp.geom                   IS NOT NULL
    AND ST_DWithin(cp.geom, v_job_geom, v_radius_m)
    AND (cp.trade_job_notifications_distance IS NULL
         OR cp.trade_job_notifications_distance >= p_radius_miles)
    AND (
      v_category IS NULL
      OR cp.industry  ILIKE '%' || v_category || '%'
      OR v_category   ILIKE '%' || cp.industry || '%'
      OR EXISTS (
           SELECT 1 FROM unnest(cp.services) s
           WHERE s ILIKE '%' || v_category || '%'
              OR v_category ILIKE '%' || s || '%'
         )
    )
    -- Only companies NOT already notified for this job
    AND NOT EXISTS (
      SELECT 1 FROM public.job_notifications_sent ns
      WHERE ns.job_id = p_job_id AND ns.company_id = cp.id
    )
  ORDER BY ST_Distance(cp.geom, v_job_geom) ASC   -- nearest first
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unnotified_trades_for_job(UUID, NUMERIC, INT)
  TO service_role;

DO $$ BEGIN RAISE NOTICE '✓ get_unnotified_trades_for_job() created'; END; $$;


-- ── 4. expand_job_search() ───────────────────────────────────
-- The adaptive engine.  Called by the dispatch API after the
-- initial top-5 dispatch to keep expanding if needed.
--
-- Logic:
--   1. Read current search_radius_miles + search_state from jobs
--   2. If state = 'completed', return empty immediately
--   3. Count supply at current radius
--   4. If supply = 0 → jump to 10 miles minimum
--      Else            → expand by 3 miles (gradual)
--   5. Cap at MAX_RADIUS (25 miles); at cap set state = 'fallback'
--   6. Get unnotified companies at new radius
--   7. Record them in job_notifications_sent
--   8. Update jobs.search_radius_miles + jobs.search_state
--   9. Return (company_id, radius_used)
--
-- Returns the NEW batch of company_ids to dispatch to.
-- The API route creates the actual in-app notifications.

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
BEGIN

  -- ── Validate job ──────────────────────────────────────────
  SELECT j.search_radius_miles, j.search_state, j.status::TEXT
  INTO v_current_radius, v_search_state, v_job_status
  FROM public.jobs j
  WHERE j.id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expand_job_search: job % not found', p_job_id;
  END IF;

  -- Only expand active ASAP jobs
  IF v_job_status NOT IN ('POSTED', 'ACTIVE') THEN
    RETURN;
  END IF;

  -- Already done — nothing to do
  IF v_search_state = 'completed' THEN
    RETURN;
  END IF;

  -- Default radius if not yet set
  v_current_radius := COALESCE(v_current_radius, 5);

  -- ── Count supply at current radius ───────────────────────
  v_nearby_count := public.count_nearby_opted_in_trades(p_job_id, v_current_radius);

  -- ── Smart radius expansion ────────────────────────────────
  IF v_nearby_count = 0 THEN
    -- No supply at all → jump immediately
    v_new_radius := GREATEST(v_min_jump, v_current_radius);
  ELSE
    -- Gradual expansion
    v_new_radius := v_current_radius + v_step;
  END IF;

  -- Cap at max
  v_new_radius := LEAST(v_new_radius, v_max_radius);

  -- ── Determine new search_state ────────────────────────────
  IF v_new_radius >= v_max_radius THEN
    v_search_state := 'fallback';
  ELSIF v_new_radius > 10 THEN
    v_search_state := 'extended_search';
  ELSE
    v_search_state := 'active_search';
  END IF;

  -- ── Get unnotified candidates ─────────────────────────────
  -- In fallback mode, relax the radius to include all opted-in
  -- companies regardless of distance (better some matches than none)
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

  -- ── Update jobs state ─────────────────────────────────────
  UPDATE public.jobs
  SET
    search_radius_miles = v_new_radius,
    search_state        = v_search_state
  WHERE id = p_job_id;

  DO $inner$ BEGIN
    RAISE NOTICE 'expand_job_search: job=% radius %→%mi state=% new_candidates=%',
      p_job_id, v_current_radius, v_new_radius, v_search_state,
      (SELECT COUNT(*) FROM _new_candidates);
  END; $inner$;

  -- ── Return new batch ──────────────────────────────────────
  RETURN QUERY
  SELECT nc.company_id, v_new_radius
  FROM _new_candidates nc;

END;
$$;

GRANT EXECUTE ON FUNCTION public.expand_job_search(UUID)
  TO service_role;

COMMENT ON FUNCTION public.expand_job_search(UUID) IS
  'Adaptive search engine: expands the search radius for an urgent job, '
  'finds unnotified matching tradespeople, records them in job_notifications_sent, '
  'updates jobs.search_radius_miles + jobs.search_state, and returns the new '
  'batch of company_ids for the API to dispatch notifications to.';

DO $$ BEGIN RAISE NOTICE '✓ expand_job_search() created'; END; $$;


-- ── 5. Migrate existing dispatched companies ─────────────────
-- Back-fill job_notifications_sent from urgent_job_dispatch_alerts
-- so the dedup table is accurate for existing jobs.

INSERT INTO public.job_notifications_sent (job_id, company_id, notified_at)
SELECT a.job_id, a.company_id, COALESCE(a.dispatched_at, now())
FROM public.urgent_job_dispatch_alerts a
WHERE a.company_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.jobs j           WHERE j.id = a.job_id)
  AND EXISTS (SELECT 1 FROM public.company_profiles cp WHERE cp.id = a.company_id)
ON CONFLICT (job_id, company_id) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '✓ Back-filled job_notifications_sent from urgent_job_dispatch_alerts';
END; $$;


-- ── 6. Summary ───────────────────────────────────────────────
DO $$
DECLARE
  v_table_exists   BOOL;
  v_count_exists   BOOL;
  v_get_exists     BOOL;
  v_expand_exists  BOOL;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'job_notifications_sent')
    INTO v_table_exists;
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'count_nearby_opted_in_trades')
    INTO v_count_exists;
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_unnotified_trades_for_job')
    INTO v_get_exists;
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'expand_job_search')
    INTO v_expand_exists;

  RAISE NOTICE '=== Adaptive Search Engine ===';
  RAISE NOTICE '  job_notifications_sent table  : %', CASE WHEN v_table_exists  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  count_nearby_opted_in_trades() : %', CASE WHEN v_count_exists  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  get_unnotified_trades_for_job(): %', CASE WHEN v_get_exists    THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '  expand_job_search()             : %', CASE WHEN v_expand_exists THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Usage from API:';
  RAISE NOTICE '  SELECT company_id, radius_used FROM expand_job_search(''<job-uuid>'');';
END;
$$;
