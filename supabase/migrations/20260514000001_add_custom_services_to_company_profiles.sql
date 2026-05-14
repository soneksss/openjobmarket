-- Add custom_services column to company_profiles for tradesperson-defined services
-- These are display-only and excluded from the standard search/filter system
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS custom_services text[];
