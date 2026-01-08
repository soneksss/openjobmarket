-- Migration: Create Profile Creation Functions for Signup (v2 - Idempotent)
-- Date: 2026-01-08 12:00:00
-- Description: SECURITY DEFINER functions to bypass RLS during profile creation at signup
-- This version uses CREATE OR REPLACE for idempotency

-- ============================================================================
-- PROFESSIONAL PROFILE CREATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_professional_profile_on_signup(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_nickname TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_experience_level TEXT DEFAULT 'mid',
  p_skills TEXT[] DEFAULT NULL,
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
  INSERT INTO public.professional_profiles (
    user_id,
    first_name,
    last_name,
    nickname,
    title,
    bio,
    experience_level,
    skills,
    location,
    latitude,
    longitude,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_first_name,
    p_last_name,
    p_nickname,
    p_title,
    p_bio,
    p_experience_level,
    p_skills,
    p_location,
    p_latitude,
    p_longitude,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    nickname = EXCLUDED.nickname,
    title = EXCLUDED.title,
    bio = EXCLUDED.bio,
    experience_level = EXCLUDED.experience_level,
    skills = EXCLUDED.skills,
    location = EXCLUDED.location,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = NOW();

  RETURN json_build_object('success', true, 'user_id', p_user_id);
END;
$$;

COMMENT ON FUNCTION public.create_professional_profile_on_signup IS
  'Creates professional profile during signup. Uses SECURITY DEFINER to bypass RLS policies.';

GRANT EXECUTE ON FUNCTION public.create_professional_profile_on_signup TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_professional_profile_on_signup TO anon;

-- ============================================================================
-- COMPANY PROFILE CREATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_company_profile_on_signup(
  p_user_id UUID,
  p_company_name TEXT,
  p_industry TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_services TEXT[] DEFAULT NULL,
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
  INSERT INTO public.company_profiles (
    user_id,
    company_name,
    industry,
    bio,
    services,
    location,
    latitude,
    longitude,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_company_name,
    p_industry,
    p_bio,
    p_services,
    p_location,
    p_latitude,
    p_longitude,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    industry = EXCLUDED.industry,
    bio = EXCLUDED.bio,
    services = EXCLUDED.services,
    location = EXCLUDED.location,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = NOW();

  RETURN json_build_object('success', true, 'user_id', p_user_id);
END;
$$;

COMMENT ON FUNCTION public.create_company_profile_on_signup IS
  'Creates company profile during signup. Uses SECURITY DEFINER to bypass RLS policies.';

GRANT EXECUTE ON FUNCTION public.create_company_profile_on_signup TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_profile_on_signup TO anon;

-- ============================================================================
-- HOMEOWNER PROFILE CREATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_homeowner_profile_on_signup(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_nickname TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.homeowner_profiles (
    user_id,
    first_name,
    last_name,
    nickname,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_first_name,
    p_last_name,
    p_nickname,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    nickname = EXCLUDED.nickname,
    updated_at = NOW();

  RETURN json_build_object('success', true, 'user_id', p_user_id);
END;
$$;

COMMENT ON FUNCTION public.create_homeowner_profile_on_signup IS
  'Creates homeowner profile during signup. Uses SECURITY DEFINER to bypass RLS policies.';

GRANT EXECUTE ON FUNCTION public.create_homeowner_profile_on_signup TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_homeowner_profile_on_signup TO anon;
