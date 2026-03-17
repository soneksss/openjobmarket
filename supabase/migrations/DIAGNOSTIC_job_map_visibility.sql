-- ============================================================
-- DIAGNOSTIC: Why isn't the homeowner job visible on the
-- tradesperson's job map?
-- Run in Supabase SQL Editor (as service_role / postgres)
-- ============================================================

-- ── 1. MOST RECENT TRADE JOBS — key map filter columns ──────
-- Shows the last 5 is_tradespeople_job=true jobs so you can see
-- whether coordinates, status, is_active, expires_at are correct.
SELECT
  id,
  title,
  status::text,
  is_active,
  is_tradespeople_job,
  ROUND(latitude::numeric,  4) AS lat,
  ROUND(longitude::numeric, 4) AS lon,
  expires_at,
  CASE
    WHEN expires_at IS NULL                    THEN 'never expires'
    WHEN expires_at > NOW()                    THEN 'active (' || ROUND(EXTRACT(EPOCH FROM (expires_at - NOW()))/60)::int || ' min left)'
    ELSE                                            'EXPIRED ' || ROUND(EXTRACT(EPOCH FROM (NOW() - expires_at))/60)::int || ' min ago'
  END AS expiry_status,
  homeowner_id,
  matching_status,
  created_at
FROM public.jobs
WHERE is_tradespeople_job = true
ORDER BY created_at DESC
LIMIT 5;

-- ── 2. MAP QUERY SIMULATION ──────────────────────────────────
-- Replicates exactly what main-page-search.tsx queries for
-- jobs_tasks mode. Should return the same rows the map shows.
SELECT
  id,
  title,
  status::text,
  is_active,
  is_tradespeople_job,
  latitude,
  longitude,
  expires_at
FROM public.jobs
WHERE is_tradespeople_job = true
  AND status::text  = 'POSTED'
  AND is_active     = true
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC
LIMIT 10;

-- ── 3. COORDINATE CHECK ──────────────────────────────────────
-- Counts how many trade jobs have usable coordinates vs null.
SELECT
  COUNT(*)                                                    AS total_trade_jobs,
  COUNT(*) FILTER (WHERE latitude  IS NOT NULL
                     AND longitude IS NOT NULL)               AS with_coordinates,
  COUNT(*) FILTER (WHERE latitude  IS NULL
                      OR longitude IS NULL)                   AS missing_coordinates,
  COUNT(*) FILTER (WHERE status::text = 'POSTED'
                     AND is_active = true
                     AND (expires_at IS NULL OR expires_at > NOW())) AS currently_visible
FROM public.jobs
WHERE is_tradespeople_job = true;

-- ── 4. JOBS MISSING COORDINATES — try to backfill ───────────
-- Shows trade jobs that have no lat/lng but their homeowner
-- profile might have coords we can copy.
SELECT
  j.id          AS job_id,
  j.title,
  j.location    AS job_location,
  hp.location   AS profile_location,
  hp.latitude   AS profile_lat,
  hp.longitude  AS profile_lon
FROM public.jobs j
JOIN public.homeowner_profiles hp ON hp.id = j.homeowner_id
WHERE j.is_tradespeople_job = true
  AND (j.latitude IS NULL OR j.longitude IS NULL)
  AND hp.latitude  IS NOT NULL
  AND hp.longitude IS NOT NULL
LIMIT 10;

-- ── 5. FIX: Backfill coordinates from homeowner profile ──────
-- Run this UPDATE if query 4 returns rows.
-- (comment out SELECT above and uncomment UPDATE to apply)
/*
UPDATE public.jobs j
SET
  latitude  = hp.latitude,
  longitude = hp.longitude
FROM public.homeowner_profiles hp
WHERE j.homeowner_id = hp.id
  AND j.is_tradespeople_job = true
  AND (j.latitude IS NULL OR j.longitude IS NULL)
  AND hp.latitude  IS NOT NULL
  AND hp.longitude IS NOT NULL;
*/

-- ── 6. FIX: Extend expired ASAP trade jobs (last 2 hours) ────
-- ASAP jobs expire in 1 hour. If the test window closed,
-- run this to extend by 2 hours so you can retest the map.
-- (comment out and uncomment UPDATE to apply)
/*
UPDATE public.jobs
SET
  expires_at = NOW() + INTERVAL '2 hours',
  is_active  = true
WHERE is_tradespeople_job = true
  AND expires_at < NOW()
  AND expires_at > NOW() - INTERVAL '2 hours'  -- only recently expired
  AND status::text = 'POSTED';
*/
