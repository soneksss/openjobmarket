-- ============================================================================
-- FINAL VERIFICATION: Check if search fixes are working
-- Run this to verify PRIMEFLOW company and search functionality
-- ============================================================================

-- 1. Find PRIMEFLOW company in all tables
SELECT '=== PRIMEFLOW COMPANY DETAILS ===' as info;

-- Company profiles
SELECT
  'company_profiles' as source_table,
  company_name,
  industry,
  services,
  spoken_languages,
  location,
  latitude,
  longitude,
  open_for_business
FROM company_profiles
WHERE company_name ILIKE '%PRIMEFLOW%';

-- Contractor profiles
SELECT
  'contractor_profiles' as source_table,
  company_name,
  industry,
  services,
  languages as spoken_languages,
  location,
  latitude,
  longitude,
  available_247::text as open_for_business
FROM contractor_profiles
WHERE company_name ILIKE '%PRIMEFLOW%';

-- 2. Test Search Scenario 1: "Plumber" + Russian language
SELECT '=== TEST 1: Plumber + Russian ===' as info;

-- Companies with Plumber + Russian
SELECT
  'company' as profile_type,
  company_name,
  services,
  spoken_languages,
  location
FROM company_profiles
WHERE open_for_business = true
  AND spoken_languages @> '["Russian"]'::jsonb
  AND (
    company_name ILIKE '%plumb%'
    OR industry ILIKE '%plumb%'
    OR services::text ILIKE '%plumb%'
    OR services::text ILIKE '%heating%'
  )
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- Contractors with Plumber + Russian
SELECT
  'contractor' as profile_type,
  company_name,
  services,
  languages as spoken_languages,
  location
FROM contractor_profiles
WHERE languages @> ARRAY['Russian']
  AND (
    company_name ILIKE '%plumb%'
    OR industry ILIKE '%plumb%'
    OR services::text ILIKE '%plumb%'
    OR services::text ILIKE '%heating%'
  )
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- 3. Test Search Scenario 2: "Gas engineer" search
SELECT '=== TEST 2: Gas Engineer ===' as info;

-- Companies with Gas services
SELECT
  'company' as profile_type,
  company_name,
  services,
  spoken_languages,
  location
FROM company_profiles
WHERE open_for_business = true
  AND (
    company_name ILIKE '%gas%'
    OR industry ILIKE '%gas%'
    OR services::text ILIKE '%gas%'
    OR services::text ILIKE '%heating%'
    OR services::text ILIKE '%boiler%'
  )
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
LIMIT 10;

-- Contractors with Gas services
SELECT
  'contractor' as profile_type,
  company_name,
  services,
  languages as spoken_languages,
  location
FROM contractor_profiles
WHERE (
    company_name ILIKE '%gas%'
    OR industry ILIKE '%gas%'
    OR services::text ILIKE '%gas%'
    OR services::text ILIKE '%heating%'
    OR services::text ILIKE '%boiler%'
  )
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
LIMIT 10;

-- 4. Check language data quality across all tables
SELECT '=== LANGUAGE DATA QUALITY ===' as info;

SELECT
  'company_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN spoken_languages IS NOT NULL AND jsonb_array_length(spoken_languages) > 0 THEN 1 END) as with_languages,
  ROUND(100.0 * COUNT(CASE WHEN spoken_languages IS NOT NULL AND jsonb_array_length(spoken_languages) > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 1) as percent_with_languages
FROM company_profiles;

SELECT
  'contractor_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN languages IS NOT NULL AND array_length(languages, 1) > 0 THEN 1 END) as with_languages,
  ROUND(100.0 * COUNT(CASE WHEN languages IS NOT NULL AND array_length(languages, 1) > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 1) as percent_with_languages
FROM contractor_profiles;

SELECT
  'professional_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN spoken_languages IS NOT NULL AND array_length(spoken_languages, 1) > 0 THEN 1 END) as with_languages,
  ROUND(100.0 * COUNT(CASE WHEN spoken_languages IS NOT NULL AND array_length(spoken_languages, 1) > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 1) as percent_with_languages
FROM professional_profiles;

-- 5. Check services data quality
SELECT '=== SERVICES DATA QUALITY ===' as info;

SELECT
  'company_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) as with_services,
  ROUND(100.0 * COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 1) as percent_with_services
FROM company_profiles;

SELECT
  'contractor_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) as with_services,
  ROUND(100.0 * COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 1) as percent_with_services
FROM contractor_profiles;

-- 6. Sample Russian-speaking profiles
SELECT '=== SAMPLE: Russian-speaking profiles ===' as info;

-- Companies with Russian
SELECT
  'company' as profile_type,
  company_name,
  spoken_languages,
  services
FROM company_profiles
WHERE spoken_languages @> '["Russian"]'::jsonb
LIMIT 5;

-- Contractors with Russian
SELECT
  'contractor' as profile_type,
  company_name,
  languages as spoken_languages,
  services
FROM contractor_profiles
WHERE languages @> ARRAY['Russian']
LIMIT 5;

-- 7. Check column consistency
SELECT '=== COLUMN CONSISTENCY CHECK ===' as info;

SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('company_profiles', 'contractor_profiles', 'professional_profiles')
  AND column_name IN ('spoken_languages', 'languages', 'services', 'skills')
ORDER BY table_name, column_name;

-- 8. Check if profiles have required data for search
SELECT '=== PROFILES WITH COMPLETE DATA ===' as info;

SELECT
  'company_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN
    services IS NOT NULL AND array_length(services, 1) > 0
    AND spoken_languages IS NOT NULL AND jsonb_array_length(spoken_languages) > 0
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND open_for_business = true
  THEN 1 END) as searchable_profiles,
  ROUND(100.0 * COUNT(CASE WHEN
    services IS NOT NULL AND array_length(services, 1) > 0
    AND spoken_languages IS NOT NULL AND jsonb_array_length(spoken_languages) > 0
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND open_for_business = true
  THEN 1 END) / NULLIF(COUNT(*), 0), 1) as percent_searchable
FROM company_profiles;

SELECT
  'contractor_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN
    services IS NOT NULL AND array_length(services, 1) > 0
    AND languages IS NOT NULL AND array_length(languages, 1) > 0
    AND latitude IS NOT NULL AND longitude IS NOT NULL
  THEN 1 END) as searchable_profiles,
  ROUND(100.0 * COUNT(CASE WHEN
    services IS NOT NULL AND array_length(services, 1) > 0
    AND languages IS NOT NULL AND array_length(languages, 1) > 0
    AND latitude IS NOT NULL AND longitude IS NOT NULL
  THEN 1 END) / NULLIF(COUNT(*), 0), 1) as percent_searchable
FROM contractor_profiles;
