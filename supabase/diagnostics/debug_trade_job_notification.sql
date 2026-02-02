-- ============================================================================
-- Diagnostic: Debug Trade Job Notification for PRIMEFLOW
-- Run this in Supabase SQL Editor to identify why notifications aren't being sent
-- ============================================================================

-- Step 1: Find the job posted by Remus in Weybridge
SELECT
  '=== JOB DETAILS ===' as section;

SELECT
  j.id as job_id,
  j.title,
  j.location,
  j.latitude as job_lat,
  j.longitude as job_lon,
  j.is_tradespeople_job,
  j.created_at,
  j.company_id,
  j.homeowner_id,
  cp.company_name as poster_company_name
FROM jobs j
LEFT JOIN company_profiles cp ON cp.id = j.company_id
WHERE
  j.title ILIKE '%plumb%'
  OR j.location ILIKE '%weybridge%'
  OR cp.company_name ILIKE '%remus%'
ORDER BY j.created_at DESC
LIMIT 5;

-- Step 2: Find PRIMEFLOW company profile details
SELECT
  '=== PRIMEFLOW COMPANY PROFILE ===' as section;

SELECT
  cp.id as company_id,
  cp.user_id,
  cp.company_name,
  cp.trade_job_notifications,
  cp.trade_job_notifications_distance,
  cp.latitude as company_lat,
  cp.longitude as company_lon,
  cp.location as company_location,
  cp.services,
  u.email
FROM company_profiles cp
JOIN users u ON u.id = cp.user_id
WHERE cp.company_name ILIKE '%primeflow%'
   OR cp.company_name ILIKE '%prime%flow%';

-- Step 3: Calculate distance between Remus job and PRIMEFLOW
SELECT
  '=== DISTANCE CALCULATION ===' as section;

WITH job_data AS (
  SELECT
    j.id as job_id,
    j.title,
    j.latitude as job_lat,
    j.longitude as job_lon
  FROM jobs j
  LEFT JOIN company_profiles cp ON cp.id = j.company_id
  WHERE cp.company_name ILIKE '%remus%'
     OR j.location ILIKE '%weybridge%'
  ORDER BY j.created_at DESC
  LIMIT 1
),
primeflow_data AS (
  SELECT
    cp.id as company_id,
    cp.company_name,
    cp.latitude as company_lat,
    cp.longitude as company_lon,
    cp.trade_job_notifications,
    cp.trade_job_notifications_distance,
    cp.services
  FROM company_profiles cp
  WHERE cp.company_name ILIKE '%primeflow%'
)
SELECT
  jd.job_id,
  jd.title as job_title,
  jd.job_lat,
  jd.job_lon,
  pd.company_name,
  pd.company_lat,
  pd.company_lon,
  pd.trade_job_notifications,
  pd.trade_job_notifications_distance,
  pd.services,
  -- Haversine formula for distance in miles
  CASE
    WHEN jd.job_lat IS NULL OR jd.job_lon IS NULL OR pd.company_lat IS NULL OR pd.company_lon IS NULL THEN NULL
    ELSE (3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(jd.job_lat)) * cos(radians(pd.company_lat)) *
        cos(radians(pd.company_lon) - radians(jd.job_lon)) +
        sin(radians(jd.job_lat)) * sin(radians(pd.company_lat))
      ))
    ))
  END as distance_miles,
  CASE
    WHEN pd.trade_job_notifications = false THEN 'FAIL: trade_job_notifications is OFF'
    WHEN pd.company_lat IS NULL OR pd.company_lon IS NULL THEN 'FAIL: Company has no coordinates'
    WHEN jd.job_lat IS NULL OR jd.job_lon IS NULL THEN 'FAIL: Job has no coordinates'
    ELSE 'Coordinates OK'
  END as coord_check
FROM job_data jd
CROSS JOIN primeflow_data pd;

-- Step 4: Check if services/skills match
SELECT
  '=== SKILL MATCHING CHECK ===' as section;

WITH job_data AS (
  SELECT
    j.id as job_id,
    j.title,
    ARRAY[lower(j.title)] as job_skills_lower
  FROM jobs j
  LEFT JOIN company_profiles cp ON cp.id = j.company_id
  WHERE cp.company_name ILIKE '%remus%'
     OR j.location ILIKE '%weybridge%'
  ORDER BY j.created_at DESC
  LIMIT 1
),
primeflow_data AS (
  SELECT
    cp.company_name,
    cp.services,
    COALESCE(cp.services, ARRAY[]::text[]) as services_arr
  FROM company_profiles cp
  WHERE cp.company_name ILIKE '%primeflow%'
)
SELECT
  jd.title as job_title,
  jd.job_skills_lower,
  pd.services as company_services,
  -- Check each matching condition
  CASE WHEN pd.services IS NULL THEN true ELSE false END as "matches_because_no_services",
  CASE WHEN array_length(pd.services, 1) IS NULL THEN true ELSE false END as "matches_because_empty_services",
  EXISTS (
    SELECT 1
    FROM unnest(pd.services_arr) AS company_service,
         unnest(jd.job_skills_lower) AS job_skill
    WHERE lower(company_service) LIKE '%' || job_skill || '%'
  ) as "company_service_contains_job_skill",
  EXISTS (
    SELECT 1
    FROM unnest(pd.services_arr) AS company_service,
         unnest(jd.job_skills_lower) AS job_skill
    WHERE job_skill LIKE '%' || lower(company_service) || '%'
  ) as "job_skill_contains_company_service"
FROM job_data jd
CROSS JOIN primeflow_data pd;

-- Step 5: Test the actual function with a specific job
SELECT
  '=== FUNCTION TEST ===' as section;

-- Get the most recent plumbing job from Remus
WITH recent_job AS (
  SELECT
    j.id,
    j.title,
    j.latitude,
    j.longitude
  FROM jobs j
  LEFT JOIN company_profiles cp ON cp.id = j.company_id
  WHERE (cp.company_name ILIKE '%remus%' OR j.location ILIKE '%weybridge%')
    AND j.is_tradespeople_job = true
  ORDER BY j.created_at DESC
  LIMIT 1
)
SELECT * FROM find_companies_for_trade_job_notification(
  (SELECT id FROM recent_job),
  (SELECT latitude FROM recent_job),
  (SELECT longitude FROM recent_job),
  ARRAY[(SELECT lower(title) FROM recent_job)]
);

-- Step 6: Check all companies with trade notifications enabled
SELECT
  '=== ALL COMPANIES WITH TRADE NOTIFICATIONS ENABLED ===' as section;

SELECT
  cp.company_name,
  cp.trade_job_notifications,
  cp.trade_job_notifications_distance,
  cp.latitude,
  cp.longitude,
  cp.services,
  u.email
FROM company_profiles cp
JOIN users u ON u.id = cp.user_id
WHERE cp.trade_job_notifications = true
ORDER BY cp.company_name;

-- Step 7: Check notifications table for any trade_job_match notifications
SELECT
  '=== RECENT TRADE JOB NOTIFICATIONS ===' as section;

SELECT
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  u.email
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE n.type = 'trade_job_match'
ORDER BY n.created_at DESC
LIMIT 10;

-- Step 8: Summary diagnosis
SELECT
  '=== DIAGNOSIS SUMMARY ===' as section;

WITH job_data AS (
  SELECT
    j.id as job_id,
    j.title,
    j.latitude as job_lat,
    j.longitude as job_lon,
    j.company_id,
    j.homeowner_id
  FROM jobs j
  LEFT JOIN company_profiles cp ON cp.id = j.company_id
  WHERE cp.company_name ILIKE '%remus%'
     OR j.location ILIKE '%weybridge%'
  ORDER BY j.created_at DESC
  LIMIT 1
),
primeflow_data AS (
  SELECT
    cp.id as company_id,
    cp.user_id,
    cp.company_name,
    cp.trade_job_notifications,
    cp.trade_job_notifications_distance,
    cp.latitude as company_lat,
    cp.longitude as company_lon,
    cp.services
  FROM company_profiles cp
  WHERE cp.company_name ILIKE '%primeflow%'
)
SELECT
  'Check 1: Trade notifications enabled' as check_name,
  CASE WHEN pd.trade_job_notifications = true THEN '✅ PASS' ELSE '❌ FAIL - Enable in dashboard' END as result
FROM primeflow_data pd
UNION ALL
SELECT
  'Check 2: Company has coordinates',
  CASE WHEN pd.company_lat IS NOT NULL AND pd.company_lon IS NOT NULL THEN '✅ PASS' ELSE '❌ FAIL - Set location on map' END
FROM primeflow_data pd
UNION ALL
SELECT
  'Check 3: Job has coordinates',
  CASE WHEN jd.job_lat IS NOT NULL AND jd.job_lon IS NOT NULL THEN '✅ PASS' ELSE '❌ FAIL - Job missing coordinates' END
FROM job_data jd
UNION ALL
SELECT
  'Check 4: Distance within radius',
  CASE
    WHEN jd.job_lat IS NULL OR pd.company_lat IS NULL THEN '⚠️ Cannot calculate - missing coordinates'
    WHEN (3959 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians(jd.job_lat)) * cos(radians(pd.company_lat)) *
        cos(radians(pd.company_lon) - radians(jd.job_lon)) +
        sin(radians(jd.job_lat)) * sin(radians(pd.company_lat))
      )))) <= COALESCE(pd.trade_job_notifications_distance, 10)
    THEN '✅ PASS - Distance: ' || ROUND((3959 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians(jd.job_lat)) * cos(radians(pd.company_lat)) *
        cos(radians(pd.company_lon) - radians(jd.job_lon)) +
        sin(radians(jd.job_lat)) * sin(radians(pd.company_lat))
      ))))::numeric, 2)::text || ' miles (limit: ' || COALESCE(pd.trade_job_notifications_distance, 10)::text || ')'
    ELSE '❌ FAIL - Distance: ' || ROUND((3959 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians(jd.job_lat)) * cos(radians(pd.company_lat)) *
        cos(radians(pd.company_lon) - radians(jd.job_lon)) +
        sin(radians(jd.job_lat)) * sin(radians(pd.company_lat))
      ))))::numeric, 2)::text || ' miles exceeds limit: ' || COALESCE(pd.trade_job_notifications_distance, 10)::text
  END
FROM job_data jd, primeflow_data pd
UNION ALL
SELECT
  'Check 5: Services/skills match',
  CASE
    WHEN pd.services IS NULL OR array_length(pd.services, 1) IS NULL THEN '✅ PASS - No services filter (matches all)'
    WHEN EXISTS (
      SELECT 1
      FROM unnest(pd.services) AS svc
      WHERE lower(svc) LIKE '%plumb%' OR lower(svc) LIKE '%heat%' OR lower(svc) LIKE '%cool%'
    ) THEN '✅ PASS - Services contain matching keywords'
    ELSE '❌ FAIL - Services: ' || array_to_string(pd.services, ', ') || ' do not match job'
  END
FROM primeflow_data pd
UNION ALL
SELECT
  'Check 6: Not excluded (poster check)',
  CASE
    WHEN pd.company_id = jd.company_id THEN '❌ FAIL - PRIMEFLOW is the job poster'
    ELSE '✅ PASS - Different company'
  END
FROM job_data jd, primeflow_data pd;
