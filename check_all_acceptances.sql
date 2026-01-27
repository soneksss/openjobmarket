-- Check ALL Accepted Applications (No Time Limit)
-- This will help find the Mark Linda acceptance

-- 1. Check ALL accepted applications (any time)
SELECT
  '=== ALL Accepted Applications ===' as section,
  COUNT(*) as total_accepted,
  MIN(ja.applied_at) as oldest_acceptance,
  MAX(ja.applied_at) as newest_acceptance
FROM job_applications ja
WHERE ja.status = 'accepted';

-- 2. Find Mark Linda's company and ALL applications to their jobs
SELECT
  '=== Mark Linda - All Applications ===' as section,
  ja.id as application_id,
  ja.status,
  ja.applied_at,
  ja.professional_id,
  pp.user_id as prof_user_id,
  pp.first_name || ' ' || pp.last_name as applicant_name,
  j.title as job_title,
  cp.company_name,
  cp.location
FROM job_applications ja
LEFT JOIN professional_profiles pp ON ja.professional_id = pp.id
LEFT JOIN jobs j ON ja.job_id = j.id
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE (
  cp.company_name ILIKE '%Mark%Linda%'
  OR (cp.company_name ILIKE '%Mark%' AND cp.company_name ILIKE '%Linda%')
  OR (cp.company_name ILIKE '%Plumber%' AND cp.location ILIKE '%Hyde%')
  OR cp.location ILIKE '%Hyde%Park%'
)
ORDER BY ja.applied_at DESC;

-- 3. Check if Mark Linda's company exists
SELECT
  '=== All Companies Matching Search ===' as section,
  id as company_id,
  user_id,
  company_name,
  location,
  industry,
  created_at
FROM company_profiles
WHERE company_name ILIKE '%Mark%'
   OR company_name ILIKE '%Linda%'
   OR company_name ILIKE '%Plumber%'
   OR location ILIKE '%Hyde%'
ORDER BY created_at DESC;

-- 4. Check recent application status changes (last 30 days)
SELECT
  '=== Recent Status Changes ===' as section,
  ja.id as application_id,
  ja.status,
  ja.applied_at,
  pp.first_name || ' ' || pp.last_name as applicant_name,
  j.title as job_title,
  cp.company_name
FROM job_applications ja
LEFT JOIN professional_profiles pp ON ja.professional_id = pp.id
LEFT JOIN jobs j ON ja.job_id = j.id
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE ja.status IN ('accepted', 'rejected', 'interview')
ORDER BY ja.applied_at DESC
LIMIT 20;

-- 5. Check all notifications for application_status_change (last 30 days)
SELECT
  '=== All Application Status Notifications ===' as section,
  n.id as notification_id,
  n.user_id,
  n.title,
  n.message,
  n.link_url,
  n.is_read,
  n.created_at,
  pp.first_name || ' ' || pp.last_name as recipient_name
FROM notifications n
LEFT JOIN professional_profiles pp ON n.user_id = pp.user_id
WHERE n.type = 'application_status_change'
  AND n.created_at > NOW() - INTERVAL '30 days'
ORDER BY n.created_at DESC
LIMIT 20;
