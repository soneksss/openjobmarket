-- Check what columns exist in contractor_profiles
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contractor_profiles'
ORDER BY ordinal_position;
