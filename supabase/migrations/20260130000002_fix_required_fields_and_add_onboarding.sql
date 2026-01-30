-- ============================================
-- CRITICAL FIX: Make profile fields optional
-- AND add onboarding_completed flag
-- ============================================

-- PART 1: Add onboarding_completed flag
-- Add to professional_profiles
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Add to company_profiles
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Add to contractor_profiles
ALTER TABLE public.contractor_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Add to homeowner_profiles
ALTER TABLE public.homeowner_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Mark existing users as completed (grandfather)
UPDATE public.professional_profiles SET onboarding_completed = TRUE;
UPDATE public.company_profiles SET onboarding_completed = TRUE;
UPDATE public.contractor_profiles SET onboarding_completed = TRUE;
UPDATE public.homeowner_profiles SET onboarding_completed = TRUE;

-- PART 2: Make required fields NULLABLE
-- This allows profile creation without full data
-- Data will be collected during onboarding

-- Professional Profiles
ALTER TABLE public.professional_profiles
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL,
ALTER COLUMN title DROP NOT NULL,
ALTER COLUMN location DROP NOT NULL;

-- Set defaults for empty fields
UPDATE public.professional_profiles
SET first_name = 'User' WHERE first_name = '' OR first_name IS NULL;

UPDATE public.professional_profiles
SET last_name = 'Name' WHERE last_name = '' OR last_name IS NULL;

-- Company Profiles
ALTER TABLE public.company_profiles
ALTER COLUMN company_name DROP NOT NULL,
ALTER COLUMN industry DROP NOT NULL,
ALTER COLUMN location DROP NOT NULL;

-- Set defaults for empty fields
UPDATE public.company_profiles
SET company_name = 'Company' WHERE company_name = '' OR company_name IS NULL;

UPDATE public.company_profiles
SET industry = 'General' WHERE industry = '' OR industry IS NULL;

-- Contractor Profiles
-- Only modify columns that exist (check schema first)
DO $$
BEGIN
  -- company_name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_profiles' AND column_name = 'company_name' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.contractor_profiles ALTER COLUMN company_name DROP NOT NULL;
  END IF;

  -- location
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_profiles' AND column_name = 'location' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.contractor_profiles ALTER COLUMN location DROP NOT NULL;
  END IF;

  -- trade (if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_profiles' AND column_name = 'trade' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.contractor_profiles ALTER COLUMN trade DROP NOT NULL;
  END IF;
END $$;

-- Set defaults for empty fields (only for columns that exist)
UPDATE public.contractor_profiles
SET company_name = 'Contractor'
WHERE company_name = '' OR company_name IS NULL;

-- Homeowner Profiles
ALTER TABLE public.homeowner_profiles
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL,
ALTER COLUMN location DROP NOT NULL;

-- Set defaults for empty fields
UPDATE public.homeowner_profiles
SET first_name = 'User' WHERE first_name = '' OR first_name IS NULL;

UPDATE public.homeowner_profiles
SET last_name = 'Name' WHERE last_name = '' OR last_name IS NULL;

-- PART 3: Add helpful comments
COMMENT ON COLUMN public.professional_profiles.onboarding_completed IS 'Whether user has completed initial onboarding';
COMMENT ON COLUMN public.company_profiles.onboarding_completed IS 'Whether user has completed initial onboarding';
COMMENT ON COLUMN public.contractor_profiles.onboarding_completed IS 'Whether user has completed initial onboarding';
COMMENT ON COLUMN public.homeowner_profiles.onboarding_completed IS 'Whether user has completed initial onboarding';

-- PART 4: Verify changes
-- Show updated column constraints
SELECT
  table_name,
  column_name,
  is_nullable,
  CASE WHEN is_nullable = 'YES' THEN '✓ NOW OPTIONAL' ELSE '⚠️ STILL REQUIRED' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('professional_profiles', 'company_profiles', 'contractor_profiles', 'homeowner_profiles')
  AND column_name IN ('first_name', 'last_name', 'company_name', 'location', 'title', 'industry', 'onboarding_completed')
ORDER BY table_name, column_name;

-- Show summary
DO $$
DECLARE
  v_result TEXT;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✓ onboarding_completed column added to all profile tables';
  RAISE NOTICE '✓ Required fields made nullable';
  RAISE NOTICE '✓ Defaults set for existing empty data';
  RAISE NOTICE '';
  RAISE NOTICE 'Signup should now work with minimal data!';
  RAISE NOTICE '============================================';
END $$;
