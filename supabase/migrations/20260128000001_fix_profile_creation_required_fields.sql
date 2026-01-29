-- Fix Profile Creation to Include All Required Fields
-- Date: 2026-01-28
-- Description: Update complete_user_profile_after_verification to include
--              location for homeowners and trade for contractors

CREATE OR REPLACE FUNCTION public.complete_user_profile_after_verification(
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
  v_account_type TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_company_name TEXT;
  v_nickname TEXT;
  v_title TEXT;
  v_bio TEXT;
  v_experience_level TEXT;
  v_skills TEXT[];
  v_industry TEXT;
  v_trade TEXT;
  v_company_bio TEXT;
  v_services TEXT[];
  v_phone TEXT;
  v_location TEXT;
  v_latitude DOUBLE PRECISION;
  v_longitude DOUBLE PRECISION;
  v_country TEXT;
  v_user_email TEXT;
  v_raw_meta_data JSONB;
  v_profile_exists BOOLEAN := FALSE;
  v_is_jobseeker BOOLEAN;
  v_is_homeowner BOOLEAN;
  v_is_employer BOOLEAN;
  v_is_tradespeople BOOLEAN;
BEGIN
  RAISE NOTICE 'Completing user profile after email verification for user: %', p_user_id;

  -- Get user data from users table
  SELECT user_type, account_type, email, is_jobseeker, is_homeowner, is_employer, is_tradespeople
  INTO v_user_type, v_account_type, v_user_email, v_is_jobseeker, v_is_homeowner, v_is_employer, v_is_tradespeople
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in public.users table'
    );
  END IF;

  -- Get auth user metadata
  SELECT raw_user_meta_data
  INTO v_raw_meta_data
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users table'
    );
  END IF;

  -- Extract metadata
  v_first_name := COALESCE((v_raw_meta_data->>'first_name')::TEXT, '');
  v_last_name := COALESCE((v_raw_meta_data->>'last_name')::TEXT, '');
  v_company_name := COALESCE((v_raw_meta_data->>'company_name')::TEXT, '');
  v_nickname := (v_raw_meta_data->>'nickname')::TEXT;
  v_title := (v_raw_meta_data->>'title')::TEXT;
  v_bio := (v_raw_meta_data->>'bio')::TEXT;
  v_experience_level := COALESCE((v_raw_meta_data->>'experience_level')::TEXT, 'mid');
  v_industry := (v_raw_meta_data->>'industry')::TEXT;
  v_trade := (v_raw_meta_data->>'trade')::TEXT;
  v_company_bio := (v_raw_meta_data->>'company_bio')::TEXT;
  v_phone := COALESCE((v_raw_meta_data->>'phone')::TEXT, (v_raw_meta_data->>'phone_number')::TEXT);
  v_location := (v_raw_meta_data->>'location')::TEXT;
  v_latitude := (v_raw_meta_data->>'latitude')::DOUBLE PRECISION;
  v_longitude := (v_raw_meta_data->>'longitude')::DOUBLE PRECISION;
  v_country := (v_raw_meta_data->>'country')::TEXT;

  -- Provide defaults for NOT NULL fields
  IF v_first_name = '' THEN
    v_first_name := 'User';
  END IF;

  IF v_last_name = '' THEN
    v_last_name := SPLIT_PART(v_user_email, '@', 1);
  END IF;

  IF v_company_name = '' THEN
    v_company_name := 'Company';
  END IF;

  -- If trade is not set but industry is, use industry as trade for contractors
  IF v_trade IS NULL AND v_industry IS NOT NULL AND v_is_tradespeople THEN
    v_trade := v_industry;
  END IF;

  -- If industry is not set but trade is, use trade as industry
  IF v_industry IS NULL AND v_trade IS NOT NULL THEN
    v_industry := v_trade;
  END IF;

  -- Parse JSON arrays
  BEGIN
    IF v_raw_meta_data->>'skills' IS NOT NULL THEN
      v_skills := ARRAY(SELECT json_array_elements_text((v_raw_meta_data->>'skills')::JSON));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_skills := NULL;
  END;

  BEGIN
    IF v_raw_meta_data->>'services' IS NOT NULL THEN
      v_services := ARRAY(SELECT json_array_elements_text((v_raw_meta_data->>'services')::JSON));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_services := NULL;
  END;

  -- If trade was stored in services array, extract it
  IF v_trade IS NULL AND v_services IS NOT NULL AND array_length(v_services, 1) > 0 THEN
    v_trade := v_services[1];
  END IF;

  -- Check if profile already exists
  IF v_account_type = 'company' THEN
    SELECT EXISTS(SELECT 1 FROM company_profiles WHERE user_id = p_user_id) INTO v_profile_exists;
  ELSIF v_user_type IN ('professional', 'jobseeker') OR v_is_jobseeker THEN
    SELECT EXISTS(SELECT 1 FROM professional_profiles WHERE user_id = p_user_id) INTO v_profile_exists;
  ELSIF v_user_type = 'homeowner' OR v_is_homeowner THEN
    SELECT EXISTS(SELECT 1 FROM homeowner_profiles WHERE user_id = p_user_id) INTO v_profile_exists;
  END IF;

  IF v_profile_exists THEN
    RAISE NOTICE 'Profile already exists for user %, skipping creation', p_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Profile already exists',
      'user_id', p_user_id
    );
  END IF;

  -- Create appropriate profile based on account_type and roles
  IF v_account_type = 'company' THEN
    -- For contractors (tradespeople companies), use trade field
    INSERT INTO public.company_profiles (
      user_id,
      company_name,
      industry,
      description,
      services,
      phone_number,
      location,
      latitude,
      longitude,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      v_company_name,
      COALESCE(v_industry, v_trade, 'General'),
      v_company_bio,
      v_services,
      v_phone,
      v_location,
      v_latitude,
      v_longitude,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Created company profile for user % with industry: %', p_user_id, COALESCE(v_industry, v_trade);

  ELSE
    -- Individual accounts - create profiles based on roles

    -- Create professional profile if jobseeker
    IF v_user_type IN ('professional', 'jobseeker') OR v_is_jobseeker THEN
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
        v_first_name,
        v_last_name,
        v_nickname,
        v_title,
        v_bio,
        v_experience_level::experience_level,
        v_skills,
        v_location,
        v_latitude,
        v_longitude,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;

      RAISE NOTICE 'Created professional profile for user % with title: %', p_user_id, v_title;
    END IF;

    -- Create homeowner profile if homeowner (including jobseekers who are also homeowners)
    IF v_user_type = 'homeowner' OR v_is_homeowner THEN
      INSERT INTO public.homeowner_profiles (
        user_id,
        first_name,
        last_name,
        nickname,
        location,
        latitude,
        longitude,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        v_first_name,
        v_last_name,
        v_nickname,
        v_location,
        v_latitude,
        v_longitude,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;

      RAISE NOTICE 'Created homeowner profile for user % with location: %', p_user_id, v_location;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User profile completed successfully',
    'user_id', p_user_id,
    'user_type', v_user_type,
    'account_type', v_account_type
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION complete_user_profile_after_verification(UUID) IS
'Called AFTER email verification to create user profile with all required fields including location, title, and industry/trade.';
