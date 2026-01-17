-- Fix Signup Trigger - Handle NULL values for NOT NULL fields
-- Date: 2026-01-17
-- Description: Fix 500 error during signup by providing defaults for NOT NULL fields

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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
  country TEXT;
  existing_user_id UUID;
  v_professional_id UUID;
  v_company_id UUID;
  v_homeowner_id UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Creating user and profile for: %', NEW.email;
  RAISE NOTICE '========================================';

  -- Extract metadata from auth user
  user_type := COALESCE((NEW.raw_user_meta_data->>'user_type')::TEXT, 'professional');
  account_type := COALESCE((NEW.raw_user_meta_data->>'account_type')::TEXT, 'individual');
  first_name := COALESCE((NEW.raw_user_meta_data->>'first_name')::TEXT, '');
  last_name := COALESCE((NEW.raw_user_meta_data->>'last_name')::TEXT, '');
  company_name := COALESCE((NEW.raw_user_meta_data->>'company_name')::TEXT, '');
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
  country := (NEW.raw_user_meta_data->>'country')::TEXT;

  -- Provide defaults for empty strings on NOT NULL fields
  IF first_name = '' THEN
    first_name := 'User';
  END IF;

  IF last_name = '' THEN
    last_name := SPLIT_PART(NEW.email, '@', 1); -- Use email username as fallback
  END IF;

  IF company_name = '' THEN
    company_name := 'Company'; -- Default company name
  END IF;

  -- Parse JSON arrays from metadata with specific error handling
  BEGIN
    IF NEW.raw_user_meta_data->>'skills' IS NOT NULL THEN
      skills := ARRAY(SELECT json_array_elements_text((NEW.raw_user_meta_data->>'skills')::JSON));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    skills := NULL;
    RAISE WARNING 'Failed to parse skills array: %', SQLERRM;
  END;

  BEGIN
    IF NEW.raw_user_meta_data->>'services' IS NOT NULL THEN
      services := ARRAY(SELECT json_array_elements_text((NEW.raw_user_meta_data->>'services')::JSON));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    services := NULL;
    RAISE WARNING 'Failed to parse services array: %', SQLERRM;
  END;

  -- =====================================================================
  -- COMPREHENSIVE ORPHANED RECORD CLEANUP (Re-signup scenario)
  -- =====================================================================
  BEGIN
    -- Check if orphaned user record exists with this email (from previous deleted account)
    SELECT id INTO existing_user_id
    FROM public.users
    WHERE LOWER(email) = LOWER(NEW.email) AND id != NEW.id
    LIMIT 1;

    IF existing_user_id IS NOT NULL THEN
      RAISE NOTICE 'Found orphaned user record with email %, starting comprehensive cleanup', NEW.email;

      -- Get profile IDs for cleanup
      SELECT id INTO v_professional_id FROM professional_profiles WHERE user_id = existing_user_id;
      SELECT id INTO v_company_id FROM company_profiles WHERE user_id = existing_user_id;
      SELECT id INTO v_homeowner_id FROM homeowner_profiles WHERE user_id = existing_user_id;

      -- Delete in dependency order (children before parents)

      -- 1. Professional-related records
      IF v_professional_id IS NOT NULL THEN
        DELETE FROM portfolios WHERE professional_id = v_professional_id;
        DELETE FROM certifications WHERE professional_id = v_professional_id;
        DELETE FROM experiences WHERE professional_id = v_professional_id;
        DELETE FROM professional_cvs WHERE professional_id = v_professional_id;
        DELETE FROM saved_traders WHERE professional_id = v_professional_id;
        RAISE NOTICE 'Cleaned up professional-related records';
      END IF;

      -- 2. Homeowner-related records
      IF v_homeowner_id IS NOT NULL THEN
        DELETE FROM saved_traders WHERE homeowner_id = v_homeowner_id;
        RAISE NOTICE 'Cleaned up homeowner-related records';
      END IF;

      -- 3. Jobs posted by user
      IF v_company_id IS NOT NULL THEN
        DELETE FROM jobs WHERE company_id = v_company_id;
        RAISE NOTICE 'Cleaned up company jobs';
      END IF;

      IF v_homeowner_id IS NOT NULL THEN
        DELETE FROM jobs WHERE homeowner_id = v_homeowner_id;
        RAISE NOTICE 'Cleaned up homeowner jobs';
      END IF;

      -- 4. User activity records
      DELETE FROM job_applications WHERE user_id = existing_user_id;
      DELETE FROM saved_jobs WHERE user_id = existing_user_id;
      DELETE FROM messages WHERE sender_id = existing_user_id OR receiver_id = existing_user_id;
      DELETE FROM notifications WHERE user_id = existing_user_id;
      DELETE FROM subscriptions WHERE user_id = existing_user_id;
      DELETE FROM user_skills WHERE user_id = existing_user_id;
      DELETE FROM reviews WHERE reviewer_id = existing_user_id OR reviewed_id = existing_user_id;
      DELETE FROM email_preferences WHERE user_id = existing_user_id;
      DELETE FROM notification_preferences WHERE user_id = existing_user_id;
      RAISE NOTICE 'Cleaned up user activity records';

      -- 5. Profile records
      DELETE FROM professional_profiles WHERE user_id = existing_user_id;
      DELETE FROM company_profiles WHERE user_id = existing_user_id;
      DELETE FROM homeowner_profiles WHERE user_id = existing_user_id;
      RAISE NOTICE 'Cleaned up profile records';

      -- 6. Finally delete the orphaned user record
      DELETE FROM public.users WHERE id = existing_user_id;
      RAISE NOTICE 'Cleanup complete for orphaned user % (email: %)', existing_user_id, NEW.email;
    ELSE
      RAISE NOTICE 'No orphaned records found for email %', NEW.email;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log warning but continue - shouldn't block new user creation
    RAISE WARNING 'Error during orphaned record cleanup: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    -- Continue anyway
  END;

  -- =====================================================================
  -- CREATE NEW USER RECORD
  -- =====================================================================
  BEGIN
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
      country,
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
      country,
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
      country = EXCLUDED.country,
      updated_at = NOW();

    RAISE NOTICE 'Created/updated public.users record for %', NEW.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create public.users record: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  -- =====================================================================
  -- CREATE APPROPRIATE PROFILE (Based on primary user_type)
  -- For multi-role users, create the primary profile based on user_type
  -- =====================================================================
  BEGIN
    -- Professional profile (for professional, jobseeker, tradespeople)
    IF user_type IN ('professional', 'jobseeker') OR (is_jobseeker AND NOT is_employer) OR (is_tradespeople AND NOT is_employer) THEN
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

      RAISE NOTICE 'Created professional profile for %', NEW.email;

    -- Company profile (for company, employer, self-employed tradespeople)
    ELSIF user_type = 'company' OR is_employer OR (is_tradespeople AND account_type = 'company') THEN
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

      RAISE NOTICE 'Created company profile for %', NEW.email;

    -- Homeowner profile (for homeowner type)
    ELSIF user_type = 'homeowner' OR is_homeowner THEN
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
      )
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        nickname = EXCLUDED.nickname,
        updated_at = NOW();

      RAISE NOTICE 'Created homeowner profile for %', NEW.email;

    -- Fallback: Create professional profile if no type matches
    ELSE
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

      RAISE NOTICE 'Created default professional profile for %', NEW.email;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  RAISE NOTICE 'Successfully created all records for %', NEW.email;
  RAISE NOTICE '========================================';

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS
  'FIXED: Signup trigger that handles NULL values for NOT NULL fields. Provides defaults for first_name, last_name, and company_name. Creates single primary profile based on user_type/role flags. Comprehensively handles re-registration by cleaning up ALL orphaned records from previous deleted accounts.';
