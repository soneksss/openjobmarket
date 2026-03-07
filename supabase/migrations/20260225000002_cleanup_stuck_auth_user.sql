-- =============================================================================
-- CLEANUP: Find all FK references to auth.users and remove them
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

-- STEP 1: Find ALL tables with foreign keys pointing to auth.users
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.key_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'auth'
  AND ccu.table_name = 'users'
ORDER BY tc.table_schema, tc.table_name;

-- =============================================================================
-- STEP 2: Clean up ALL remaining rows for this user across every table
-- =============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'soneksss@inbox.lv';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found in auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'Cleaning up user: %', v_user_id;

  -- public schema tables that reference user_id directly
  DELETE FROM public.users WHERE id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'public.users: %', v_count;

  DELETE FROM public.professional_profiles WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'professional_profiles: %', v_count;

  DELETE FROM public.company_profiles WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'company_profiles: %', v_count;

  DELETE FROM public.homeowner_profiles WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'homeowner_profiles: %', v_count;

  DELETE FROM public.contractor_profiles WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'contractor_profiles: %', v_count;

  DELETE FROM public.job_applications WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'job_applications: %', v_count;

  DELETE FROM public.saved_jobs WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'saved_jobs: %', v_count;

  -- messages uses sender_id + recipient_id (not receiver_id)
  DELETE FROM public.messages WHERE sender_id = v_user_id OR recipient_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'messages: %', v_count;

  -- conversations (participant_1 / participant_2 - has ON DELETE CASCADE but cleanup anyway)
  DELETE FROM public.conversations WHERE participant_1 = v_user_id OR participant_2 = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'conversations: %', v_count;

  DELETE FROM public.notifications WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'notifications: %', v_count;

  DELETE FROM public.subscriptions WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'subscriptions: %', v_count;

  DELETE FROM public.reviews WHERE reviewer_id = v_user_id OR reviewee_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'reviews: %', v_count;

  DELETE FROM public.email_preferences WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'email_preferences: %', v_count;

  DELETE FROM public.notification_preferences WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'notification_preferences: %', v_count;

  DELETE FROM public.user_skills WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'user_skills: %', v_count;

  DELETE FROM public.account_deletion_reasons WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'account_deletion_reasons: %', v_count;

  -- app_feedback if it exists
  BEGIN
    DELETE FROM public.app_feedback WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'app_feedback: %', v_count;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'app_feedback: table not found, skipping';
  END;

  -- saved_traders
  BEGIN
    DELETE FROM public.saved_traders
    WHERE professional_id IN (SELECT id FROM professional_profiles WHERE user_id = v_user_id)
       OR homeowner_id IN (SELECT id FROM homeowner_profiles WHERE user_id = v_user_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'saved_traders: %', v_count;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'saved_traders: skipped';
  END;

  RAISE NOTICE '----------------------------------------------';
  RAISE NOTICE 'All public data cleaned. Attempting auth deletion...';
  RAISE NOTICE '----------------------------------------------';

  -- Now attempt auth deletion
  DELETE FROM auth.users WHERE id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 1 THEN
    RAISE NOTICE 'SUCCESS: auth.users deleted ✓';
  ELSE
    RAISE NOTICE 'FAILED: auth.users row not deleted (0 rows affected)';
    RAISE NOTICE 'Try: Dashboard → Authentication → Users → Delete';
  END IF;

END $$;