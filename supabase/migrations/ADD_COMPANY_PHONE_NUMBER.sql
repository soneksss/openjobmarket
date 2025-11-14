-- Add phone_number column to company_profiles table
ALTER TABLE public.company_profiles
ADD COLUMN phone_number TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN public.company_profiles.phone_number IS 'Company contact phone number';
