-- =============================================================================
-- DIAGNOSTIC: Account deletion state check for soneksss@inbox.lv
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

-- STEP 1: Find the user ID for this email
DO $$
DECLARE
  v_user_id UUID;
  v_public_user RECORD;
  v_has_professional BOOLEAN;
  v_has_company BOOLEAN;
  v_has_homeowner BOOLEAN;
  v_has_contractor BOOLEAN;
  v_app_count INTEGER;
  v_job_count INTEGER;
  v_can_delete_auth BOOLEAN := FALSE;
BEGIN
  -- Check auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'soneksss@inbox.lv';

  IF v_user_id IS NULL THEN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'auth.users:     NOT FOUND (auth user is deleted ✓)';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'This account is fully deleted. No action needed.';
    RETURN;
  END IF;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'DIAGNOSTIC REPORT: soneksss@inbox.lv';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'auth.users:      EXISTS  user_id = %', v_user_id;

  -- Check public.users
  SELECT * INTO v_public_user FROM public.users WHERE id = v_user_id;
  IF FOUND THEN
    RAISE NOTICE 'public.users:    EXISTS  user_type = %', v_public_user.user_type;
  ELSE
    RAISE NOTICE 'public.users:    NOT FOUND (partial deletion already happened)';
  END IF;

  -- Check profiles
  SELECT EXISTS(SELECT 1 FROM professional_profiles WHERE user_id = v_user_id) INTO v_has_professional;
  SELECT EXISTS(SELECT 1 FROM company_profiles WHERE user_id = v_user_id) INTO v_has_company;
  SELECT EXISTS(SELECT 1 FROM homeowner_profiles WHERE user_id = v_user_id) INTO v_has_homeowner;
  SELECT EXISTS(SELECT 1 FROM contractor_profiles WHERE user_id = v_user_id) INTO v_has_contractor;

  RAISE NOTICE 'professional_profiles: %', CASE WHEN v_has_professional THEN 'EXISTS' ELSE 'not found' END;
  RAISE NOTICE 'company_profiles:      %', CASE WHEN v_has_company THEN 'EXISTS' ELSE 'not found' END;
  RAISE NOTICE 'homeowner_profiles:    %', CASE WHEN v_has_homeowner THEN 'EXISTS' ELSE 'not found' END;
  RAISE NOTICE 'contractor_profiles:   %', CASE WHEN v_has_contractor THEN 'EXISTS' ELSE 'not found' END;

  -- Check remaining data
  SELECT COUNT(*) INTO v_app_count FROM job_applications WHERE user_id = v_user_id;
  RAISE NOTICE 'job_applications:      % rows', v_app_count;

  SELECT COUNT(*) INTO v_job_count FROM jobs WHERE
    homeowner_id IN (SELECT id FROM homeowner_profiles WHERE user_id = v_user_id)
    OR company_id IN (SELECT id FROM company_profiles WHERE user_id = v_user_id);
  RAISE NOTICE 'jobs posted:           % rows', v_job_count;

  -- Check if postgres can delete from auth.users (test the permission)
  BEGIN
    PERFORM 1 FROM auth.users WHERE id = v_user_id FOR UPDATE NOWAIT;
    v_can_delete_auth := TRUE;
    RAISE NOTICE 'auth.users DELETE perm: YES (postgres can delete)';
  EXCEPTION
    WHEN lock_not_available THEN
      -- Row is locked but we have permission in principle
      v_can_delete_auth := TRUE;
      RAISE NOTICE 'auth.users DELETE perm: YES (row locked but permission ok)';
    WHEN insufficient_privilege THEN
      v_can_delete_auth := FALSE;
      RAISE NOTICE 'auth.users DELETE perm: NO - use Admin API instead';
    WHEN OTHERS THEN
      RAISE NOTICE 'auth.users DELETE perm check error: %', SQLERRM;
  END;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'CONCLUSION:';
  IF v_public_user IS NULL AND NOT v_has_professional AND NOT v_has_company THEN
    RAISE NOTICE '  → Account is PARTIALLY deleted (public data gone, auth.users remains)';
    RAISE NOTICE '  → This is the stuck state - auth user needs Admin API deletion';
  ELSE
    RAISE NOTICE '  → Account is NOT yet deleted';
  END IF;
  RAISE NOTICE '==================================================';
END $$;

-- =============================================================================
-- STEP 2: Check what delete_professional_account actually does
-- =============================================================================

SELECT
  proname AS function_name,
  prosecdef AS security_definer,
  LEFT(prosrc, 500) AS source_preview
FROM pg_proc
WHERE proname IN ('delete_professional_account', 'delete_company_account', 'delete_user_comprehensive')
ORDER BY proname;

-- =============================================================================
-- STEP 3: Check if 'withdrawn' is now in the application_status enum
-- =============================================================================

SELECT enumlabel AS status_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'application_status'
ORDER BY e.enumsortorder;

-- =============================================================================
-- STEP 4: FIX - Manually clean up the stuck account for soneksss@inbox.lv
-- Only run this AFTER confirming the state above.
-- The postgres role likely CANNOT delete from auth.users directly.
-- Use Supabase Dashboard → Authentication → Users → Delete instead.
-- OR uncomment and run this if postgres has the permission:
-- =============================================================================

/*
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'soneksss@inbox.lv';
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User already deleted';
    RETURN;
  END IF;

  -- Clean up any remaining public data first (idempotent)
  DELETE FROM job_applications WHERE user_id = v_user_id;
  DELETE FROM saved_jobs WHERE user_id = v_user_id;
  DELETE FROM messages WHERE sender_id = v_user_id OR receiver_id = v_user_id;
  DELETE FROM notifications WHERE user_id = v_user_id;
  DELETE FROM email_preferences WHERE user_id = v_user_id;
  DELETE FROM notification_preferences WHERE user_id = v_user_id;
  DELETE FROM professional_profiles WHERE user_id = v_user_id;
  DELETE FROM company_profiles WHERE user_id = v_user_id;
  DELETE FROM homeowner_profiles WHERE user_id = v_user_id;
  DELETE FROM users WHERE id = v_user_id;

  -- Attempt auth deletion (may fail if postgres lacks permission)
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'Cleanup complete for user: %', v_user_id;
END $$;
*/