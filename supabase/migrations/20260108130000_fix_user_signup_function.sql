-- Migration: Fix create_user_on_signup function to handle foreign key constraints
-- Date: 2026-01-08 13:00:00
-- Description: Improved function that validates auth.users exists before inserting

CREATE OR REPLACE FUNCTION public.create_user_on_signup(
  p_user_id UUID,
  p_email TEXT,
  p_user_type TEXT,
  p_account_type TEXT,
  p_is_jobseeker BOOLEAN DEFAULT FALSE,
  p_is_homeowner BOOLEAN DEFAULT FALSE,
  p_is_employer BOOLEAN DEFAULT FALSE,
  p_is_tradespeople BOOLEAN DEFAULT FALSE,
  p_phone TEXT DEFAULT NULL,
  p_nickname TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user_exists BOOLEAN;
  existing_user_count INTEGER;
BEGIN
  -- Check if auth user exists first
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO auth_user_exists;

  IF NOT auth_user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Auth user does not exist',
      'user_id', p_user_id
    );
  END IF;

  -- Check if public.users record already exists
  SELECT COUNT(*) INTO existing_user_count
  FROM public.users
  WHERE id = p_user_id;

  IF existing_user_count > 0 THEN
    -- Update existing record
    UPDATE public.users
    SET
      email = p_email,
      user_type = p_user_type,
      account_type = p_account_type,
      is_jobseeker = p_is_jobseeker,
      is_homeowner = p_is_homeowner,
      is_employer = p_is_employer,
      is_tradespeople = p_is_tradespeople,
      phone = p_phone,
      nickname = p_nickname,
      location = p_location,
      latitude = p_latitude,
      longitude = p_longitude,
      updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- Insert new record
    INSERT INTO public.users (
      id,
      email,
      user_type,
      account_type,
      is_jobseeker,
      is_homeowner,
      is_employer,
      is_tradespeople,
      phone,
      nickname,
      location,
      latitude,
      longitude,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_email,
      p_user_type,
      p_account_type,
      p_is_jobseeker,
      p_is_homeowner,
      p_is_employer,
      p_is_tradespeople,
      p_phone,
      p_nickname,
      p_location,
      p_latitude,
      p_longitude,
      NOW(),
      NOW()
    );
  END IF;

  RETURN json_build_object('success', true, 'user_id', p_user_id);
EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Foreign key constraint violation - auth user may not exist',
      'user_id', p_user_id,
      'detail', SQLERRM
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', p_user_id
    );
END;
$$;

COMMENT ON FUNCTION public.create_user_on_signup IS
  'Creates or updates user record during signup. Uses SECURITY DEFINER to bypass RLS policies. Includes validation and error handling for foreign key constraints.';

-- Permissions remain the same
GRANT EXECUTE ON FUNCTION public.create_user_on_signup TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_on_signup TO anon;
