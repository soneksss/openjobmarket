-- Migration: Add onboarding_completed flag to all profile tables
-- This flag tracks whether users have completed the initial onboarding process

-- Add onboarding_completed to professional_profiles
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Add onboarding_completed to company_profiles
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Add onboarding_completed to contractor_profiles
ALTER TABLE public.contractor_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Add onboarding_completed to homeowner_profiles
ALTER TABLE public.homeowner_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Mark existing users as having completed onboarding (grandfather existing users)
UPDATE public.professional_profiles SET onboarding_completed = TRUE;
UPDATE public.company_profiles SET onboarding_completed = TRUE;
UPDATE public.contractor_profiles SET onboarding_completed = TRUE;
UPDATE public.homeowner_profiles SET onboarding_completed = TRUE;

COMMENT ON COLUMN public.professional_profiles.onboarding_completed IS 'Whether user has completed initial onboarding';
COMMENT ON COLUMN public.company_profiles.onboarding_completed IS 'Whether user has completed initial onboarding';
COMMENT ON COLUMN public.contractor_profiles.onboarding_completed IS 'Whether user has completed initial onboarding';
COMMENT ON COLUMN public.homeowner_profiles.onboarding_completed IS 'Whether user has completed initial onboarding';
