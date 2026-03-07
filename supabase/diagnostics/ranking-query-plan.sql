-- ============================================================
-- Diagnostic: Verify GIST index is used by the ranking query
-- ============================================================
-- Run each block separately in the Supabase SQL editor.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- STEP 1: Find a real urgent POSTED job to use as the probe
-- ────────────────────────────────────────────────────────────
-- Copy the id, latitude, longitude from the output.

SELECT
  id,
  latitude,
  longitude,
  preferred_language,
  status,
  is_urgent
FROM public.jobs
WHERE status              = 'POSTED'
  AND is_urgent           = true
  AND is_tradespeople_job = true
  AND latitude            IS NOT NULL
  AND longitude           IS NOT NULL
LIMIT 1;


-- ────────────────────────────────────────────────────────────
-- STEP 2: Run EXPLAIN on the inner query
--
-- Replace <JOB_LON> and <JOB_LAT> with values from Step 1.
-- Example for London: lon = -0.1278, lat = 51.5074
-- ────────────────────────────────────────────────────────────

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
WITH candidates AS (
  SELECT
    cp.id AS tradesperson_id,
    ST_Distance(
      cp.geom,
      ST_SetSRID(ST_MakePoint(<JOB_LON>, <JOB_LAT>), 4326)::geography
    ) / 1000.0 AS distance_km,
    CASE
      WHEN NULL IS NOT NULL
       AND NULL = ANY(cp.languages) THEN 100
      ELSE 0
    END::NUMERIC AS language_score,
    CASE
      WHEN cp.reviews_count >= 3
        THEN (cp.average_rating / 5.0) * 100
      ELSE 70
    END::NUMERIC AS rating_score,
    (
      (COALESCE(cp.accept_rate,     1.0) * 0.5) +
      (COALESCE(cp.completion_rate, 1.0) * 0.5)
    ) * 100 AS reliability_score
  FROM public.contractor_profiles cp
  WHERE cp.available_247 = true
    AND cp.geom           IS NOT NULL
    AND ST_DWithin(
          cp.geom,
          ST_SetSRID(ST_MakePoint(<JOB_LON>, <JOB_LAT>), 4326)::geography,
          20000  -- 20 km in metres
        )
),
scored AS (
  SELECT
    c.tradesperson_id,
    (
      GREATEST(0, 100 - (c.distance_km * 5)) * 0.40
      + c.language_score   * 0.25
      + c.rating_score     * 0.25
      + c.reliability_score * 0.10
      + (random() * 5)
    )::NUMERIC(8,4) AS total_score
  FROM candidates c
)
SELECT s.tradesperson_id, s.total_score
FROM   scored s
ORDER  BY s.total_score DESC
LIMIT  5;


-- ────────────────────────────────────────────────────────────
-- STEP 3: Read the plan — what you should see
-- ────────────────────────────────────────────────────────────
--
-- ✅ GOOD plan:
--
--   Limit  (cost=... rows=5 ...)
--     -> Sort  (cost=... sort key: total_score DESC)
--          -> Result (random() + ...)
--               -> Bitmap Heap Scan on contractor_profiles
--                    Recheck Cond: ST_DWithin(geom, $1, 20000)
--                    Filter: available_247 AND geom IS NOT NULL
--                    -> Bitmap Index Scan on idx_cp_geom_eligible
--                         Index Cond: (geom && ...)
--
--   OR for a small candidate set:
--
--   Limit
--     -> Sort
--          -> Index Scan using idx_cp_geom_eligible on contractor_profiles
--               Index Cond: (ST_DWithin(geom, $1, 20000))
--
-- ❌ BAD plan:
--
--   Limit
--     -> Sort
--          -> Seq Scan on contractor_profiles
--               Filter: available_247 AND geom IS NOT NULL
--                    AND ST_DWithin(geom, $1, 20000)
--
-- ────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────
-- STEP 4 (if you see Seq Scan): Force index to confirm it works
-- ────────────────────────────────────────────────────────────
--
-- This disables seq scan ONLY for this session so you can
-- confirm the GIST index gives correct results.
-- Do NOT leave this on in production.

SET enable_seqscan = off;

-- Re-run the EXPLAIN from Step 2 here.
-- If you now see the GIST index scan → the index is healthy
-- and the planner was just choosing seq scan because the table
-- is small (seq scan can be cheaper for < ~1 000 rows).
-- Run migration 20260303000010 to fix the statistics and the
-- planner will choose correctly at scale.

RESET enable_seqscan;


-- ────────────────────────────────────────────────────────────
-- STEP 5: Verify the GIST index exists and is valid
-- ────────────────────────────────────────────────────────────

SELECT
  indexname,
  indexdef,
  pg_size_pretty(pg_relation_size(indexname::text)) AS index_size
FROM pg_indexes
WHERE tablename = 'contractor_profiles'
  AND indexname IN (
        'idx_cp_geom',
        'idx_cp_geom_eligible',
        'idx_contractor_profiles_available_247',
        'idx_cp_avg_rating',
        'idx_cp_reviews_count',
        'idx_cp_accept_rate',
        'idx_cp_completion_rate',
        'idx_cp_ranking_eligible'
      )
ORDER BY indexname;


-- ────────────────────────────────────────────────────────────
-- STEP 6: Check planner statistics targets
-- ────────────────────────────────────────────────────────────

SELECT
  attname            AS column_name,
  attstattarget      AS statistics_target,
  -- -1 means "use the table default" (= default_statistics_target = 100)
  CASE WHEN attstattarget = -1 THEN 100 ELSE attstattarget END AS effective_target
FROM pg_attribute
WHERE attrelid = 'public.contractor_profiles'::regclass
  AND attname IN (
        'geom',
        'available_247',
        'average_rating',
        'reviews_count',
        'accept_rate',
        'completion_rate'
      )
ORDER BY attname;

-- Expected after migration 000010:
--   geom             → 500  (boosted for spatial selectivity estimates)
--   available_247    → 100
--   average_rating   → 200
--   reviews_count    → 100
--   accept_rate      → 100
--   completion_rate  → 100
