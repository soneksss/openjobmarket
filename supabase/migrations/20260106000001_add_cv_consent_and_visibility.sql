-- Migration: Add CV consent, visibility, and upload tracking fields
-- Date: 2026-01-06
-- Description: GDPR/LGPD compliance for CV Builder and Upload

-- Add new columns to professional_profiles table
ALTER TABLE professional_profiles
  -- Consent tracking (GDPR/LGPD requirement)
  ADD COLUMN cv_consent_given BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN cv_consent_given_at TIMESTAMPTZ,
  ADD COLUMN cv_privacy_policy_version VARCHAR(10) DEFAULT '1.0',

  -- Visibility control (privacy by default)
  ADD COLUMN cv_visibility VARCHAR(20) DEFAULT 'private'
    CHECK (cv_visibility IN ('private', 'public', 'employers_only', 'per_application')),

  -- CV source: 'builder' or 'upload' (one or the other, not both)
  ADD COLUMN cv_source VARCHAR(20) DEFAULT 'builder'
    CHECK (cv_source IN ('builder', 'upload', NULL)),

  -- Upload file tracking
  ADD COLUMN cv_uploaded_file_path TEXT,
  ADD COLUMN cv_uploaded_file_name TEXT,
  ADD COLUMN cv_uploaded_file_size INTEGER, -- bytes
  ADD COLUMN cv_uploaded_file_type VARCHAR(50), -- MIME type
  ADD COLUMN cv_uploaded_at TIMESTAMPTZ,

  -- Sensitive data warning acknowledgment
  ADD COLUMN cv_sensitive_data_warning_acknowledged BOOLEAN DEFAULT FALSE,
  ADD COLUMN cv_sensitive_data_warning_acknowledged_at TIMESTAMPTZ;

-- Grandfather existing CVs (auto-consent for users who already have CVs)
UPDATE professional_profiles
SET cv_consent_given = TRUE,
    cv_consent_given_at = NOW(),
    cv_privacy_policy_version = '1.0',
    cv_visibility = 'private', -- Privacy by default
    cv_source = 'builder' -- Existing CVs are from builder
WHERE EXISTS (
  SELECT 1 FROM professional_cvs WHERE professional_id = professional_profiles.id
);

-- Create indexes for performance
CREATE INDEX idx_professional_profiles_cv_visibility ON professional_profiles(cv_visibility);
CREATE INDEX idx_professional_profiles_cv_consent ON professional_profiles(cv_consent_given);
CREATE INDEX idx_professional_profiles_cv_source ON professional_profiles(cv_source);

-- Add comments for documentation
COMMENT ON COLUMN professional_profiles.cv_consent_given IS
  'User has given explicit consent to use CV data (GDPR/LGPD compliant)';
COMMENT ON COLUMN professional_profiles.cv_consent_given_at IS
  'Timestamp when consent was given';
COMMENT ON COLUMN professional_profiles.cv_privacy_policy_version IS
  'Version of privacy policy user consented to';
COMMENT ON COLUMN professional_profiles.cv_visibility IS
  'Controls who can see the CV: private (default), public, employers_only, per_application';
COMMENT ON COLUMN professional_profiles.cv_source IS
  'Source of CV: builder (built in app) or upload (PDF/DOCX file)';
COMMENT ON COLUMN professional_profiles.cv_uploaded_file_path IS
  'Supabase Storage path for uploaded CV file';
COMMENT ON COLUMN professional_profiles.cv_uploaded_file_name IS
  'Original filename of uploaded CV';
COMMENT ON COLUMN professional_profiles.cv_uploaded_file_size IS
  'File size in bytes';
COMMENT ON COLUMN professional_profiles.cv_uploaded_file_type IS
  'MIME type of uploaded file (application/pdf, etc.)';
COMMENT ON COLUMN professional_profiles.cv_sensitive_data_warning_acknowledged IS
  'User has acknowledged the sensitive data warning before saving/uploading CV';
