-- Check if CV consent and visibility columns exist in professional_profiles table
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'professional_profiles'
  AND column_name LIKE '%cv%'
ORDER BY ordinal_position;
