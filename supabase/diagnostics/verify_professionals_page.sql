-- ============================================================================
-- Verify Professionals Page Data
-- Run this to check why professionals page shows 0 results
-- ============================================================================

-- 1. Check if required columns exist
SELECT '=== COLUMN CHECK ===' as info;

SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'professional_profiles'
  AND column_name IN ('profile_visible', 'available_for_work', 'is_self_employed', 'latitude', 'longitude')
ORDER BY column_name;

-- 2. Check professional profile counts
SELECT '=== PROFILE COUNTS ===' as info;

SELECT
  COUNT(*) as total_professionals,
  COUNT(CASE WHEN profile_visible = true THEN 1 END) as visible,
  COUNT(CASE WHEN available_for_work = true THEN 1 END) as available_for_work,
  COUNT(CASE WHEN is_self_employed = true THEN 1 END) as self_employed,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coordinates,
  COUNT(CASE WHEN
    profile_visible = true
    AND available_for_work = true
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
  THEN 1 END) as should_appear_in_search
FROM professional_profiles;

-- 3. Show sample professionals that should appear
SELECT '=== SAMPLE VISIBLE PROFESSIONALS ===' as info;

SELECT
  id,
  first_name,
  last_name,
  title,
  location,
  latitude,
  longitude,
  profile_visible,
  available_for_work,
  is_self_employed,
  spoken_languages,
  created_at
FROM professional_profiles
WHERE profile_visible = true
  AND available_for_work = true
LIMIT 10;

-- 4. Check if there are any profiles with is_searchable column (should NOT exist)
SELECT '=== CHECKING FOR INVALID COLUMNS ===' as info;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'professional_profiles'
  AND column_name LIKE '%search%';

-- 5. Check profiles missing coordinates
SELECT '=== PROFILES MISSING COORDINATES ===' as info;

SELECT
  COUNT(*) as profiles_without_coordinates
FROM professional_profiles
WHERE profile_visible = true
  AND available_for_work = true
  AND (latitude IS NULL OR longitude IS NULL);

-- 6. Full summary
SELECT '=== SEARCH READINESS SUMMARY ===' as info;

SELECT
  'professional_profiles' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN profile_visible = true THEN 1 END) as visible,
  COUNT(CASE WHEN available_for_work = true THEN 1 END) as available,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coords,
  COUNT(CASE WHEN
    profile_visible = true
    AND available_for_work = true
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
  THEN 1 END) as ready_for_search,
  ROUND(100.0 * COUNT(CASE WHEN
    profile_visible = true
    AND available_for_work = true
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
  THEN 1 END) / NULLIF(COUNT(*), 0), 1) as percent_ready
FROM professional_profiles;
