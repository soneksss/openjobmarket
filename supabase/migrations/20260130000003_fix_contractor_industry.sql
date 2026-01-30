-- Quick fix for contractor_profiles.industry
-- Make it nullable so profile creation doesn't fail

-- Check if column exists and is NOT NULL, then make it nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_profiles'
      AND column_name = 'industry'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.contractor_profiles ALTER COLUMN industry DROP NOT NULL;
    RAISE NOTICE '✓ contractor_profiles.industry is now OPTIONAL';
  ELSE
    RAISE NOTICE '○ contractor_profiles.industry is already optional or does not exist';
  END IF;
END $$;

-- Set default for existing empty values
UPDATE public.contractor_profiles
SET industry = 'General'
WHERE industry = '' OR industry IS NULL;
