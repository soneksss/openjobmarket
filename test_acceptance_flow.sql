-- Comprehensive Test for Application Acceptance Flow
-- This will help identify exactly where the issue is

-- ==================================
-- PART 1: Find Mark Linda's company and recent applications
-- ==================================

-- Find Mark Linda's company
SELECT
  '=== Mark Linda Company ===' as section,
  id as company_id,
  user_id as company_user_id,
  company_name,
  location,
  industry
FROM company_profiles
WHERE company_name ILIKE '%Mark%'
   OR company_name ILIKE '%Linda%'
   OR company_name ILIKE '%Plumber%'
   OR location ILIKE '%Hyde%Park%'
ORDER BY created_at DESC
LIMIT 5;

-- Find applications to Mark Linda's jobs
SELECT
  '=== Applications to Mark Linda Jobs ===' as section,
  ja.id as application_id,
  ja.status as current_status,
  ja.professional_id,
  pp.id as prof_profile_id,
  pp.user_id as prof_user_id,
  pp.first_name || ' ' || pp.last_name as applicant_name,
  j.id as job_id,
  j.title as job_title,
  cp.company_name,
  ja.applied_at
FROM job_applications ja
LEFT JOIN professional_profiles pp ON ja.professional_id = pp.id
LEFT JOIN jobs j ON ja.job_id = j.id
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE (
  cp.company_name ILIKE '%Mark%'
  OR cp.company_name ILIKE '%Linda%'
  OR cp.company_name ILIKE '%Plumber%'
  OR cp.location ILIKE '%Hyde%Park%'
)
ORDER BY ja.applied_at DESC
LIMIT 10;

-- ==================================
-- PART 2: Check notifications for these applications
-- ==================================

SELECT
  '=== Notifications for Mark Linda Applications ===' as section,
  n.id as notification_id,
  n.user_id as notification_sent_to_user_id,
  n.type,
  n.title,
  n.message,
  n.link_url,
  n.is_read,
  n.created_at,
  pp.id as professional_profile_id,
  pp.first_name || ' ' || pp.last_name as professional_name
FROM notifications n
LEFT JOIN professional_profiles pp ON n.user_id = pp.user_id
WHERE n.link_url LIKE '%/applications/%'
  AND n.created_at > NOW() - INTERVAL '30 days'
  AND EXISTS (
    SELECT 1
    FROM job_applications ja
    LEFT JOIN jobs j ON ja.job_id = j.id
    LEFT JOIN company_profiles cp ON j.company_id = cp.id
    WHERE (
      cp.company_name ILIKE '%Mark%'
      OR cp.company_name ILIKE '%Linda%'
      OR cp.company_name ILIKE '%Plumber%'
    )
    AND n.link_url LIKE '%' || ja.id || '%'
  )
ORDER BY n.created_at DESC;

-- ==================================
-- PART 3: Verify professional_profiles.user_id matches auth.users.id
-- ==================================

SELECT
  '=== Professional Profile vs Auth User ID ===' as section,
  pp.id as profile_id,
  pp.user_id as profile_user_id,
  pp.first_name || ' ' || pp.last_name as name,
  u.id as auth_user_id,
  u.email as auth_email,
  CASE
    WHEN pp.user_id = u.id THEN '✓ MATCH'
    ELSE '✗ MISMATCH'
  END as id_match_status
FROM professional_profiles pp
LEFT JOIN auth.users u ON pp.user_id = u.id
WHERE pp.created_at > NOW() - INTERVAL '30 days'
ORDER BY pp.created_at DESC
LIMIT 10;

-- ==================================
-- PART 4: Check realtime subscription compatibility
-- ==================================

-- This checks if the notification user_id would match the realtime filter
SELECT
  '=== Realtime Filter Test ===' as section,
  n.id as notification_id,
  n.user_id as notification_user_id,
  n.type,
  n.title,
  pp.user_id as expected_subscriber_user_id,
  CASE
    WHEN n.user_id = pp.user_id THEN '✓ Would be received'
    ELSE '✗ Would NOT be received'
  END as realtime_status,
  n.created_at
FROM notifications n
LEFT JOIN professional_profiles pp ON n.user_id = pp.user_id
WHERE n.type = 'application_status_change'
  AND n.created_at > NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC
LIMIT 10;

-- ==================================
-- PART 5: Recent accepted applications summary
-- ==================================

SELECT
  '=== Recent Accepted Applications Summary ===' as section,
  COUNT(*) as total_accepted_apps,
  COUNT(DISTINCT ja.professional_id) as unique_professionals,
  COUNT(n.id) as notifications_created,
  COUNT(DISTINCT n.user_id) as unique_notified_users,
  CASE
    WHEN COUNT(*) = COUNT(n.id) THEN '✓ All have notifications'
    WHEN COUNT(n.id) = 0 THEN '✗ NO notifications created'
    ELSE '⚠ PARTIAL - some missing notifications'
  END as notification_coverage
FROM job_applications ja
LEFT JOIN notifications n ON (
  n.type = 'application_status_change'
  AND n.link_url LIKE '%' || ja.id || '%'
  AND n.created_at >= ja.applied_at
)
WHERE ja.status = 'accepted'
  AND ja.applied_at > NOW() - INTERVAL '7 days';

-- ==================================
-- PART 6: Test query structure
-- ==================================

-- This simulates the query from app/applications/[id]/page.tsx
-- to verify professional_profiles.user_id is fetched correctly
SELECT
  '=== Application Detail Query Test ===' as section,
  ja.id as application_id,
  ja.status,
  ja.professional_id,
  pp.id as prof_profile_id,
  pp.user_id as prof_user_id, -- This is what gets passed to ApplicationActions
  pp.first_name || ' ' || pp.last_name as applicant_name,
  j.title as job_title,
  cp.user_id as company_user_id
FROM job_applications ja
LEFT JOIN professional_profiles pp ON ja.professional_id = pp.id
LEFT JOIN jobs j ON ja.job_id = j.id
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE ja.status = 'accepted'
  AND ja.applied_at > NOW() - INTERVAL '7 days'
ORDER BY ja.applied_at DESC
LIMIT 5;

-- ==================================
-- INSTRUCTIONS
-- ==================================
/*
After running this script, check:

1. "Mark Linda Company" - Verify company exists and get company_id
2. "Applications to Mark Linda Jobs" - Find applications and their IDs
3. "Notifications for Mark Linda Applications" - See if notifications exist
4. "Professional Profile vs Auth User ID" - Verify IDs match
5. "Realtime Filter Test" - Check if notifications would be received
6. "Recent Accepted Applications Summary" - Overall health check

Key things to look for:
- If notifications exist but user_id doesn't match pp.user_id → notification sent to wrong user
- If notifications don't exist at all → notification creation failed
- If user_id doesn't match auth.users.id → data integrity issue
- If realtime status shows "Would NOT be received" → user_id mismatch
*/
