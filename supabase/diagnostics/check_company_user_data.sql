-- ============================================
-- Diagnostic: Check Company User Data
-- For user: khomiuk89@gmail.com
-- ============================================

-- 1. Check auth.users record and metadata
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'user_type' as metadata_user_type,
  raw_user_meta_data->>'account_type' as metadata_account_type,
  raw_user_meta_data->>'company_name' as metadata_company_name,
  raw_user_meta_data->>'industry' as metadata_industry,
  raw_user_meta_data->>'location' as metadata_location,
  raw_user_meta_data->>'latitude' as metadata_latitude,
  raw_user_meta_data->>'longitude' as metadata_longitude,
  raw_user_meta_data->>'phone' as metadata_phone
FROM auth.users
WHERE email = 'khomiuk89@gmail.com';

-- 2. Check public.users record
SELECT
  id,
  email,
  user_type,
  account_type,
  created_at
FROM public.users
WHERE email = 'khomiuk89@gmail.com';

-- 3. Check if company_profiles exists
SELECT
  cp.id as profile_id,
  cp.user_id,
  cp.company_name,
  cp.industry,
  cp.location,
  cp.latitude,
  cp.longitude,
  cp.phone_number,
  cp.website_url,
  cp.services,
  cp.description,
  cp.onboarding_completed,
  cp.created_at,
  u.email
FROM company_profiles cp
JOIN users u ON u.id = cp.user_id
WHERE u.email = 'khomiuk89@gmail.com';

-- 4. Check all company users without profiles (orphans)
SELECT
  u.id,
  u.email,
  u.created_at as user_created,
  au.raw_user_meta_data->>'company_name' as metadata_company_name,
  au.raw_user_meta_data->>'industry' as metadata_industry,
  au.raw_user_meta_data->>'location' as metadata_location
FROM public.users u
JOIN auth.users au ON au.id = u.id
LEFT JOIN company_profiles cp ON cp.user_id = u.id
WHERE u.user_type = 'company'
  AND cp.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 5. Check if trigger function exists
SELECT
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_company_profile_from_metadata';

-- 6. Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'create_company_profile_trigger';

-- 7. Summary
DO $$
DECLARE
  v_user_id UUID;
  v_has_auth_user BOOLEAN;
  v_has_public_user BOOLEAN;
  v_has_profile BOOLEAN;
  v_metadata JSONB;
  v_company_name TEXT;
BEGIN
  -- Check khomiuk89@gmail.com specifically
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'khomiuk89@gmail.com';

  v_has_auth_user := v_user_id IS NOT NULL;
  v_has_public_user := EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id);
  v_has_profile := EXISTS(SELECT 1 FROM company_profiles WHERE user_id = v_user_id);

  IF v_has_auth_user THEN
    SELECT raw_user_meta_data INTO v_metadata FROM auth.users WHERE id = v_user_id;
    v_company_name := v_metadata->>'company_name';
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'COMPANY USER DIAGNOSTIC SUMMARY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Email: khomiuk89@gmail.com';
  RAISE NOTICE 'User ID: %', COALESCE(v_user_id::TEXT, 'NOT FOUND');
  RAISE NOTICE '';
  RAISE NOTICE 'Status Checks:';
  RAISE NOTICE '  Auth user exists: %', CASE WHEN v_has_auth_user THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '  Public user exists: %', CASE WHEN v_has_public_user THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '  Company profile exists: %', CASE WHEN v_has_profile THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '';

  IF v_has_auth_user AND NOT v_has_profile THEN
    RAISE NOTICE 'Metadata company_name: %', COALESCE(v_company_name, 'NOT SET');
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ISSUE FOUND: User exists but no company profile';
    RAISE NOTICE 'Solution: Run migration 20260130000004 to auto-create profile';
    RAISE NOTICE 'Or manually run:';
    RAISE NOTICE '  SELECT create_company_profile_from_metadata()';
    RAISE NOTICE '  FROM public.users WHERE id = ''%'';', v_user_id;
  ELSIF v_has_profile THEN
    RAISE NOTICE '✅ All good! Company profile exists';
  ELSE
    RAISE NOTICE '❌ User not found';
  END IF;

  RAISE NOTICE '============================================';
END $$;
