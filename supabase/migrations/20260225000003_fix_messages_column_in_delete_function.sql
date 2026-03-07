-- Migration: Fix wrong column name in delete_user_comprehensive
-- Date: 2026-02-25
-- Problem: messages table uses recipient_id, not receiver_id.
--          delete_user_comprehensive had: DELETE FROM messages WHERE ... OR receiver_id = v_user_id
--          which crashes with "column receiver_id does not exist" during account deletion.

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
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_user_id) INTO v_auth_user_exists;
  IF NOT v_auth_user_exists THEN
    RETURN jsonb_build_object('success', true, 'message', 'Account already deleted', 'already_deleted', true);
  END IF;

  SELECT email, created_at INTO v_user_email, v_account_created_at
  FROM auth.users WHERE id = v_user_id;

  BEGIN
    SELECT
      CASE
        WHEN is_employer    THEN 'employer'
        WHEN is_jobseeker   THEN 'jobseeker'
        WHEN is_homeowner   THEN 'homeowner'
        WHEN is_tradespeople THEN 'tradespeople'
        ELSE 'user'
      END,
      country
    INTO v_user_role, v_country
    FROM users WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_role := 'unknown'; v_country := NULL;
  END;

  v_days_as_member := COALESCE(EXTRACT(DAY FROM (NOW() - v_account_created_at))::INTEGER, 0);
  v_locale := COALESCE(current_setting('request.headers', true)::json->>'accept-language', 'en');

  SELECT id INTO v_professional_id FROM professional_profiles WHERE user_id = v_user_id;
  SELECT id INTO v_company_id       FROM company_profiles       WHERE user_id = v_user_id;
  SELECT id INTO v_homeowner_id     FROM homeowner_profiles     WHERE user_id = v_user_id;

  -- 1. Professional sub-records
  IF v_professional_id IS NOT NULL THEN
    DELETE FROM portfolios    WHERE professional_id = v_professional_id;
    DELETE FROM certifications WHERE professional_id = v_professional_id;
    DELETE FROM experiences   WHERE professional_id = v_professional_id;
    DELETE FROM professional_cvs WHERE professional_id = v_professional_id;
    DELETE FROM saved_traders WHERE professional_id = v_professional_id;
  END IF;

  -- 2. Homeowner sub-records
  IF v_homeowner_id IS NOT NULL THEN
    DELETE FROM saved_traders WHERE homeowner_id = v_homeowner_id;
  END IF;

  -- 3. Jobs posted
  IF v_company_id IS NOT NULL THEN
    DELETE FROM jobs WHERE company_id = v_company_id;
  END IF;
  IF v_homeowner_id IS NOT NULL THEN
    DELETE FROM jobs WHERE homeowner_id = v_homeowner_id;
  END IF;

  -- 4. User activity
  DELETE FROM job_applications WHERE user_id = v_user_id;
  DELETE FROM saved_jobs       WHERE user_id = v_user_id;

  -- FIX: messages uses recipient_id not receiver_id
  DELETE FROM messages WHERE sender_id = v_user_id OR recipient_id = v_user_id;

  -- conversations (participant_1 / participant_2)
  DELETE FROM conversations WHERE participant_1 = v_user_id OR participant_2 = v_user_id;

  DELETE FROM notifications            WHERE user_id = v_user_id;
  DELETE FROM subscriptions            WHERE user_id = v_user_id;
  DELETE FROM user_skills              WHERE user_id = v_user_id;
  DELETE FROM reviews                  WHERE reviewer_id = v_user_id OR reviewee_id = v_user_id;
  DELETE FROM email_preferences        WHERE user_id = v_user_id;
  DELETE FROM notification_preferences WHERE user_id = v_user_id;

  -- 5. Profiles
  DELETE FROM professional_profiles WHERE user_id = v_user_id;
  DELETE FROM company_profiles      WHERE user_id = v_user_id;
  DELETE FROM homeowner_profiles    WHERE user_id = v_user_id;
  DELETE FROM contractor_profiles   WHERE user_id = v_user_id;

  -- 6. Analytics record
  BEGIN
    INSERT INTO account_deletion_reasons (
      user_id, user_email, user_role, primary_reason, custom_message,
      country, locale, account_created_at, days_as_member
    ) VALUES (
      v_user_id, v_user_email, v_user_role, p_primary_reason, p_custom_message,
      v_country, v_locale, v_account_created_at, v_days_as_member
    )
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to record deletion reason: %', SQLERRM;
  END;

  -- 7. Public user record
  DELETE FROM users WHERE id = v_user_id;

  -- 8. Auth user — NOTE: this may silently delete 0 rows if postgres lacks
  --    permission on auth.users. The API route calls adminClient.auth.admin.deleteUser()
  --    as the authoritative auth deletion step.
  DELETE FROM auth.users WHERE id = v_user_id;
  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
  RAISE NOTICE 'auth.users deleted: % rows', v_deletion_count;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account successfully deleted',
    'user_id', v_user_id,
    'email', v_user_email,
    'already_deleted', false
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error during deletion: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE,
    'user_id', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_comprehensive(deletion_reason_type, TEXT, TEXT, TEXT) TO authenticated;