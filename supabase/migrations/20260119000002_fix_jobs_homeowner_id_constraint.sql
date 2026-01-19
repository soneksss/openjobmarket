-- Migration: Fix jobs.homeowner_id Foreign Key Constraint
-- Date: 2026-01-19
-- Purpose: Allow professionals with is_homeowner=true to post trade jobs
--          The issue: jobs.homeowner_id FK points to homeowner_profiles, but professionals use professional_profiles
--          Solution: Create homeowner_profiles for all users with is_homeowner=true who only have professional_profiles

-- =========================================
-- 1. CREATE MISSING HOMEOWNER PROFILES
-- =========================================
-- For users with is_homeowner=true who only have professional_profiles (not homeowner_profiles)
-- This ensures they can post trade jobs via the jobs.homeowner_id foreign key

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
WHERE u.is_homeowner = true
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
  WHERE u.is_homeowner = true
    AND EXISTS (SELECT 1 FROM professional_profiles pp WHERE pp.user_id = hp.user_id);

  RAISE NOTICE 'Created homeowner profiles for professionals with is_homeowner=true';
  RAISE NOTICE 'Total users with both professional and homeowner profiles: %', v_count;
END $$;

-- =========================================
-- 2. CREATE TRIGGER TO AUTO-CREATE HOMEOWNER PROFILES
-- =========================================
-- When a user's is_homeowner flag is set to true, automatically create homeowner_profile if missing

CREATE OR REPLACE FUNCTION auto_create_homeowner_profile_for_professionals()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_homeowner is being set to true
  IF NEW.is_homeowner = true AND (OLD.is_homeowner = false OR OLD.is_homeowner IS NULL) THEN
    -- Check if user has professional_profile but no homeowner_profile
    IF EXISTS (SELECT 1 FROM professional_profiles WHERE user_id = NEW.id)
       AND NOT EXISTS (SELECT 1 FROM homeowner_profiles WHERE user_id = NEW.id) THEN

      -- Create homeowner_profile from professional_profile
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
        NOW()
      FROM professional_profiles pp
      WHERE pp.user_id = NEW.id
      ON CONFLICT (user_id) DO NOTHING;

      RAISE NOTICE 'Auto-created homeowner_profile for professional user %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table
DROP TRIGGER IF EXISTS trigger_auto_create_homeowner_profile ON users;
CREATE TRIGGER trigger_auto_create_homeowner_profile
  AFTER UPDATE OF is_homeowner ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_homeowner_profile_for_professionals();

-- =========================================
-- 3. VERIFY FOREIGN KEY CONSTRAINT
-- =========================================
-- The FK constraint should remain as-is since we now create homeowner_profiles for all users with is_homeowner=true

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'jobs'
      AND constraint_name = 'jobs_homeowner_id_fkey'
  ) THEN
    RAISE NOTICE 'Foreign key constraint jobs_homeowner_id_fkey exists (this is correct)';
  ELSE
    RAISE WARNING 'Foreign key constraint jobs_homeowner_id_fkey does not exist';
  END IF;
END $$;

-- =========================================
-- COMMENTS
-- =========================================

COMMENT ON FUNCTION auto_create_homeowner_profile_for_professionals() IS
'Automatically creates a homeowner_profile when a professional user is granted is_homeowner=true permission. This allows them to post trade jobs via the jobs.homeowner_id foreign key.';

COMMENT ON TRIGGER trigger_auto_create_homeowner_profile ON users IS
'Triggers auto-creation of homeowner_profile for professionals when is_homeowner is set to true';
