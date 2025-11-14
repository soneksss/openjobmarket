-- Add full_address column to company_profiles table
-- This stores the complete detailed street address (optional)
-- This is DIFFERENT from the 'location' column which stores city/region only

-- location column: General location for display and searches (e.g., "London, UK")
-- full_address column: Detailed street address (e.g., "123 High St, Apartment 4B, London, Greater London, SW1A 1AA, United Kingdom")

ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS full_address TEXT;

-- Add comment
COMMENT ON COLUMN company_profiles.full_address IS 'Complete business street address (optional, detailed - different from location which is city/region)';
