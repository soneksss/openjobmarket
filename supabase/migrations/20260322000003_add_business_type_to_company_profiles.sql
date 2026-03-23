-- Add business verification fields to company_profiles

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS business_type VARCHAR(20) DEFAULT NULL
    CHECK (business_type IN ('limited_company', 'sole_trader')),
  ADD COLUMN IF NOT EXISTS company_registration_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS registered_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_document_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE DEFAULT NULL;

COMMENT ON COLUMN company_profiles.business_type IS 'limited_company or sole_trader';
COMMENT ON COLUMN company_profiles.company_registration_number IS 'Companies House registration number (limited companies only)';
COMMENT ON COLUMN company_profiles.registered_address IS 'Registered office address (limited companies only)';
COMMENT ON COLUMN company_profiles.insurance_document_url IS 'URL to uploaded insurance certificate (public liability or employers liability)';
COMMENT ON COLUMN company_profiles.insurance_expiry_date IS 'Expiry date of the uploaded insurance certificate';
