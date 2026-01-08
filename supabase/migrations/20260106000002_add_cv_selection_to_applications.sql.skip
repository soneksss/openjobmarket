-- Migration: Add CV selection tracking to job applications
-- Date: 2026-01-06
-- Description: Track which CV type was used in job applications

-- Add columns to job_applications table
ALTER TABLE job_applications
  ADD COLUMN cv_type_used VARCHAR(20)
    CHECK (cv_type_used IN ('builder', 'upload', 'none', NULL)),
  ADD COLUMN cv_visibility_at_application VARCHAR(20);

-- Add index for querying applications by CV type
CREATE INDEX idx_job_applications_cv_type ON job_applications(cv_type_used);

-- Add comments
COMMENT ON COLUMN job_applications.cv_type_used IS
  'Which CV the user attached to this application: builder, upload, or none';
COMMENT ON COLUMN job_applications.cv_visibility_at_application IS
  'Snapshot of CV visibility setting at time of application';
