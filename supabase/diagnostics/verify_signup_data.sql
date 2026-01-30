-- ============================================
-- SIGNUP DATA VERIFICATION QUERIES
-- Run these in Supabase SQL Editor to debug signup issues
-- ============================================

-- 1. CHECK AUTH USERS TABLE
-- Shows all users created via signup with their metadata
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data,
  raw_app_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. CHECK USERS TABLE (PUBLIC)
-- Shows if user records were created in public.users
SELECT
  id,
  email,
  user_type,
  account_type,
  is_jobseeker,
  is_homeowner,
  is_employer,
  is_tradespeople,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. CHECK PROFILE TABLES - See which profiles exist
-- Professional Profiles
SELECT
  id,
  user_id,
  first_name,
  last_name,
  title,
  location,
  latitude,
  longitude,
  onboarding_completed,
  created_at
FROM public.professional_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Company Profiles
SELECT
  id,
  user_id,
  company_name,
  industry,
  services,
  location,
  latitude,
  longitude,
  phone_number,
  onboarding_completed,
  created_at
FROM public.company_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Contractor Profiles
SELECT
  id,
  user_id,
  company_name,
  trade,
  services,
  location,
  onboarding_completed,
  created_at
FROM public.contractor_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Homeowner Profiles
SELECT
  id,
  user_id,
  first_name,
  last_name,
  location,
  onboarding_completed,
  created_at
FROM public.homeowner_profiles
ORDER BY created_at DESC
LIMIT 5;

-- 4. CHECK REQUIRED COLUMNS FOR EACH PROFILE TABLE
-- Professional Profiles - Required Columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'professional_profiles'
  AND table_schema = 'public'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- Company Profiles - Required Columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'company_profiles'
  AND table_schema = 'public'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- Contractor Profiles - Required Columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contractor_profiles'
  AND table_schema = 'public'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- Homeowner Profiles - Required Columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'homeowner_profiles'
  AND table_schema = 'public'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 5. FIND ORPHANED USERS (users without profiles)
-- Users in auth.users but NOT in public.users
SELECT
  au.id,
  au.email,
  au.created_at,
  au.email_confirmed_at,
  au.raw_user_meta_data->>'user_type' as metadata_user_type
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Users in public.users but WITHOUT profiles
SELECT
  u.id,
  u.email,
  u.user_type,
  u.account_type,
  CASE
    WHEN u.user_type = 'professional' THEN EXISTS(SELECT 1 FROM professional_profiles WHERE user_id = u.id)
    WHEN u.user_type = 'company' THEN EXISTS(SELECT 1 FROM company_profiles WHERE user_id = u.id)
    WHEN u.user_type = 'contractor' THEN EXISTS(SELECT 1 FROM contractor_profiles WHERE user_id = u.id)
    WHEN u.user_type = 'homeowner' THEN EXISTS(SELECT 1 FROM homeowner_profiles WHERE user_id = u.id)
  END as has_profile
FROM public.users u
WHERE u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC;

-- 6. CHECK RECENT SIGNUP ATTEMPTS (Last 24 hours)
-- See what metadata was saved during signup
SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data->>'user_type' as user_type,
  raw_user_meta_data->>'account_type' as account_type,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'company_name' as company_name,
  raw_user_meta_data->>'trade' as trade,
  raw_user_meta_data->>'location' as location,
  raw_user_meta_data->>'latitude' as latitude,
  raw_user_meta_data->>'longitude' as longitude
FROM auth.users
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 7. CHECK TRIGGERS ON AUTH.USERS
-- See if triggers are set up to auto-create profiles
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- 8. TEST SPECIFIC USER BY EMAIL
-- Replace 'user@example.com' with actual email
-- Shows complete user data across all tables
DO $$
DECLARE
  v_email TEXT := 'user@example.com'; -- CHANGE THIS
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found in auth.users with email: %', v_email;
  ELSE
    RAISE NOTICE 'User ID: %', v_user_id;

    -- Check public.users
    IF EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) THEN
      RAISE NOTICE '✓ Found in public.users';
    ELSE
      RAISE NOTICE '✗ NOT found in public.users';
    END IF;

    -- Check profiles
    IF EXISTS(SELECT 1 FROM professional_profiles WHERE user_id = v_user_id) THEN
      RAISE NOTICE '✓ Has professional_profile';
    END IF;

    IF EXISTS(SELECT 1 FROM company_profiles WHERE user_id = v_user_id) THEN
      RAISE NOTICE '✓ Has company_profile';
    END IF;

    IF EXISTS(SELECT 1 FROM contractor_profiles WHERE user_id = v_user_id) THEN
      RAISE NOTICE '✓ Has contractor_profile';
    END IF;

    IF EXISTS(SELECT 1 FROM homeowner_profiles WHERE user_id = v_user_id) THEN
      RAISE NOTICE '✓ Has homeowner_profile';
    END IF;
  END IF;
END $$;

-- 9. CHECK DATABASE FUNCTIONS
-- See if profile creation functions exist
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%profile%'
  OR routine_name LIKE '%user%'
ORDER BY routine_name;

-- 10. QUICK STATS
-- Overview of your data
SELECT
  'Auth Users' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as unconfirmed_count
FROM auth.users
UNION ALL
SELECT
  'Public Users',
  COUNT(*),
  COUNT(CASE WHEN id IN (SELECT user_id FROM professional_profiles) THEN 1 END),
  COUNT(CASE WHEN id NOT IN (SELECT user_id FROM professional_profiles) THEN 1 END)
FROM public.users
UNION ALL
SELECT
  'Professional Profiles',
  COUNT(*),
  COUNT(CASE WHEN onboarding_completed = true THEN 1 END),
  COUNT(CASE WHEN onboarding_completed = false THEN 1 END)
FROM professional_profiles
UNION ALL
SELECT
  'Company Profiles',
  COUNT(*),
  COUNT(CASE WHEN onboarding_completed = true THEN 1 END),
  COUNT(CASE WHEN onboarding_completed = false THEN 1 END)
FROM company_profiles
UNION ALL
SELECT
  'Contractor Profiles',
  COUNT(*),
  COUNT(CASE WHEN onboarding_completed = true THEN 1 END),
  COUNT(CASE WHEN onboarding_completed = false THEN 1 END)
FROM contractor_profiles
UNION ALL
SELECT
  'Homeowner Profiles',
  COUNT(*),
  COUNT(CASE WHEN onboarding_completed = true THEN 1 END),
  COUNT(CASE WHEN onboarding_completed = false THEN 1 END)
FROM homeowner_profiles;
