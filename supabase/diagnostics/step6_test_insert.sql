-- ================================================================
-- STEP 6 — Test INSERT with real homeowner_id (pre-filled)
-- This bypasses RLS (service_role). ROLLBACK keeps DB clean.
--
-- If this SUCCEEDS → DB is fine, problem is in the frontend/auth
-- If this ERRORS   → paste the error message
-- If this HANGS    → there is still a DB-level block
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
  budget_period,
  is_active,
  expires_at
) VALUES (
  NULL,
  '108ecfc1-83d1-4d56-8223-03f9a8812a1b',  -- homeowner_id from Step 5
  'Diagnostic Test Job DELETE ME',
  'London, UK',
  51.5074,
  -0.1278,
  'onsite',
  'Diagnostic test — will be rolled back',
  'Diagnostic test',
  'United Kingdom',
  true,
  true,
  'asap',
  NOW() + INTERVAL '1 hour',
  'active_search',
  5,
  'searching',
  5,
  NULL,
  5.0,
  5.0,
  50.0,
  NOW(),
  false,
  'per_job',
  true,
  NOW() + INTERVAL '1 hour'
)
RETURNING id, title, status, homeowner_id;

ROLLBACK;


-- ================================================================
-- ALSO: Check if any jobs already exist from the user's attempts
-- (Maybe the INSERT IS working but the redirect is broken)
-- ================================================================
SELECT id, title, status, homeowner_id, created_at
FROM public.jobs
WHERE homeowner_id IN (
  SELECT id FROM homeowner_profiles
  WHERE user_id IN (
    SELECT user_id FROM homeowner_profiles
    LIMIT 20
  )
)
ORDER BY created_at DESC
LIMIT 10;
