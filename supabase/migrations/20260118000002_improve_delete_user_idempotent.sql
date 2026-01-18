-- Improved Idempotent Account Deletion Function
-- Date: 2026-01-18
-- Description: Enhanced deletion function that is fully idempotent and safe to retry

DROP FUNCTION IF EXISTS delete_user_comprehensive(deletion_reason_type, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION delete_user_comprehensive(
  p_primary_reason deletion_reason_type,
  p_custom_message TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_user_password TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_account_created_at TIMESTAMPTZ;
  v_days_as_member INTEGER;
  v_country TEXT;
  v_locale TEXT;
  v_professional_id UUID;
  v_company_id UUID;
  v_homeowner_id UUID;
  v_deletion_count INTEGER := 0;
  v_total_deletions INTEGER := 0;
  v_auth_user_exists BOOLEAN := FALSE;
  v_already_deleted BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Check if auth user still exists (idempotency check)
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_user_id)
  INTO v_auth_user_exists;

  IF NOT v_auth_user_exists THEN
    -- User already deleted
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Account already deleted (idempotent)',
      'already_deleted', true
    );
  END IF;

  -- Retrieve user data before deletion for deletion tracking
  SELECT email, created_at INTO v_user_email, v_account_created_at
  FROM auth.users
  WHERE id = v_user_id;

  -- Get user metadata from public.users (may not exist if partially deleted)
  BEGIN
    SELECT
      CASE
        WHEN is_employer THEN 'employer'
        WHEN is_jobseeker THEN 'jobseeker'
        WHEN is_homeowner THEN 'homeowner'
        WHEN is_tradespeople THEN 'tradespeople'
        ELSE 'user'
      END,
      country
    INTO v_user_role, v_country
    FROM users
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_role := 'unknown';
    v_country := NULL;
    RAISE NOTICE 'User metadata not found in public.users (may be partially deleted)';
  END;

  -- Calculate days as member
  v_days_as_member := COALESCE(EXTRACT(DAY FROM (NOW() - v_account_created_at))::INTEGER, 0);

  -- Get locale from session or default to 'en'
  v_locale := COALESCE(current_setting('request.headers', true)::json->>'accept-language', 'en');

  -- Get profile IDs for cleanup (may not exist if partially deleted)
  SELECT id INTO v_professional_id FROM professional_profiles WHERE user_id = v_user_id;
  SELECT id INTO v_company_id FROM company_profiles WHERE user_id = v_user_id;
  SELECT id INTO v_homeowner_id FROM homeowner_profiles WHERE user_id = v_user_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting comprehensive deletion for user: % (%)', v_user_id, v_user_email;
  RAISE NOTICE 'Professional ID: %, Company ID: %, Homeowner ID: %',
    v_professional_id, v_company_id, v_homeowner_id;
  RAISE NOTICE '========================================';

  -- =====================================================================
  -- DELETION ORDER: Delete in dependency order (children before parents)
  -- All DELETE operations are idempotent (safe to retry)
  -- =====================================================================

  -- 1. Delete professional-related records (depends on professional_id)
  IF v_professional_id IS NOT NULL THEN
    DELETE FROM portfolios WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
    v_total_deletions := v_total_deletions + v_deletion_count;
    RAISE NOTICE '[1/14] Deleted % portfolio records', v_deletion_count;

    DELETE FROM certifications WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
    v_total_deletions := v_total_deletions + v_deletion_count;
    RAISE NOTICE '[2/14] Deleted % certification records', v_deletion_count;

    DELETE FROM experiences WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
    v_total_deletions := v_total_deletions + v_deletion_count;
    RAISE NOTICE '[3/14] Deleted % experience records', v_deletion_count;

    DELETE FROM professional_cvs WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
    v_total_deletions := v_total_deletions + v_deletion_count;
    RAISE NOTICE '[4/14] Deleted % CV records', v_deletion_count;

    DELETE FROM saved_traders WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
    v_total_deletions := v_total_deletions + v_deletion_count;
    RAISE NOTICE '[5/14] Deleted % saved traders (as professional)', v_deletion_count;
  END IF;

  -- 2. Delete homeowner-related records (depends on homeowner_id)
  IF v_homeowner_id IS NOT NULL THEN
    DELETE FROM saved_traders WHERE homeowner_id = v_homeowner_id;
    GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
    v_total_deletions := v_total_deletions + v_deletion_count;
    RAISE NOTICE '[6/14] Deleted % saved traders (as homeowner)', v_deletion_count;
  END IF;

  -- 3. Delete jobs posted by user (before deleting profiles)
  IF v_company_id IS NOT NULL THEN
    DELETE FROM jobs WHERE company_id = v_company_id;
    GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
    v_total_deletions := v_total_deletions + v_deletion_count;
    RAISE NOTICE '[7/14] Deleted % jobs (as company)', v_deletion_count;
  END IF;

  IF v_homeowner_id IS NOT NULL THEN
    DELETE FROM jobs WHERE homeowner_id = v_homeowner_id;
    GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
    v_total_deletions := v_total_deletions + v_deletion_count;
    RAISE NOTICE '[8/14] Deleted % jobs (as homeowner)', v_deletion_count;
  END IF;

  -- 4. Delete user activity records (depends on user_id) - IDEMPOTENT
  DELETE FROM job_applications WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE '[9/14] Deleted % job applications', v_deletion_count;

  DELETE FROM saved_jobs WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE '[10/14] Deleted % saved jobs', v_deletion_count;

  DELETE FROM messages WHERE sender_id = v_user_id OR receiver_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE '[11/14] Deleted % messages', v_deletion_count;

  DELETE FROM notifications WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE '[12/14] Deleted % notifications', v_deletion_count;

  DELETE FROM subscriptions WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE '[13/14] Deleted % subscriptions', v_deletion_count;

  DELETE FROM user_skills WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE '[14/14] Deleted % user skills', v_deletion_count;

  DELETE FROM reviews WHERE reviewer_id = v_user_id OR reviewed_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE 'Deleted % reviews', v_deletion_count;

  DELETE FROM email_preferences WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE 'Deleted % email preferences', v_deletion_count;

  DELETE FROM notification_preferences WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE 'Deleted % notification preferences', v_deletion_count;

  -- 5. Delete profile records (before deleting public.users) - IDEMPOTENT
  DELETE FROM professional_profiles WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE 'Deleted % professional profiles', v_deletion_count;

  DELETE FROM company_profiles WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE 'Deleted % company profiles', v_deletion_count;

  DELETE FROM homeowner_profiles WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE 'Deleted % homeowner profiles', v_deletion_count;

  -- 6. Insert deletion reason for analytics (BEFORE deleting auth user)
  -- Use ON CONFLICT to make this idempotent
  BEGIN
    INSERT INTO account_deletion_reasons (
      user_id,
      user_email,
      user_role,
      primary_reason,
      custom_message,
      country,
      locale,
      account_created_at,
      days_as_member
    ) VALUES (
      v_user_id,
      v_user_email,
      v_user_role,
      p_primary_reason,
      p_custom_message,
      v_country,
      v_locale,
      v_account_created_at,
      v_days_as_member
    )
    ON CONFLICT (user_id) DO UPDATE SET
      updated_at = NOW(); -- Just update timestamp if already exists

    RAISE NOTICE 'Recorded deletion reason for analytics';
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail deletion if analytics insert fails
    RAISE WARNING 'Failed to record deletion reason: %', SQLERRM;
  END;

  -- 7. Delete from public.users (if exists) - IDEMPOTENT
  DELETE FROM users WHERE id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE 'Deleted % public user records', v_deletion_count;

  -- 8. FINAL STEP: Delete from auth.users (this is the auth account) - IDEMPOTENT
  DELETE FROM auth.users WHERE id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  v_total_deletions := v_total_deletions + v_deletion_count;
  RAISE NOTICE 'Deleted % auth user records', v_deletion_count;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DELETION COMPLETE: Total records deleted: %', v_total_deletions;
  RAISE NOTICE '========================================';

  -- Success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account successfully deleted',
    'user_id', v_user_id,
    'email', v_user_email,
    'total_deletions', v_total_deletions,
    'already_deleted', false
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return detailed error for debugging
    RAISE WARNING 'Error during deletion: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE,
      'user_id', v_user_id
    );
END;
$$;

-- Grant execution to authenticated users (they can only delete their own account due to auth.uid() check)
GRANT EXECUTE ON FUNCTION delete_user_comprehensive(deletion_reason_type, TEXT, TEXT, TEXT) TO authenticated;

-- Comment
COMMENT ON FUNCTION delete_user_comprehensive(deletion_reason_type, TEXT, TEXT, TEXT) IS
'IMPROVED IDEMPOTENT: Comprehensive user deletion function that deletes all user data in the correct dependency order before removing the auth user. Safe to retry if partially deleted. Ensures no orphaned records remain. Tracks deletion reason for analytics.';
