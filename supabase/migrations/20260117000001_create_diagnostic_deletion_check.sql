-- Diagnostic function to check for leftover data after account deletion
-- Usage: SELECT * FROM check_user_deletion_leftovers('user@example.com');

CREATE OR REPLACE FUNCTION check_user_deletion_leftovers(p_email TEXT)
RETURNS TABLE (
  table_name TEXT,
  record_count BIGINT,
  record_ids TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_professional_id UUID;
  v_company_id UUID;
  v_homeowner_id UUID;
BEGIN
  -- Try to find user_id from email (in auth.users or public.users if still exists)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  -- If not in auth, check public.users (orphaned record)
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;
  END IF;

  -- Get profile IDs if they exist
  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_professional_id FROM professional_profiles WHERE user_id = v_user_id;
    SELECT id INTO v_company_id FROM company_profiles WHERE user_id = v_user_id;
    SELECT id INTO v_homeowner_id FROM homeowner_profiles WHERE user_id = v_user_id;
  END IF;

  -- Check auth.users
  RETURN QUERY
  SELECT
    'auth.users'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_email);

  -- Check public.users
  RETURN QUERY
  SELECT
    'public.users'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM public.users
  WHERE v_user_id IS NOT NULL AND id = v_user_id;

  -- Check professional_profiles
  RETURN QUERY
  SELECT
    'professional_profiles'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM professional_profiles
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check company_profiles
  RETURN QUERY
  SELECT
    'company_profiles'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM company_profiles
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check homeowner_profiles
  RETURN QUERY
  SELECT
    'homeowner_profiles'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM homeowner_profiles
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check job_applications
  RETURN QUERY
  SELECT
    'job_applications'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM job_applications
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check saved_jobs
  RETURN QUERY
  SELECT
    'saved_jobs'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM saved_jobs
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check messages (sender or receiver)
  RETURN QUERY
  SELECT
    'messages'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM messages
  WHERE v_user_id IS NOT NULL AND (sender_id = v_user_id OR receiver_id = v_user_id);

  -- Check notifications
  RETURN QUERY
  SELECT
    'notifications'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM notifications
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check subscriptions
  RETURN QUERY
  SELECT
    'subscriptions'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM subscriptions
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check user_skills
  RETURN QUERY
  SELECT
    'user_skills'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM user_skills
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check portfolios (via professional_id)
  RETURN QUERY
  SELECT
    'portfolios'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM portfolios
  WHERE v_professional_id IS NOT NULL AND professional_id = v_professional_id;

  -- Check certifications (via professional_id)
  RETURN QUERY
  SELECT
    'certifications'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM certifications
  WHERE v_professional_id IS NOT NULL AND professional_id = v_professional_id;

  -- Check experiences (via professional_id)
  RETURN QUERY
  SELECT
    'experiences'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM experiences
  WHERE v_professional_id IS NOT NULL AND professional_id = v_professional_id;

  -- Check professional_cvs (via professional_id)
  RETURN QUERY
  SELECT
    'professional_cvs'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM professional_cvs
  WHERE v_professional_id IS NOT NULL AND professional_id = v_professional_id;

  -- Check saved_traders (homeowner or professional)
  RETURN QUERY
  SELECT
    'saved_traders'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM saved_traders
  WHERE (v_homeowner_id IS NOT NULL AND homeowner_id = v_homeowner_id)
     OR (v_professional_id IS NOT NULL AND professional_id = v_professional_id);

  -- Check email_preferences
  RETURN QUERY
  SELECT
    'email_preferences'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM email_preferences
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check notification_preferences
  RETURN QUERY
  SELECT
    'notification_preferences'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM notification_preferences
  WHERE v_user_id IS NOT NULL AND user_id = v_user_id;

  -- Check reviews (reviewer or reviewed)
  RETURN QUERY
  SELECT
    'reviews'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM reviews
  WHERE v_user_id IS NOT NULL AND (reviewer_id = v_user_id OR reviewed_id = v_user_id);

  -- Check jobs posted by user (via company or professional)
  RETURN QUERY
  SELECT
    'jobs'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM jobs
  WHERE (v_company_id IS NOT NULL AND company_id = v_company_id)
     OR (v_homeowner_id IS NOT NULL AND homeowner_id = v_homeowner_id);

  -- Check account_deletion_reasons (for analytics)
  RETURN QUERY
  SELECT
    'account_deletion_reasons'::TEXT,
    COUNT(*)::BIGINT,
    string_agg(id::TEXT, ', ')::TEXT
  FROM account_deletion_reasons
  WHERE LOWER(user_email) = LOWER(p_email);

END;
$$;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION check_user_deletion_leftovers(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_deletion_leftovers(TEXT) TO service_role;

-- Comment
COMMENT ON FUNCTION check_user_deletion_leftovers(TEXT) IS
'Diagnostic function to check for leftover data after account deletion. Returns a table showing which tables still contain records for the given email address.';
