-- ============================================
-- Check ALL profile tables for column consistency
-- Find mismatches that could cause search bugs
-- ============================================

-- 1. Check language column names across all profile tables
SELECT 'Language Columns Check' as info;

SELECT
  'company_profiles' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'company_profiles'
  AND (column_name LIKE '%language%' OR column_name LIKE '%languages%')

UNION ALL

SELECT
  'contractor_profiles' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contractor_profiles'
  AND (column_name LIKE '%language%' OR column_name LIKE '%languages%')

UNION ALL

SELECT
  'professional_profiles' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'professional_profiles'
  AND (column_name LIKE '%language%' OR column_name LIKE '%languages%')

UNION ALL

SELECT
  'homeowner_profiles' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'homeowner_profiles'
  AND (column_name LIKE '%language%' OR column_name LIKE '%languages%');

-- 2. Check services column names across all profile tables
SELECT 'Services Columns Check' as info;

SELECT
  'company_profiles' as table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'company_profiles'
  AND (column_name LIKE '%service%' OR column_name LIKE '%trade%')

UNION ALL

SELECT
  'contractor_profiles' as table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contractor_profiles'
  AND (column_name LIKE '%service%' OR column_name LIKE '%trade%')

UNION ALL

SELECT
  'professional_profiles' as table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'professional_profiles'
  AND (column_name LIKE '%service%' OR column_name LIKE '%skill%' OR column_name LIKE '%trade%');

-- 3. Check location columns across all profile tables
SELECT 'Location Columns Check' as info;

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('company_profiles', 'contractor_profiles', 'professional_profiles', 'homeowner_profiles')
  AND (column_name IN ('latitude', 'longitude', 'location'))
ORDER BY table_name, column_name;

-- 4. Check for open_for_business or similar availability flags
SELECT 'Availability Flags Check' as info;

SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('company_profiles', 'contractor_profiles', 'professional_profiles', 'homeowner_profiles')
  AND (column_name LIKE '%open%' OR column_name LIKE '%available%' OR column_name LIKE '%business%')
ORDER BY table_name, column_name;

-- 5. Summary of critical searchable columns by table
SELECT 'Summary: Searchable Columns by Table' as info;

SELECT
  'company_profiles' as table_name,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'company_profiles'
  AND column_name IN ('company_name', 'industry', 'services', 'spoken_languages', 'languages',
                      'location', 'latitude', 'longitude', 'open_for_business')

UNION ALL

SELECT
  'contractor_profiles' as table_name,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contractor_profiles'
  AND column_name IN ('company_name', 'industry', 'services', 'spoken_languages', 'languages',
                      'location', 'latitude', 'longitude', 'available_247', 'open_for_business')

UNION ALL

SELECT
  'professional_profiles' as table_name,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'professional_profiles'
  AND column_name IN ('first_name', 'last_name', 'title', 'skills', 'spoken_languages', 'languages',
                      'location', 'latitude', 'longitude', 'is_self_employed');
