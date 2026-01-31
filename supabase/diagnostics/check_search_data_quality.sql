-- ============================================
-- Check data quality for search functionality
-- Verify that profiles have searchable data
-- ============================================

-- 1. Check how many profiles have languages data
SELECT 'Language Data Population' as info;

SELECT
  'company_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN spoken_languages IS NOT NULL AND array_length(spoken_languages, 1) > 0 THEN 1 END) as with_languages,
  COUNT(CASE WHEN spoken_languages IS NULL OR array_length(spoken_languages, 1) = 0 THEN 1 END) as without_languages,
  ROUND(100.0 * COUNT(CASE WHEN spoken_languages IS NOT NULL AND array_length(spoken_languages, 1) > 0 THEN 1 END) / COUNT(*), 2) as percent_with_languages
FROM company_profiles

UNION ALL

SELECT
  'contractor_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN languages IS NOT NULL AND array_length(languages, 1) > 0 THEN 1 END) as with_languages,
  COUNT(CASE WHEN languages IS NULL OR array_length(languages, 1) = 0 THEN 1 END) as without_languages,
  ROUND(100.0 * COUNT(CASE WHEN languages IS NOT NULL AND array_length(languages, 1) > 0 THEN 1 END) / COUNT(*), 2) as percent_with_languages
FROM contractor_profiles

UNION ALL

SELECT
  'professional_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN spoken_languages IS NOT NULL AND array_length(spoken_languages, 1) > 0 THEN 1 END) as with_languages,
  COUNT(CASE WHEN spoken_languages IS NULL OR array_length(spoken_languages, 1) = 0 THEN 1 END) as without_languages,
  ROUND(100.0 * COUNT(CASE WHEN spoken_languages IS NOT NULL AND array_length(spoken_languages, 1) > 0 THEN 1 END) / COUNT(*), 2) as percent_with_languages
FROM professional_profiles;

-- 2. Check how many profiles have services/skills data
SELECT 'Services/Skills Data Population' as info;

SELECT
  'company_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) as with_services,
  COUNT(CASE WHEN services IS NULL OR array_length(services, 1) = 0 THEN 1 END) as without_services,
  ROUND(100.0 * COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) / COUNT(*), 2) as percent_with_services
FROM company_profiles

UNION ALL

SELECT
  'contractor_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) as with_services,
  COUNT(CASE WHEN services IS NULL OR array_length(services, 1) = 0 THEN 1 END) as without_services,
  ROUND(100.0 * COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) / COUNT(*), 2) as percent_with_services
FROM contractor_profiles

UNION ALL

SELECT
  'professional_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 1 END) as with_skills,
  COUNT(CASE WHEN skills IS NULL OR array_length(skills, 1) = 0 THEN 1 END) as without_skills,
  ROUND(100.0 * COUNT(CASE WHEN skills IS NOT NULL AND array_length(skills, 1) > 0 THEN 1 END) / COUNT(*), 2) as percent_with_skills
FROM professional_profiles;

-- 3. Check how many profiles have location coordinates
SELECT 'Location Coordinates Population' as info;

SELECT
  'company_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coordinates,
  COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as without_coordinates,
  ROUND(100.0 * COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) / COUNT(*), 2) as percent_with_coordinates
FROM company_profiles

UNION ALL

SELECT
  'contractor_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coordinates,
  COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as without_coordinates,
  ROUND(100.0 * COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) / COUNT(*), 2) as percent_with_coordinates
FROM contractor_profiles

UNION ALL

SELECT
  'professional_profiles' as table_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coordinates,
  COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as without_coordinates,
  ROUND(100.0 * COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) / COUNT(*), 2) as percent_with_coordinates
FROM professional_profiles;

-- 4. Sample profiles with Russian language
SELECT 'Sample: Profiles with Russian Language' as info;

SELECT 'company' as type, company_name as name, spoken_languages, services, location
FROM company_profiles
WHERE spoken_languages @> ARRAY['Russian']
LIMIT 5

UNION ALL

SELECT 'contractor' as type, company_name as name, languages as spoken_languages, services, location
FROM contractor_profiles
WHERE languages @> ARRAY['Russian']
LIMIT 5

UNION ALL

SELECT 'professional' as type, CONCAT(first_name, ' ', last_name) as name, spoken_languages, skills as services, location
FROM professional_profiles
WHERE spoken_languages @> ARRAY['Russian']
LIMIT 5;

-- 5. Sample profiles with Plumbing/Gas services
SELECT 'Sample: Profiles with Plumbing/Gas Services' as info;

SELECT 'company' as type, company_name as name, services, spoken_languages, location
FROM company_profiles
WHERE services::text ILIKE '%plumb%'
   OR services::text ILIKE '%gas%'
   OR services::text ILIKE '%heating%'
LIMIT 5

UNION ALL

SELECT 'contractor' as type, company_name as name, services, languages as spoken_languages, location
FROM contractor_profiles
WHERE services::text ILIKE '%plumb%'
   OR services::text ILIKE '%gas%'
   OR services::text ILIKE '%heating%'
LIMIT 5

UNION ALL

SELECT 'professional' as type, CONCAT(first_name, ' ', last_name) as name, skills as services, spoken_languages, location
FROM professional_profiles
WHERE skills::text ILIKE '%plumb%'
   OR skills::text ILIKE '%gas%'
   OR skills::text ILIKE '%heating%'
LIMIT 5;

-- 6. Check specific PRIMEFLOW company
SELECT 'PRIMEFLOW Company Details' as info;

SELECT
  'company_profiles' as table_name,
  company_name,
  industry,
  services,
  spoken_languages,
  location,
  latitude,
  longitude,
  open_for_business,
  created_at
FROM company_profiles
WHERE company_name ILIKE '%PRIMEFLOW%'

UNION ALL

SELECT
  'contractor_profiles' as table_name,
  company_name,
  industry,
  services,
  languages as spoken_languages,
  location,
  latitude,
  longitude,
  available_247 as open_for_business,
  created_at
FROM contractor_profiles
WHERE company_name ILIKE '%PRIMEFLOW%';

-- 7. Test search scenario: Plumber + Russian language
SELECT 'Test Search: Plumber + Russian' as info;

SELECT
  'Would be found by search' as result,
  'company' as type,
  company_name as name,
  services,
  spoken_languages,
  location
FROM company_profiles
WHERE (
  services::text ILIKE '%plumb%'
  OR services::text ILIKE '%heating%'
  OR company_name ILIKE '%plumb%'
  OR industry ILIKE '%plumb%'
)
AND spoken_languages @> ARRAY['Russian']
AND latitude IS NOT NULL
AND longitude IS NOT NULL

UNION ALL

SELECT
  'Would be found by search' as result,
  'contractor' as type,
  company_name as name,
  services,
  languages as spoken_languages,
  location
FROM contractor_profiles
WHERE (
  services::text ILIKE '%plumb%'
  OR services::text ILIKE '%heating%'
  OR company_name ILIKE '%plumb%'
  OR industry ILIKE '%plumb%'
)
AND languages @> ARRAY['Russian']
AND latitude IS NOT NULL
AND longitude IS NOT NULL;
