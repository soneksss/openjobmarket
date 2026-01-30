-- Check what columns exist in company_profiles and which are required
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠️ REQUIRED - NO DEFAULT'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN '✓ REQUIRED - HAS DEFAULT'
    ELSE '○ OPTIONAL'
  END as requirement_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'company_profiles'
ORDER BY ordinal_position;
