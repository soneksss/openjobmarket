-- ============================================================================
-- Migration: Membership system (Phase B) — referral capture on signup
-- ============================================================================
-- Hooks referral capture into complete_user_profile_after_verification(),
-- which is the single point (see 20260201000002_fix_account_type_mapping.sql)
-- where a tradesperson's company_profiles row is created from their signup
-- metadata (name, services, location, etc. all arrive in one shot here).
-- That makes it both the "creates an account" and "completes profile" moment
-- the referral spec describes, so the pending referral is recorded AND
-- resolved (reward granted) in the same step, for company/tradesperson
-- accounts only. Everything else in this function is unchanged verbatim.
-- ============================================================================

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
BEGIN
  RAISE NOTICE 'Completing user profile after email verification for user: %', p_user_id;

  -- Get user data from users table
  SELECT user_type, account_type, email
  INTO v_user_type, v_account_type, v_user_email
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
  v_company_bio := (v_raw_meta_data->>'company_bio')::TEXT;
  v_phone := (v_raw_meta_data->>'phone')::TEXT;
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

  -- Check if profile already exists
  -- Business accounts with user_type 'company' get company_profiles
  IF v_account_type = 'business' AND v_user_type = 'company' THEN
    SELECT EXISTS(SELECT 1 FROM company_profiles WHERE user_id = p_user_id) INTO v_profile_exists;
  ELSIF v_user_type IN ('professional', 'jobseeker') THEN
    SELECT EXISTS(SELECT 1 FROM professional_profiles WHERE user_id = p_user_id) INTO v_profile_exists;
  ELSIF v_user_type = 'homeowner' THEN
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

  -- Create appropriate profile based on account_type and user_type
  -- Business accounts with user_type 'company' get company_profiles
  IF v_account_type = 'business' AND v_user_type = 'company' THEN
    INSERT INTO public.company_profiles (
      user_id,
      company_name,
      industry,
      description,
      services,
      location,
      latitude,
      longitude,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      v_company_name,
      v_industry,
      v_company_bio,
      v_services,
      v_location,
      v_latitude,
      v_longitude,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Created company profile for user %', p_user_id;

    -- Referral capture: this signup call already carries the full profile
    -- (name/services/location), so account-creation and profile-completion
    -- are the same moment here — record the referral and resolve its reward
    -- in one step. Never fails the signup: any error is swallowed + logged.
    DECLARE
      v_referral_code TEXT;
      v_apply_result  JSON;
    BEGIN
      v_referral_code := NULLIF(trim(both from (v_raw_meta_data->>'referral_code')::TEXT), '');
      IF v_referral_code IS NOT NULL THEN
        v_apply_result := public.apply_referral(p_user_id, v_referral_code);
        IF COALESCE((v_apply_result->>'success')::boolean, false) THEN
          PERFORM public.complete_referral_reward(p_user_id);
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Referral capture failed for user % (SQLSTATE: %): %', p_user_id, SQLSTATE, SQLERRM;
    END;

  ELSE
    -- Individual accounts OR business accounts that aren't companies (e.g., tradespeople)
    IF v_user_type IN ('professional', 'jobseeker') OR
       (SELECT is_jobseeker FROM public.users WHERE id = p_user_id) OR
       (SELECT is_tradespeople FROM public.users WHERE id = p_user_id) THEN
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
        is_self_employed,
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
        -- Business accounts with professional profiles are self-employed
        v_account_type = 'business',
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;

      RAISE NOTICE 'Created professional profile for user % (is_self_employed: %)', p_user_id, v_account_type = 'business';

    ELSIF v_user_type = 'homeowner' OR
          (SELECT is_homeowner FROM public.users WHERE id = p_user_id) THEN
      INSERT INTO public.homeowner_profiles (
        user_id,
        first_name,
        last_name,
        nickname,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        v_first_name,
        v_last_name,
        v_nickname,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;

      RAISE NOTICE 'Created homeowner profile for user %', p_user_id;
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

GRANT EXECUTE ON FUNCTION complete_user_profile_after_verification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_profile_after_verification(UUID) TO service_role;

COMMENT ON FUNCTION complete_user_profile_after_verification(UUID) IS
'Called AFTER email verification to create user profile. Uses account_type (individual/business) instead of company. Also captures + resolves referral rewards for company/tradesperson signups (referral_code in raw_user_meta_data).';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20260715000003 (referral capture on signup) complete';
END;
$$;
