-- Migration: Ensure All Jobseekers Are Also Homeowners
-- Date: 2026-01-19
-- Purpose: Make sure that ALL jobseekers have is_homeowner=true and homeowner_profiles
--          This allows all jobseekers to post trade jobs (same capability as homeowners)

-- =========================================
-- 1. UPDATE ALL JOBSEEKERS TO HAVE HOMEOWNER FLAG
-- =========================================
-- Set is_homeowner=true for all users with is_jobseeker=true

UPDATE users
SET is_homeowner = true
WHERE is_jobseeker = true
  AND is_homeowner = false;

-- Log how many users were updated
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM users
  WHERE is_jobseeker = true AND is_homeowner = true;

  RAISE NOTICE 'Updated jobseekers to have homeowner permission';
  RAISE NOTICE 'Total jobseekers with homeowner permission: %', v_count;
END $$;

-- =========================================
-- 2. CREATE HOMEOWNER PROFILES FOR ALL JOBSEEKERS
-- =========================================
-- Create homeowner_profiles for all users with professional_profiles who don't have homeowner_profiles

INSERT INTO homeowner_profiles (
  user_id,
  first_name,
  last_name,
  profile_photo_url,
  location,
  created_at,
  updated_at
)
SELECT
  pp.user_id,
  pp.first_name,
  pp.last_name,
  pp.profile_photo_url,
  COALESCE(pp.location, '') as location,
  pp.created_at,
  NOW() as updated_at
FROM professional_profiles pp
INNER JOIN users u ON pp.user_id = u.id
WHERE u.is_jobseeker = true
  AND NOT EXISTS (
    SELECT 1 FROM homeowner_profiles hp WHERE hp.user_id = pp.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Log how many profiles were created
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM homeowner_profiles hp
  INNER JOIN users u ON hp.user_id = u.id
  WHERE u.is_jobseeker = true;

  RAISE NOTICE 'Created homeowner profiles for jobseekers';
  RAISE NOTICE 'Total jobseekers with homeowner profiles: %', v_count;
END $$;

-- =========================================
-- 3. UPDATE SIGNUP TRIGGER TO AUTO-SET BOTH FLAGS
-- =========================================
-- When a user becomes a jobseeker, automatically set is_homeowner=true

CREATE OR REPLACE FUNCTION auto_set_homeowner_for_jobseekers()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_jobseeker is being set to true, also set is_homeowner to true
  IF NEW.is_jobseeker = true THEN
    NEW.is_homeowner = true;
    RAISE NOTICE 'Auto-set is_homeowner=true for jobseeker user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table for INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_auto_set_homeowner_for_jobseekers_insert ON users;
CREATE TRIGGER trigger_auto_set_homeowner_for_jobseekers_insert
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_homeowner_for_jobseekers();

DROP TRIGGER IF EXISTS trigger_auto_set_homeowner_for_jobseekers_update ON users;
CREATE TRIGGER trigger_auto_set_homeowner_for_jobseekers_update
  BEFORE UPDATE OF is_jobseeker ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_homeowner_for_jobseekers();

-- =========================================
-- 4. UPDATE PROFILE CREATION TO AUTO-CREATE HOMEOWNER PROFILE
-- =========================================
-- When professional_profile is created for a jobseeker, auto-create homeowner_profile

CREATE OR REPLACE FUNCTION auto_create_homeowner_profile_for_jobseeker()
RETURNS TRIGGER AS $$
DECLARE
  v_is_jobseeker BOOLEAN;
BEGIN
  -- Check if user is a jobseeker
  SELECT is_jobseeker INTO v_is_jobseeker
  FROM users
  WHERE id = NEW.user_id;

  -- If user is a jobseeker, create homeowner_profile if it doesn't exist
  IF v_is_jobseeker = true THEN
    INSERT INTO homeowner_profiles (
      user_id,
      first_name,
      last_name,
      profile_photo_url,
      location,
      created_at,
      updated_at
    )
    VALUES (
      NEW.user_id,
      NEW.first_name,
      NEW.last_name,
      NEW.profile_photo_url,
      COALESCE(NEW.location, ''),
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Auto-created homeowner_profile for jobseeker user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on professional_profiles table
DROP TRIGGER IF EXISTS trigger_auto_create_homeowner_profile_for_jobseeker ON professional_profiles;
CREATE TRIGGER trigger_auto_create_homeowner_profile_for_jobseeker
  AFTER INSERT ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_homeowner_profile_for_jobseeker();

-- =========================================
-- 5. VERIFY DATA CONSISTENCY
-- =========================================

-- Check for any jobseekers without homeowner flag (should be 0)
DO $$
DECLARE
  v_missing_flag INTEGER;
  v_missing_profile INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_missing_flag
  FROM users
  WHERE is_jobseeker = true AND is_homeowner = false;

  SELECT COUNT(*) INTO v_missing_profile
  FROM users u
  WHERE u.is_jobseeker = true
    AND EXISTS (SELECT 1 FROM professional_profiles pp WHERE pp.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM homeowner_profiles hp WHERE hp.user_id = u.id);

  IF v_missing_flag > 0 THEN
    RAISE WARNING 'Found % jobseekers without is_homeowner=true flag', v_missing_flag;
  ELSE
    RAISE NOTICE 'All jobseekers have is_homeowner=true ✓';
  END IF;

  IF v_missing_profile > 0 THEN
    RAISE WARNING 'Found % jobseekers without homeowner_profile', v_missing_profile;
  ELSE
    RAISE NOTICE 'All jobseekers have homeowner_profile ✓';
  END IF;
END $$;

-- =========================================
-- COMMENTS
-- =========================================

COMMENT ON FUNCTION auto_set_homeowner_for_jobseekers() IS
'Automatically sets is_homeowner=true when is_jobseeker is set to true. This ensures all jobseekers can post trade jobs.';

COMMENT ON FUNCTION auto_create_homeowner_profile_for_jobseeker() IS
'Automatically creates homeowner_profile when professional_profile is created for a jobseeker. This allows them to post trade jobs via the jobs.homeowner_id foreign key.';

COMMENT ON TRIGGER trigger_auto_set_homeowner_for_jobseekers_insert ON users IS
'Ensures new jobseekers automatically get is_homeowner=true on user creation';

COMMENT ON TRIGGER trigger_auto_set_homeowner_for_jobseekers_update ON users IS
'Ensures existing users automatically get is_homeowner=true when is_jobseeker is set to true';

COMMENT ON TRIGGER trigger_auto_create_homeowner_profile_for_jobseeker ON professional_profiles IS
'Auto-creates homeowner_profile when professional_profile is created for a jobseeker';

-- =========================================
-- FINAL SUMMARY
-- =========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Jobseeker = Homeowner Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All jobseekers now have:';
  RAISE NOTICE '  ✓ is_jobseeker = true';
  RAISE NOTICE '  ✓ is_homeowner = true';
  RAISE NOTICE '  ✓ professional_profiles entry';
  RAISE NOTICE '  ✓ homeowner_profiles entry';
  RAISE NOTICE '';
  RAISE NOTICE 'Jobseekers can now:';
  RAISE NOTICE '  ✓ Apply to jobs (as jobseekers)';
  RAISE NOTICE '  ✓ Post trade jobs (as homeowners)';
  RAISE NOTICE '========================================';
END $$;
