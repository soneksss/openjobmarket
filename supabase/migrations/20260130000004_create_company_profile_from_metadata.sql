-- ============================================
-- Auto-create company profiles from signup metadata
-- ============================================

-- Function to create company profile from user metadata
CREATE OR REPLACE FUNCTION public.create_company_profile_from_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_metadata JSONB;
  v_company_name TEXT;
  v_industry TEXT;
  v_location TEXT;
  v_latitude DOUBLE PRECISION;
  v_longitude DOUBLE PRECISION;
  v_phone TEXT;
BEGIN
  -- Only proceed if this is a company user
  SELECT raw_user_meta_data INTO v_metadata
  FROM auth.users
  WHERE id = NEW.id;

  -- Check if user_type is company
  IF (v_metadata->>'user_type') = 'company' THEN
    RAISE NOTICE 'Creating company profile for user: %', NEW.id;

    -- Extract metadata with defaults
    v_company_name := COALESCE(v_metadata->>'company_name', 'Company');
    v_industry := COALESCE(v_metadata->>'industry', 'General');
    v_location := v_metadata->>'location';
    v_latitude := (v_metadata->>'latitude')::DOUBLE PRECISION;
    v_longitude := (v_metadata->>'longitude')::DOUBLE PRECISION;
    v_phone := v_metadata->>'phone';

    -- Check if company profile already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.company_profiles WHERE user_id = NEW.id
    ) THEN
      -- Create company profile with metadata
      INSERT INTO public.company_profiles (
        user_id,
        company_name,
        industry,
        location,
        latitude,
        longitude,
        phone_number,
        onboarding_completed,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        v_company_name,
        v_industry,
        v_location,
        v_latitude,
        v_longitude,
        v_phone,
        FALSE, -- User should complete onboarding to fill remaining fields
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Company profile created successfully for user: %', NEW.id;
    ELSE
      RAISE NOTICE 'Company profile already exists for user: %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating company profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW; -- Don't block user creation on profile error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on public.users INSERT
DROP TRIGGER IF EXISTS create_company_profile_trigger ON public.users;
CREATE TRIGGER create_company_profile_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_company_profile_from_metadata();

-- Backfill existing users without company profiles
DO $$
DECLARE
  v_user RECORD;
  v_metadata JSONB;
  v_company_name TEXT;
  v_industry TEXT;
  v_location TEXT;
  v_latitude DOUBLE PRECISION;
  v_longitude DOUBLE PRECISION;
  v_phone TEXT;
BEGIN
  RAISE NOTICE 'Backfilling company profiles from metadata...';

  FOR v_user IN
    SELECT u.id, au.raw_user_meta_data
    FROM public.users u
    JOIN auth.users au ON au.id = u.id
    WHERE u.user_type = 'company'
      AND NOT EXISTS (SELECT 1 FROM public.company_profiles WHERE user_id = u.id)
  LOOP
    v_metadata := v_user.raw_user_meta_data;

    -- Extract metadata
    v_company_name := COALESCE(v_metadata->>'company_name', 'Company');
    v_industry := COALESCE(v_metadata->>'industry', 'General');
    v_location := v_metadata->>'location';
    v_latitude := (v_metadata->>'latitude')::DOUBLE PRECISION;
    v_longitude := (v_metadata->>'longitude')::DOUBLE PRECISION;
    v_phone := v_metadata->>'phone';

    -- Create company profile
    INSERT INTO public.company_profiles (
      user_id,
      company_name,
      industry,
      location,
      latitude,
      longitude,
      phone_number,
      onboarding_completed,
      created_at,
      updated_at
    ) VALUES (
      v_user.id,
      v_company_name,
      v_industry,
      v_location,
      v_latitude,
      v_longitude,
      v_phone,
      FALSE,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Backfilled company profile for user: %', v_user.id;
  END LOOP;

  RAISE NOTICE 'Backfill complete!';
END $$;

COMMENT ON FUNCTION public.create_company_profile_from_metadata() IS
'Automatically creates company profile from signup metadata when user record is created';
