-- Migration: Create function to handle user creation during signup
-- Date: 2026-01-07
-- Description: Database function with SECURITY DEFINER to bypass RLS for user creation

-- Create function to create user record during signup
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
BEGIN
  -- Insert or update user record
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    account_type = EXCLUDED.account_type,
    is_jobseeker = EXCLUDED.is_jobseeker,
    is_homeowner = EXCLUDED.is_homeowner,
    is_employer = EXCLUDED.is_employer,
    is_tradespeople = EXCLUDED.is_tradespeople,
    phone = EXCLUDED.phone,
    nickname = EXCLUDED.nickname,
    location = EXCLUDED.location,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = NOW();

  RETURN json_build_object('success', true, 'user_id', p_user_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_on_signup TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_on_signup TO anon;

-- Add comment
COMMENT ON FUNCTION public.create_user_on_signup IS
  'Creates or updates user record during signup. Uses SECURITY DEFINER to bypass RLS policies.';
