-- ============================================
-- Quick test to verify search fixes are working
-- ============================================

-- 1. Check if we have any profiles at all
SELECT '=== PROFILE COUNTS ===' as info;

SELECT
  'company_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN open_for_business = true THEN 1 END) as open_for_business
FROM company_profiles
UNION ALL
SELECT
  'contractor_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN available_247 = true THEN 1 END) as available_247
FROM contractor_profiles
UNION ALL
SELECT
  'professional_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN available_for_work = true THEN 1 END) as available_for_work
FROM professional_profiles;

-- 2. Check language data (testing JSONB vs text[])
SELECT '=== LANGUAGE DATA TEST ===' as info;

-- Companies (JSONB)
SELECT
  'company (JSONB)' as test,
  COUNT(*) as total,
  COUNT(CASE WHEN spoken_languages IS NOT NULL THEN 1 END) as has_data,
  COUNT(CASE WHEN spoken_languages @> '["English"]'::jsonb THEN 1 END) as has_english,
  COUNT(CASE WHEN spoken_languages @> '["Russian"]'::jsonb THEN 1 END) as has_russian
FROM company_profiles

UNION ALL

-- Contractors (text[])
SELECT
  'contractor (text[])' as test,
  COUNT(*) as total,
  COUNT(CASE WHEN languages IS NOT NULL THEN 1 END) as has_data,
  COUNT(CASE WHEN languages @> ARRAY['English'] THEN 1 END) as has_english,
  COUNT(CASE WHEN languages @> ARRAY['Russian'] THEN 1 END) as has_russian
FROM contractor_profiles

UNION ALL

-- Professionals (text[])
SELECT
  'professional (text[])' as test,
  COUNT(*) as total,
  COUNT(CASE WHEN spoken_languages IS NOT NULL THEN 1 END) as has_data,
  COUNT(CASE WHEN spoken_languages @> ARRAY['English'] THEN 1 END) as has_english,
  COUNT(CASE WHEN spoken_languages @> ARRAY['Russian'] THEN 1 END) as has_russian
FROM professional_profiles;

-- 3. Check services data
SELECT '=== SERVICES DATA TEST ===' as info;

SELECT
  'company (text[])' as test,
  COUNT(*) as total,
  COUNT(CASE WHEN services IS NOT NULL THEN 1 END) as has_services,
  COUNT(CASE WHEN services::text ILIKE '%plumb%' THEN 1 END) as has_plumbing,
  COUNT(CASE WHEN services::text ILIKE '%gas%' THEN 1 END) as has_gas
FROM company_profiles

UNION ALL

SELECT
  'contractor (text[])' as test,
  COUNT(*) as total,
  COUNT(CASE WHEN services IS NOT NULL THEN 1 END) as has_services,
  COUNT(CASE WHEN services::text ILIKE '%plumb%' THEN 1 END) as has_plumbing,
  COUNT(CASE WHEN services::text ILIKE '%gas%' THEN 1 END) as has_gas
FROM contractor_profiles;

-- 4. Check location data
SELECT '=== LOCATION DATA TEST ===' as info;

SELECT
  'company_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coordinates,
  COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as has_location
FROM company_profiles

UNION ALL

SELECT
  'contractor_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coordinates,
  COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as has_location
FROM contractor_profiles

UNION ALL

SELECT
  'professional_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coordinates,
  COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as has_location
FROM professional_profiles;

-- 5. Find PRIMEFLOW company
SELECT '=== PRIMEFLOW COMPANY ===' as info;

SELECT
  company_name,
  services,
  spoken_languages,
  location,
  latitude,
  longitude,
  open_for_business
FROM company_profiles
WHERE company_name ILIKE '%PRIMEFLOW%';

-- 6. Sample Russian-speaking profiles
SELECT '=== RUSSIAN-SPEAKING PROFILES ===' as info;

-- Companies with Russian
SELECT
  'company' as type,
  company_name as name,
  spoken_languages,
  services
FROM company_profiles
WHERE spoken_languages @> '["Russian"]'::jsonb
LIMIT 3;

-- Contractors with Russian
SELECT
  'contractor' as type,
  company_name as name,
  languages as spoken_languages,
  services
FROM contractor_profiles
WHERE languages @> ARRAY['Russian']
LIMIT 3;

-- 7. Test search query: Plumber + Russian
SELECT '=== SEARCH TEST: Plumber + Russian ===' as info;

-- Companies matching search
SELECT
  'company' as type,
  company_name,
  services,
  spoken_languages,
  location,
  CASE
    WHEN latitude IS NULL OR longitude IS NULL THEN '❌ Missing coordinates'
    WHEN NOT open_for_business THEN '❌ Not open for business'
    ELSE '✅ Would appear in search'
  END as search_status
FROM company_profiles
WHERE spoken_languages @> '["Russian"]'::jsonb
  AND (
    company_name ILIKE '%plumb%'
    OR industry ILIKE '%plumb%'
    OR services::text ILIKE '%plumb%'
    OR services::text ILIKE '%heating%'
  );

-- Contractors matching search
SELECT
  'contractor' as type,
  company_name,
  services,
  languages as spoken_languages,
  location,
  CASE
    WHEN latitude IS NULL OR longitude IS NULL THEN '❌ Missing coordinates'
    ELSE '✅ Would appear in search'
  END as search_status
FROM contractor_profiles
WHERE languages @> ARRAY['Russian']
  AND (
    company_name ILIKE '%plumb%'
    OR industry ILIKE '%plumb%'
    OR services::text ILIKE '%plumb%'
    OR services::text ILIKE '%heating%'
  );

-- 8. Summary: Are we ready to search?
SELECT '=== SEARCH READINESS SUMMARY ===' as info;

SELECT
  'Companies' as profile_type,
  COUNT(*) as total,
  COUNT(CASE WHEN
    services IS NOT NULL
    AND spoken_languages IS NOT NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND open_for_business = true
  THEN 1 END) as ready_for_search,
  CONCAT(
    ROUND(100.0 * COUNT(CASE WHEN
      services IS NOT NULL
      AND spoken_languages IS NOT NULL
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND open_for_business = true
    THEN 1 END) / NULLIF(COUNT(*), 0), 0),
    '%'
  ) as percent_ready
FROM company_profiles

UNION ALL

SELECT
  'Contractors' as profile_type,
  COUNT(*) as total,
  COUNT(CASE WHEN
    services IS NOT NULL
    AND languages IS NOT NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
  THEN 1 END) as ready_for_search,
  CONCAT(
    ROUND(100.0 * COUNT(CASE WHEN
      services IS NOT NULL
      AND languages IS NOT NULL
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    THEN 1 END) / NULLIF(COUNT(*), 0), 0),
    '%'
  ) as percent_ready
FROM contractor_profiles

UNION ALL

SELECT
  'Professionals' as profile_type,
  COUNT(*) as total,
  COUNT(CASE WHEN
    skills IS NOT NULL
    AND spoken_languages IS NOT NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND available_for_work = true
  THEN 1 END) as ready_for_search,
  CONCAT(
    ROUND(100.0 * COUNT(CASE WHEN
      skills IS NOT NULL
      AND spoken_languages IS NOT NULL
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND available_for_work = true
    THEN 1 END) / NULLIF(COUNT(*), 0), 0),
    '%'
  ) as percent_ready
FROM professional_profiles;
