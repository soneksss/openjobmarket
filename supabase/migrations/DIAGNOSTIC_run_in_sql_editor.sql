-- ============================================================
-- DIAGNOSTIC: Homeowner "black page 404" after posting job
-- Run in Supabase SQL Editor (as service_role / postgres)
-- ============================================================

-- ── 1. JOBS TABLE — RLS SELECT POLICIES ─────────────────────
-- If homeowners have no SELECT policy they can't read their own
-- job when the admin client falls back to the user client.
SELECT
  polname AS policy_name,
  CASE polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
              WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
              ELSE polcmd::text END AS command,
  pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy
WHERE polrelid = 'public.jobs'::regclass
ORDER BY polcmd, polname;

-- ── 2. JOB_APPLICATIONS — RLS SELECT POLICIES ───────────────
-- Migration 003 adds these. If missing, GET /urgent-responses
-- returns [] even when applications exist.
SELECT
  polname AS policy_name,
  CASE polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
              WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
              ELSE polcmd::text END AS command,
  pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy
WHERE polrelid = 'public.job_applications'::regclass
ORDER BY polcmd, polname;

-- ── 3. URGENCY COLUMNS — must exist for live/page.tsx SELECT ─
-- live/page.tsx selects urgency_type, search_radius_miles, etc.
-- A missing column makes every DB attempt error → notFound() → black page.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'jobs'
  AND column_name IN (
    'urgency_type', 'search_radius_miles', 'search_state',
    'matching_status', 'homeowner_id', 'latitude', 'longitude',
    'is_urgent', 'max_responses', 'max_applications'
  )
ORDER BY column_name;

-- ── 4. QUEUE_APPLICATION_NOTIFICATION TRIGGER FUNCTION ────────
-- Root cause of 500 on apply: old version calls queue_notification()
-- which reads notification_preferences.push_vacancy_response (doesn't exist).
-- Migration 002 replaces it. Check whether it still references that column.
SELECT
  CASE
    WHEN prosrc ILIKE '%push_vacancy_response%'
      THEN '❌ STILL BROKEN — references push_vacancy_response'
    WHEN prosrc ILIKE '%is_tradespeople_job%'
      THEN '✅ FIXED — exits early for trade jobs'
    ELSE '⚠️  Unknown version — inspect manually'
  END AS status,
  LEFT(prosrc, 600) AS source_excerpt
FROM pg_proc
WHERE proname = 'queue_application_notification'
  AND pronamespace = 'public'::regnamespace;

-- ── 5. NOTIFICATION_PREFERENCES — column list ─────────────────
-- If push_vacancy_response is absent and the old trigger runs, 500 fires.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notification_preferences'
ORDER BY column_name;

-- ── 6. URGENT_JOB_DISPATCH_ALERTS TABLE ────────────────────────
-- Required for notifiedCount in GET /urgent-responses.
SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'urgent_job_dispatch_alerts'
  ) THEN '✅ exists' ELSE '❌ MISSING' END AS urgent_dispatch_alerts;

-- ── 7. APPLY_TO_JOB FUNCTION ───────────────────────────────────
-- Tradesperson POST /urgent-responses calls this RPC.
SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'apply_to_job'
      AND pronamespace = 'public'::regnamespace
  ) THEN '✅ exists' ELSE '❌ MISSING' END AS apply_to_job_fn;

-- ── 8. RECENT HOMEOWNER JOBS ────────────────────────────────────
-- Inspect the last 5 posted jobs to verify columns are populated.
SELECT
  id,
  title,
  homeowner_id IS NOT NULL AS has_homeowner_id,
  urgency_type,
  search_radius_miles,
  latitude IS NOT NULL AS has_lat,
  longitude IS NOT NULL AS has_lon,
  is_active,
  created_at
FROM jobs
WHERE homeowner_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ── 9. SIMULATE HOMEOWNER READ (no admin) ──────────────────────
-- Replace <HOMEOWNER_USER_ID> with the actual user UUID to test if
-- an RLS-bound query can find the homeowner's own job.
-- Uncomment and run after substituting the UUID:
-- SET ROLE authenticated;
-- SET request.jwt.claims = '{"sub":"<HOMEOWNER_USER_ID>","role":"authenticated"}';
-- SELECT id, title FROM jobs WHERE homeowner_id IN (
--   SELECT id FROM homeowner_profiles WHERE user_id = auth.uid()
-- ) LIMIT 5;
-- RESET ROLE;
