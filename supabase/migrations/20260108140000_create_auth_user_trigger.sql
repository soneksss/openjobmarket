-- Migration: Create Auth User Trigger for Automatic User Profile Creation
-- Date: 2026-01-08 14:00:00
-- Description: Database trigger that automatically creates user and profile records when auth user is created
-- This eliminates race conditions and foreign key violations during signup

-- ============================================================================
-- DROP OLD SIGNUP FUNCTIONS (No longer needed)
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_user_on_signup(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.create_professional_profile_on_signup(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.create_company_profile_on_signup(UUID, TEXT, TEXT, TEXT, TEXT[], TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.create_homeowner_profile_on_signup(UUID, TEXT, TEXT, TEXT);

-- ============================================================================
-- CREATE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_type TEXT;
  account_type TEXT;
  first_name TEXT;
  last_name TEXT;
  company_name TEXT;
  nickname TEXT;
  title TEXT;
  bio TEXT;
  experience_level TEXT;
  skills TEXT[];
  industry TEXT;
  company_bio TEXT;
  services TEXT[];
  is_jobseeker BOOLEAN;
  is_homeowner BOOLEAN;
  is_employer BOOLEAN;
  is_tradespeople BOOLEAN;
  phone TEXT;
  location TEXT;
  latitude DOUBLE PRECISION;
  longitude DOUBLE PRECISION;
BEGIN
  -- Extract metadata from auth user
  user_type := COALESCE((NEW.raw_user_meta_data->>'user_type')::TEXT, 'professional');
  account_type := COALESCE((NEW.raw_user_meta_data->>'account_type')::TEXT, 'individual');
  first_name := (NEW.raw_user_meta_data->>'first_name')::TEXT;
  last_name := (NEW.raw_user_meta_data->>'last_name')::TEXT;
  company_name := (NEW.raw_user_meta_data->>'company_name')::TEXT;
  nickname := (NEW.raw_user_meta_data->>'nickname')::TEXT;
  title := (NEW.raw_user_meta_data->>'title')::TEXT;
  bio := (NEW.raw_user_meta_data->>'bio')::TEXT;
  experience_level := COALESCE((NEW.raw_user_meta_data->>'experience_level')::TEXT, 'mid');
  industry := (NEW.raw_user_meta_data->>'industry')::TEXT;
  company_bio := (NEW.raw_user_meta_data->>'company_bio')::TEXT;
  is_jobseeker := COALESCE((NEW.raw_user_meta_data->>'is_jobseeker')::BOOLEAN, FALSE);
  is_homeowner := COALESCE((NEW.raw_user_meta_data->>'is_homeowner')::BOOLEAN, FALSE);
  is_employer := COALESCE((NEW.raw_user_meta_data->>'is_employer')::BOOLEAN, FALSE);
  is_tradespeople := COALESCE((NEW.raw_user_meta_data->>'is_tradespeople')::BOOLEAN, FALSE);
  phone := (NEW.raw_user_meta_data->>'phone')::TEXT;
  location := (NEW.raw_user_meta_data->>'location')::TEXT;
  latitude := (NEW.raw_user_meta_data->>'latitude')::DOUBLE PRECISION;
  longitude := (NEW.raw_user_meta_data->>'longitude')::DOUBLE PRECISION;

  -- Parse JSON arrays from metadata
  BEGIN
    IF NEW.raw_user_meta_data->>'skills' IS NOT NULL THEN
      skills := ARRAY(SELECT json_array_elements_text((NEW.raw_user_meta_data->>'skills')::JSON));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    skills := NULL;
  END;

  BEGIN
    IF NEW.raw_user_meta_data->>'services' IS NOT NULL THEN
      services := ARRAY(SELECT json_array_elements_text((NEW.raw_user_meta_data->>'services')::JSON));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    services := NULL;
  END;

  -- Create public.users record
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
    NEW.id,
    NEW.email,
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
    NOW(),
    NOW()
  );

  -- Create appropriate profile based on user_type
  IF user_type = 'professional' THEN
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
      NEW.id,
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
      NOW(),
      NOW()
    );
  ELSIF user_type = 'company' THEN
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
      NEW.id,
      company_name,
      industry,
      company_bio,
      services,
      location,
      latitude,
      longitude,
      NOW(),
      NOW()
    );
  ELSIF user_type = 'homeowner' THEN
    INSERT INTO public.homeowner_profiles (
      user_id,
      first_name,
      last_name,
      nickname,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      first_name,
      last_name,
      nickname,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
  'Trigger function that automatically creates user and profile records when a new auth user is created. Eliminates race conditions.';

-- ============================================================================
-- CREATE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
