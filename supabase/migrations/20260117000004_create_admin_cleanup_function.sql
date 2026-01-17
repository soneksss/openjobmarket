-- Admin function to manually cleanup orphaned records
-- This is useful for cleaning up any data inconsistencies that might block re-signup

CREATE OR REPLACE FUNCTION admin_cleanup_orphaned_records(p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orphaned_user_id UUID;
  v_professional_id UUID;
  v_company_id UUID;
  v_homeowner_id UUID;
  v_deletion_summary jsonb := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  -- Security check: Only admins can run this
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  RAISE NOTICE 'Starting orphaned records cleanup for email: %', p_email;

  -- Find orphaned user records (public.users without corresponding auth.users)
  SELECT u.id INTO v_orphaned_user_id
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE LOWER(u.email) = LOWER(p_email)
    AND au.id IS NULL
  LIMIT 1;

  IF v_orphaned_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No orphaned records found for this email',
      'email', p_email
    );
  END IF;

  RAISE NOTICE 'Found orphaned user record: %', v_orphaned_user_id;

  -- Get profile IDs
  SELECT id INTO v_professional_id FROM professional_profiles WHERE user_id = v_orphaned_user_id;
  SELECT id INTO v_company_id FROM company_profiles WHERE user_id = v_orphaned_user_id;
  SELECT id INTO v_homeowner_id FROM homeowner_profiles WHERE user_id = v_orphaned_user_id;

  -- Initialize deletion summary
  v_deletion_summary := jsonb_build_object('user_id', v_orphaned_user_id, 'email', p_email);

  -- =====================================================================
  -- DELETE ORPHANED RECORDS IN DEPENDENCY ORDER
  -- =====================================================================

  -- 1. Professional-related records
  IF v_professional_id IS NOT NULL THEN
    DELETE FROM portfolios WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deletion_summary := v_deletion_summary || jsonb_build_object('portfolios', v_count);

    DELETE FROM certifications WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deletion_summary := v_deletion_summary || jsonb_build_object('certifications', v_count);

    DELETE FROM experiences WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deletion_summary := v_deletion_summary || jsonb_build_object('experiences', v_count);

    DELETE FROM professional_cvs WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deletion_summary := v_deletion_summary || jsonb_build_object('professional_cvs', v_count);

    DELETE FROM saved_traders WHERE professional_id = v_professional_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deletion_summary := v_deletion_summary || jsonb_build_object('saved_traders_professional', v_count);
  END IF;

  -- 2. Homeowner-related records
  IF v_homeowner_id IS NOT NULL THEN
    DELETE FROM saved_traders WHERE homeowner_id = v_homeowner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deletion_summary := v_deletion_summary || jsonb_build_object('saved_traders_homeowner', v_count);
  END IF;

  -- 3. Jobs posted by user
  IF v_company_id IS NOT NULL THEN
    DELETE FROM jobs WHERE company_id = v_company_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deletion_summary := v_deletion_summary || jsonb_build_object('jobs_company', v_count);
  END IF;

  IF v_homeowner_id IS NOT NULL THEN
    DELETE FROM jobs WHERE homeowner_id = v_homeowner_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deletion_summary := v_deletion_summary || jsonb_build_object('jobs_homeowner', v_count);
  END IF;

  -- 4. User activity records
  DELETE FROM job_applications WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('job_applications', v_count);

  DELETE FROM saved_jobs WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('saved_jobs', v_count);

  DELETE FROM messages WHERE sender_id = v_orphaned_user_id OR receiver_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('messages', v_count);

  DELETE FROM notifications WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('notifications', v_count);

  DELETE FROM subscriptions WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('subscriptions', v_count);

  DELETE FROM user_skills WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('user_skills', v_count);

  DELETE FROM reviews WHERE reviewer_id = v_orphaned_user_id OR reviewed_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('reviews', v_count);

  DELETE FROM email_preferences WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('email_preferences', v_count);

  DELETE FROM notification_preferences WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('notification_preferences', v_count);

  -- 5. Profile records
  DELETE FROM professional_profiles WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('professional_profiles', v_count);

  DELETE FROM company_profiles WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('company_profiles', v_count);

  DELETE FROM homeowner_profiles WHERE user_id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('homeowner_profiles', v_count);

  -- 6. Delete orphaned user record
  DELETE FROM public.users WHERE id = v_orphaned_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deletion_summary := v_deletion_summary || jsonb_build_object('users', v_count);

  RAISE NOTICE 'Cleanup complete for orphaned user %', v_orphaned_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Orphaned records cleaned up successfully',
    'deleted_records', v_deletion_summary
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE,
      'partial_deletion', v_deletion_summary
    );
END;
$$;

-- Grant execution to service role only (for admin operations)
GRANT EXECUTE ON FUNCTION admin_cleanup_orphaned_records(TEXT) TO service_role;

-- Comment
COMMENT ON FUNCTION admin_cleanup_orphaned_records(TEXT) IS
'Admin function to manually cleanup orphaned records that might block re-signup. Only accessible to admin users. Returns detailed summary of deleted records.';


-- Create a helper function to find all orphaned user records
CREATE OR REPLACE FUNCTION admin_find_all_orphaned_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  user_type TEXT,
  created_at TIMESTAMPTZ,
  has_auth_record BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: Only admins can run this
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email,
    u.user_type,
    u.created_at,
    (au.id IS NOT NULL) as has_auth_record
  FROM public.users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE au.id IS NULL  -- Orphaned records (no auth user)
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execution to service role
GRANT EXECUTE ON FUNCTION admin_find_all_orphaned_users() TO service_role;

COMMENT ON FUNCTION admin_find_all_orphaned_users() IS
'Admin function to find all orphaned user records (public.users without corresponding auth.users). Useful for identifying data inconsistencies.';
