-- Add enhanced fields to professional_profiles for better talent search display
-- Fields to make the professional profiles more informative (similar to Indeed.com)

-- Create enum type for availability status
DO $$ BEGIN
    CREATE TYPE availability_status AS ENUM (
        'available_now',
        'available_week',
        'available_month',
        'not_specified'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to professional_profiles
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS availability availability_status DEFAULT 'not_specified',
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS is_self_employed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ready_to_relocate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_driving_licence BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_own_transport BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS employment_status TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add availability to company_profiles
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS availability availability_status DEFAULT 'available_now';

-- Add availability to contractor_profiles
ALTER TABLE public.contractor_profiles
ADD COLUMN IF NOT EXISTS availability availability_status DEFAULT 'not_specified',
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS ready_to_relocate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_driving_licence BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_own_transport BOOLEAN DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_professional_profiles_availability
ON public.professional_profiles(availability);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_employment_status
ON public.professional_profiles(employment_status);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_self_employed
ON public.professional_profiles(is_self_employed);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_relocate
ON public.professional_profiles(ready_to_relocate);

-- Add comments for documentation
COMMENT ON COLUMN public.professional_profiles.nickname IS 'Display name or nickname (falls back to first_name + last_name if not set)';
COMMENT ON COLUMN public.professional_profiles.availability IS 'When the professional is available to start work';
COMMENT ON COLUMN public.professional_profiles.languages IS 'Array of languages the professional speaks';
COMMENT ON COLUMN public.professional_profiles.website_url IS 'Personal website or portfolio URL';
COMMENT ON COLUMN public.professional_profiles.is_self_employed IS 'Whether the professional is self-employed';
COMMENT ON COLUMN public.professional_profiles.ready_to_relocate IS 'Whether the professional is willing to relocate';
COMMENT ON COLUMN public.professional_profiles.has_driving_licence IS 'Whether the professional has a valid driving licence';
COMMENT ON COLUMN public.professional_profiles.has_own_transport IS 'Whether the professional has own transport';
COMMENT ON COLUMN public.professional_profiles.employment_status IS 'Current employment status (employed, unemployed, student, etc.)';
COMMENT ON COLUMN public.professional_profiles.bio IS 'Short biography or professional summary';
