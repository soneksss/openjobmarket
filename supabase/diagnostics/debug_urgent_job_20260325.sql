-- =============================================================================
-- DIAGNOSTIC: Urgent Job Notification + Job Disappearing from Map
-- Run each block separately in Supabase SQL Editor
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 1: Find the "Plasterer" job and check its state
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  j.id,
  j.title,
  j.status,
  j.is_active,
  j.is_tradespeople_job,
  j.urgency_type,
  j.created_at,
  j.expires_at,
  (j.expires_at - NOW()) AS time_until_expiry,   -- negative = already expired
  j.matching_status,
  j.search_state,
  j.homeowner_id,
  j.company_id
FROM jobs j
WHERE j.title ILIKE '%plaster%'
  AND j.created_at > NOW() - INTERVAL '24 hours'
ORDER BY j.created_at DESC
LIMIT 5;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 2: Check tradesperson's company profile settings
-- (must have open_for_business=true AND trade_job_notifications=true to be dispatched)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  cp.id               AS company_profile_id,
  cp.company_name,
  cp.industry,
  cp.services,
  cp.open_for_business,
  cp.trade_job_notifications,
  cp.trade_job_notifications_distance,
  cp.latitude,
  cp.longitude,
  au.email
FROM company_profiles cp
JOIN auth.users au ON au.id = cp.user_id
WHERE au.email = 'soneksss9@yahoo.com';


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 3: Check whether dispatch_urgent was called and who was notified
-- (replace JOB_ID with the id from Block 1)
-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3a: get the job id first
SELECT id FROM jobs WHERE title ILIKE '%plaster%' AND created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC LIMIT 1;

-- Step 3b: check dispatch_alerts (paste job id below)
SELECT
  jda.id,
  jda.job_id,
  jda.company_id,
  jda.dispatch_type,
  jda.dispatched_at,
  jda.responded,
  jda.response_type,
  cp.company_name
FROM urgent_job_dispatch_alerts jda
LEFT JOIN company_profiles cp ON cp.id = jda.company_id
WHERE jda.job_id = (
  SELECT id FROM jobs WHERE title ILIKE '%plaster%'
    AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC LIMIT 1
);
-- If this returns 0 rows → dispatch found 0 matching tradespeople


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 4: Check notifications sent to the tradesperson in the last 24 hours
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  n.id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  n.link_url
FROM notifications n
WHERE n.user_id = (SELECT id FROM auth.users WHERE email = 'soneksss9@yahoo.com')
  AND n.created_at > NOW() - INTERVAL '24 hours'
ORDER BY n.created_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 5: ALL-IN-ONE diagnostic — job state + tradesperson settings + dispatch
-- ─────────────────────────────────────────────────────────────────────────────
WITH
job AS (
  SELECT id, title, status, is_active, is_tradespeople_job,
         expires_at, created_at, urgency_type, matching_status, search_state,
         homeowner_id
  FROM jobs
  WHERE title ILIKE '%plaster%'
    AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 1
),
tradesperson AS (
  SELECT
    au.id                              AS user_id,
    cp.id                              AS company_id,
    cp.company_name,
    cp.open_for_business,
    cp.trade_job_notifications,
    cp.trade_job_notifications_distance,
    cp.latitude,
    cp.longitude,
    cp.industry,
    cp.services
  FROM auth.users au
  JOIN company_profiles cp ON cp.user_id = au.id
  WHERE au.email = 'soneksss9@yahoo.com'
)
SELECT
  -- Job state
  j.id                                                    AS job_id,
  j.title,
  j.status,
  j.is_active,
  j.urgency_type,
  j.expires_at,
  (j.expires_at - NOW())                                  AS time_until_expiry,
  j.matching_status,
  j.search_state,

  -- Tradesperson profile settings
  t.company_id,
  t.company_name,
  t.open_for_business,
  t.trade_job_notifications,
  t.trade_job_notifications_distance,
  t.latitude                                              AS tp_lat,
  t.longitude                                             AS tp_lng,
  t.industry                                              AS tp_industry,
  t.services                                              AS tp_services,

  -- Dispatch result
  (SELECT COUNT(*)
   FROM urgent_job_dispatch_alerts da
   WHERE da.job_id = j.id)                                AS total_dispatched,

  (SELECT COUNT(*)
   FROM urgent_job_dispatch_alerts da
   WHERE da.job_id = j.id
     AND da.company_id = t.company_id)                    AS dispatched_to_this_tradesperson,

  -- Notification result
  (SELECT COUNT(*)
   FROM notifications n
   WHERE n.user_id = t.user_id
     AND n.type = 'urgent_job_dispatch'
     AND n.link_url LIKE '%' || j.id || '%')              AS notifications_for_this_job,

  -- Applications
  (SELECT COUNT(*)
   FROM job_applications ja
   WHERE ja.job_id = j.id)                                AS total_applications,

  (SELECT COUNT(*)
   FROM job_applications ja
   WHERE ja.job_id = j.id
     AND ja.company_id = t.company_id)                    AS application_from_this_tradesperson

FROM job j, tradesperson t;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 6: Check expires_at — was it set too short?
-- (urgent ASAP jobs should have expires_at = created_at + 1 hour)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  id,
  title,
  urgency_type,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - created_at)) / 60 AS expires_in_minutes,
  is_active
FROM jobs
WHERE title ILIKE '%plaster%'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 5;
-- If expires_in_minutes is 5–10 → the job was set to expire too quickly
-- It should be 60 minutes for urgent ASAP jobs


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 7: Check tradesperson's auth sessions (invalid refresh token)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  s.id,
  s.user_id,
  s.created_at,
  s.updated_at,
  s.not_after,
  s.refreshed_at,
  au.email
FROM auth.sessions s
JOIN auth.users au ON au.id = s.user_id
WHERE au.email = 'soneksss9@yahoo.com'
ORDER BY s.created_at DESC
LIMIT 5;
-- If not_after is in the past → session expired → this causes "Invalid Refresh Token"
-- The tradesperson must log out and log back in


-- ─────────────────────────────────────────────────────────────────────────────
-- QUICK FIX: If the job expired too early — extend it to 60 minutes from now
-- (run only if Block 6 shows expires_in_minutes is very small)
-- ─────────────────────────────────────────────────────────────────────────────
/*
UPDATE jobs
SET
  expires_at   = NOW() + INTERVAL '60 minutes',
  is_active    = true,
  status       = 'POSTED'
WHERE title ILIKE '%plaster%'
  AND created_at > NOW() - INTERVAL '24 hours';
*/


-- ─────────────────────────────────────────────────────────────────────────────
-- QUICK FIX: If trade_job_notifications is false for the tradesperson
-- ─────────────────────────────────────────────────────────────────────────────
/*
UPDATE company_profiles
SET
  trade_job_notifications = true,
  open_for_business       = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'soneksss9@yahoo.com');
*/
