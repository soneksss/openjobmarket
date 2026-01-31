-- Check ALL columns in company_profiles table
-- This helps identify missing columns or data type mismatches

SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  character_maximum_length,
  CASE
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠️ REQUIRED - NO DEFAULT'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN '✓ REQUIRED - HAS DEFAULT'
    ELSE '○ OPTIONAL'
  END as requirement_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'company_profiles'
ORDER BY ordinal_position;

-- List specific columns that edit form is trying to update
SELECT 'Checking if edit form columns exist...' as info;

SELECT
  cols.check_column as column_name,
  EXISTS(SELECT 1 FROM information_schema.columns
         WHERE table_name = 'company_profiles'
         AND column_name = cols.check_column
         AND table_schema = 'public') as column_exists
FROM (VALUES
  ('company_name'),
  ('description'),
  ('industry'),
  ('services'),
  ('website_url'),
  ('phone_number'),
  ('location'),
  ('full_address'),
  ('hide_address'),
  ('hide_company_info'),
  ('hide_contact_info'),
  ('latitude'),
  ('longitude'),
  ('logo_url'),
  ('spoken_languages'),
  ('service_24_7'),
  ('price_list'),
  ('updated_at')
) AS cols(check_column);

-- Check RLS policies on company_profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'company_profiles'
ORDER BY policyname;
