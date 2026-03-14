-- ================================================================
-- JOB INSERT DIAGNOSTIC — run each STEP separately in SQL editor
-- Read the output of each step before running the next one.
-- ================================================================


-- ================================================================
-- STEP 1: List every trigger on the jobs table
-- Expected: ONLY "set_job_slug" should fire on INSERT.
-- If you see trigger_update_jobs_search_vector here → that is the bug.
-- ================================================================
SELECT
  t.tgname                                                          AS trigger_name,
  CASE t.tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER'  END        AS timing,
  CASE
    WHEN (t.tgtype & 4)  > 0 THEN 'INSERT '  ELSE '' END ||
  CASE
    WHEN (t.tgtype & 8)  > 0 THEN 'DELETE '  ELSE '' END ||
  CASE
    WHEN (t.tgtype & 16) > 0 THEN 'UPDATE'   ELSE '' END           AS events,
  t.tgenabled                                                       AS enabled,
  p.proname                                                         AS function_name
FROM pg_trigger t
JOIN pg_proc    p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.jobs'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;


-- ================================================================
-- STEP 2: List every column on the jobs table
-- Compare with the wizard payload. Any column in the payload that
-- does NOT appear here will cause a silent 400 / hang.
-- ================================================================
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'jobs'
ORDER BY ordinal_position;


-- ================================================================
-- STEP 3: List every CHECK constraint on the jobs table
-- Look for constraints that reference matching_status, search_state,
-- urgency_type, budget_min/max. A violated CHECK = instant error,
-- not a hang — but good to rule out.
-- ================================================================
SELECT
  con.conname   AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class     rel ON rel.oid = con.conrelid
JOIN pg_namespace ns  ON ns.oid  = rel.relnamespace
WHERE ns.nspname = 'public'
  AND rel.relname = 'jobs'
  AND con.contype = 'c'
ORDER BY con.conname;


-- ================================================================
-- STEP 4: List every RLS policy on the jobs table
-- The INSERT policy must allow homeowner_id to be set.
-- ================================================================
SELECT
  polname                                      AS policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END                                          AS command,
  pg_get_expr(polqual,   polrelid)             AS using_expr,
  pg_get_expr(polwithcheck, polrelid)          AS with_check_expr
FROM pg_policy
WHERE polrelid = 'public.jobs'::regclass
ORDER BY polcmd, polname;


-- ================================================================
-- STEP 5: Find a real homeowner profile ID to use in the test
-- ================================================================
SELECT id, user_id FROM homeowner_profiles LIMIT 5;


-- ================================================================
-- STEP 6: TEST INSERT — exact replica of the wizard payload
-- Replace 'PASTE_HOMEOWNER_PROFILE_ID_HERE' with an id from STEP 5.
-- This runs as service_role (bypasses RLS).
-- If this SUCCEEDS → the problem is RLS (Step 7 will confirm).
-- If this FAILS with an error → the error message IS the bug.
-- If this HANGS → a trigger is blocking (Step 8 will fix it).
-- ================================================================
BEGIN;

INSERT INTO public.jobs (
  company_id,
  homeowner_id,
  title,
  location,
  latitude,
  longitude,
  work_location,
  description,
  short_description,
  country,
  is_tradespeople_job,
  is_urgent,
  urgency_type,
  deadline_at,
  search_state,
  search_radius_miles,
  matching_status,
  max_applications,
  max_responses,
  broadcast_radius,
  current_radius,
  max_radius,
  last_broadcast_at,
  homeowner_notified,
  budget_min,
  budget_max,
  budget_period,
  is_active,
  expires_at
) VALUES (
  NULL,                                -- company_id (homeowner job)
  'PASTE_HOMEOWNER_PROFILE_ID_HERE',   -- homeowner_id ← replace this
  'Diagnostic Test Job',
  'London, UK',
  51.5074,
  -0.1278,
  'onsite',
  'Diagnostic test description',
  'Diagnostic test',
  'United Kingdom',
  true,                                -- is_tradespeople_job
  true,                                -- is_urgent
  'asap',                              -- urgency_type
  NOW() + INTERVAL '1 hour',          -- deadline_at
  'active_search',                     -- search_state
  5,                                   -- search_radius_miles
  'searching',                         -- matching_status
  5,                                   -- max_applications
  NULL,                                -- max_responses
  5.0,                                 -- broadcast_radius
  5.0,                                 -- current_radius
  50.0,                                -- max_radius
  NOW(),                               -- last_broadcast_at
  false,                               -- homeowner_notified
  NULL,                                -- budget_min
  NULL,                                -- budget_max
  'per_job',                           -- budget_period
  true,                                -- is_active
  NOW() + INTERVAL '1 hour'           -- expires_at
)
RETURNING id, title, status, homeowner_id;

ROLLBACK;  -- ← keeps DB clean; change to COMMIT only if you want to keep the row


-- ================================================================
-- STEP 7: Test the INSERT RLS policy directly for your user
-- Replace 'PASTE_USER_ID_HERE' with the auth.uid() of the poster.
-- Returns TRUE if the policy would allow the insert, FALSE if denied.
-- ================================================================
SELECT EXISTS (
  SELECT 1 FROM homeowner_profiles
  WHERE user_id = 'PASTE_USER_ID_HERE'
    AND id      = 'PASTE_HOMEOWNER_PROFILE_ID_HERE'
) AS rls_insert_would_pass;


-- ================================================================
-- STEP 8: NUCLEAR FIX — drop ALL triggers that fire on INSERT
-- Run this if STEP 6 hangs or if STEP 1 shows unexpected triggers.
-- set_job_slug is the only safe one; everything else is dropped.
-- ================================================================

-- Drop known bad triggers
DROP TRIGGER IF EXISTS trigger_update_jobs_search_vector ON public.jobs;
DROP TRIGGER IF EXISTS tsvectorupdate_jobs               ON public.jobs;
DROP TRIGGER IF EXISTS trigger_update_annual_salary      ON public.jobs;

-- Drop their functions
DROP FUNCTION IF EXISTS public.update_jobs_search_vector()  CASCADE;
DROP FUNCTION IF EXISTS public.jobs_search_vector_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.update_annual_salary()       CASCADE;

-- Confirm only set_job_slug remains on INSERT
SELECT t.tgname, p.proname
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.jobs'::regclass
  AND (t.tgtype & 4) > 0   -- INSERT triggers only
  AND NOT t.tgisinternal;


-- ================================================================
-- STEP 9: Check for stuck locks on jobs table (run if STEP 6 hangs)
-- ================================================================
SELECT
  pid,
  usename,
  application_name,
  state,
  wait_event_type,
  wait_event,
  query_start,
  LEFT(query, 120) AS query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND query ILIKE '%jobs%'
ORDER BY query_start;
