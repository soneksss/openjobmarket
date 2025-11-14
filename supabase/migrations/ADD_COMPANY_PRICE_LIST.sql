-- Add price_list column to company_profiles table
-- This allows companies to add a list of common service prices to attract customers

ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS price_list TEXT;

-- Add comment
COMMENT ON COLUMN company_profiles.price_list IS 'List of common service prices (optional, helps attract customers)';
