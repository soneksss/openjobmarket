-- Migration: Add industry column and set default for existing professional profiles
-- This fixes the Select component error by ensuring no empty string values

-- Add industry column to professional_profiles table
ALTER TABLE professional_profiles
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Update all professional profiles that have NULL or empty industry
-- Set them to "Professional Services" as a generic default
UPDATE professional_profiles
SET industry = 'Professional Services'
WHERE industry IS NULL OR industry = '';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added industry column to professional_profiles table';
  RAISE NOTICE 'Set default industry "Professional Services" for existing users';
  RAISE NOTICE 'New users will need to select their industry when editing their profile';
END $$;
