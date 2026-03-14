-- Add phone and bio columns to homeowner_profiles
ALTER TABLE public.homeowner_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;
