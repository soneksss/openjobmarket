-- Update delete_user function to track deletion reasons
CREATE OR REPLACE FUNCTION delete_user_with_reason(
  p_primary_reason deletion_reason_type,
  p_custom_message TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_user_password TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  v_user_email text;
  v_user_role text;
  v_country text;
  v_locale text;
  v_created_at timestamp with time zone;
  v_days_as_member integer;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();

  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user data before deletion
  SELECT
    email,
    created_at
  INTO
    v_user_email,
    v_created_at
  FROM auth.users
  WHERE id = current_user_id;

  -- Get user role from users table
  SELECT
    CASE
      WHEN is_employer THEN 'company'
      WHEN is_jobseeker THEN 'jobseeker'
      WHEN is_homeowner THEN 'homeowner'
      WHEN is_tradespeople THEN 'tradespeople'
      ELSE 'unknown'
    END
  INTO v_user_role
  FROM users
  WHERE id = current_user_id;

  -- Calculate days as member
  v_days_as_member := EXTRACT(DAY FROM (now() - v_created_at))::integer;

  -- Default locale/country
  v_locale := 'en';
  v_country := 'GLOBAL';

  -- Insert deletion reason into tracking table
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
    current_user_id,
    v_user_email,
    v_user_role,
    p_primary_reason,
    p_custom_message,
    v_country,
    v_locale,
    v_created_at,
    v_days_as_member
  );

  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = current_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_with_reason(deletion_reason_type, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user_with_reason IS 'Deletes user account after storing deletion reason for analytics';
