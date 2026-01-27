-- Debug Script for Application Acceptance Issue
-- Check if notifications are being created and if user_id is correct

-- 1. Find recent application acceptances
SELECT
  'Recent Accepted Applications' as section,
  ja.id as application_id,
  ja.status,
  ja.applied_at,
  ja.professional_id,
  pp.user_id as professional_user_id,
  pp.first_name,
  pp.last_name,
  j.title as job_title,
  cp.company_name
FROM job_applications ja
LEFT JOIN professional_profiles pp ON ja.professional_id = pp.id
LEFT JOIN jobs j ON ja.job_id = j.id
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE ja.status = 'accepted'
ORDER BY ja.applied_at DESC
LIMIT 10;

-- 2. Check if notifications were created for these acceptances
SELECT
  'Notifications for Accepted Applications' as section,
  n.id as notification_id,
  n.user_id,
  n.type,
  n.title,
  n.message,
  n.link_url,
  n.is_read,
  n.created_at,
  pp.first_name,
  pp.last_name,
  pp.id as professional_profile_id
FROM notifications n
LEFT JOIN professional_profiles pp ON n.user_id = pp.user_id
WHERE n.type = 'application_status_change'
  AND n.created_at > NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC
LIMIT 20;

-- 3. Check for a specific company/applicant combo (Mark Linda - Plumber)
-- Find Mark Linda's company profile
SELECT
  'Mark Linda Company Profile' as section,
  id as company_id,
  user_id as company_user_id,
  company_name,
  location,
  industry
FROM company_profiles
WHERE company_name ILIKE '%Mark%Linda%'
   OR company_name ILIKE '%Plumber%'
   OR location ILIKE '%Hyde Park%'
LIMIT 5;

-- 4. Find applications to Mark Linda's jobs
SELECT
  'Applications to Mark Linda Jobs' as section,
  ja.id as application_id,
  ja.status,
  ja.applied_at,
  ja.professional_id,
  pp.user_id as professional_user_id,
  pp.first_name || ' ' || pp.last_name as applicant_name,
  pp.email as applicant_email,
  j.id as job_id,
  j.title as job_title,
  cp.company_name
FROM job_applications ja
LEFT JOIN professional_profiles pp ON ja.professional_id = pp.id
LEFT JOIN jobs j ON ja.job_id = j.id
LEFT JOIN company_profiles cp ON j.company_id = cp.id
WHERE cp.company_name ILIKE '%Mark%Linda%'
   OR cp.company_name ILIKE '%Plumber%'
   OR cp.location ILIKE '%Hyde Park%'
ORDER BY ja.applied_at DESC
LIMIT 10;

-- 5. Check professional_profiles table structure for user_id
SELECT
  'Professional Profile Sample' as section,
  id as profile_id,
  user_id,
  first_name,
  last_name,
  email,
  created_at
FROM professional_profiles
ORDER BY created_at DESC
LIMIT 5;

-- 6. Verify notification realtime subscription filter
-- Show notifications for a specific user
SELECT
  'Sample User Notifications' as section,
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.is_read,
  n.created_at
FROM notifications n
WHERE n.user_id IN (
  SELECT user_id FROM professional_profiles LIMIT 1
)
ORDER BY n.created_at DESC
LIMIT 5;
