-- Migration: Add job completion status and tracking
-- This adds fields to track when a job is completed and which contractor was selected

-- Add completion tracking fields to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS accepted_contractor_id UUID REFERENCES contractor_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completion_status TEXT CHECK (completion_status IN ('pending', 'accepted', 'completed')) DEFAULT 'pending';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_completion_status ON jobs(completion_status);
CREATE INDEX IF NOT EXISTS idx_jobs_accepted_contractor ON jobs(accepted_contractor_id);

-- Create trigger to update application status when contractor is accepted
CREATE OR REPLACE FUNCTION update_application_status_on_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepted_contractor_id IS NOT NULL AND (OLD.accepted_contractor_id IS NULL OR OLD.accepted_contractor_id != NEW.accepted_contractor_id) THEN
    -- Update the accepted contractor's application to 'accepted'
    UPDATE job_applications
    SET status = 'accepted'
    WHERE job_id = NEW.id AND contractor_id = NEW.accepted_contractor_id;

    -- Update all other contractors' applications to 'rejected'
    UPDATE job_applications
    SET status = 'rejected'
    WHERE job_id = NEW.id
      AND contractor_id != NEW.accepted_contractor_id
      AND contractor_id IS NOT NULL
      AND status != 'rejected';

    -- Set completion status to 'accepted' when contractor is selected
    NEW.completion_status = 'accepted';
  END IF;

  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    -- Set completion status to 'completed' when job is marked as complete
    NEW.completion_status = 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_update_application_status_on_accept ON jobs;
CREATE TRIGGER trigger_update_application_status_on_accept
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_application_status_on_accept();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added job completion status tracking';
  RAISE NOTICE 'Added fields: accepted_contractor_id, completed_at, completion_status';
  RAISE NOTICE 'Created trigger: update_application_status_on_accept';
END $$;
