-- Migration: Add visibility and availability columns to profile tables
-- Date: 2026-01-20
-- Purpose: Fix map display issue - profiles need visibility flags to appear on map

-- Add columns to professional_profiles
ALTER TABLE professional_profiles
ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS available_for_work BOOLEAN DEFAULT true NOT NULL;

COMMENT ON COLUMN professional_profiles.profile_visible IS 'Controls whether the professional profile is visible to other users on maps and searches';
COMMENT ON COLUMN professional_profiles.available_for_work IS 'Indicates if the professional is available for work opportunities';

-- Add columns to company_profiles
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS open_for_business BOOLEAN DEFAULT true NOT NULL;

COMMENT ON COLUMN company_profiles.open_for_business IS 'Indicates if the company is open for business and should appear on maps/searches';

-- Update existing records to be visible by default
UPDATE professional_profiles
SET profile_visible = true, available_for_work = true
WHERE profile_visible IS NULL OR available_for_work IS NULL;

UPDATE company_profiles
SET open_for_business = true
WHERE open_for_business IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_professional_profiles_visibility
ON professional_profiles(profile_visible, available_for_work)
WHERE profile_visible = true AND available_for_work = true;

CREATE INDEX IF NOT EXISTS idx_company_profiles_business_status
ON company_profiles(open_for_business)
WHERE open_for_business = true;

-- Verify
DO $$
DECLARE
  v_prof_visible_count INTEGER;
  v_prof_available_count INTEGER;
  v_company_open_count INTEGER;
  v_prof_with_coords INTEGER;
  v_company_with_coords INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_prof_visible_count FROM professional_profiles WHERE profile_visible = true;
  SELECT COUNT(*) INTO v_prof_available_count FROM professional_profiles WHERE available_for_work = true;
  SELECT COUNT(*) INTO v_company_open_count FROM company_profiles WHERE open_for_business = true;

  SELECT COUNT(*) INTO v_prof_with_coords
  FROM professional_profiles
  WHERE profile_visible = true AND available_for_work = true
    AND latitude IS NOT NULL AND longitude IS NOT NULL;

  SELECT COUNT(*) INTO v_company_with_coords
  FROM company_profiles
  WHERE open_for_business = true
    AND latitude IS NOT NULL AND longitude IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profile Visibility Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Professionals visible: %', v_prof_visible_count;
  RAISE NOTICE 'Professionals available for work: %', v_prof_available_count;
  RAISE NOTICE 'Professionals with coordinates: %', v_prof_with_coords;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Companies open for business: %', v_company_open_count;
  RAISE NOTICE 'Companies with coordinates: %', v_company_with_coords;
  RAISE NOTICE '========================================';

  IF v_prof_with_coords = 0 THEN
    RAISE WARNING 'No professionals have coordinates! Users need to set their location in profile settings.';
  END IF;

  IF v_company_with_coords = 0 THEN
    RAISE WARNING 'No companies have coordinates! Companies need to set their location in profile settings.';
  END IF;
END $$;
