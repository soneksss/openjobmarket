-- Migration: Change default status from 'draft' to 'open'
-- Date: 2026-01-10
-- Description: Ensures all new jobs are published by default (status = 'open') unless explicitly set to 'draft'
--              This prevents jobs from being saved as draft if publishing is interrupted

-- ============================================================================
-- CHANGE DEFAULT STATUS TO 'OPEN'
-- ============================================================================

-- Set default status to 'open' so jobs are published immediately when created
ALTER TABLE jobs
ALTER COLUMN status SET DEFAULT 'open';

COMMENT ON COLUMN jobs.status IS
  'Job status: open (published and searchable), draft (not published), accepted (assigned to tradesperson), in_progress (work started), completed, failed. Default is ''open''.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the default value was changed
DO $$
DECLARE
  default_value TEXT;
BEGIN
  SELECT column_default INTO default_value
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'jobs'
    AND column_name = 'status';

  IF default_value = '''open''::text' THEN
    RAISE NOTICE 'SUCCESS: Default status changed to ''open''. New jobs will be published by default.';
  ELSE
    RAISE WARNING 'Default status is: %. Expected ''open''.', default_value;
  END IF;
END $$;

-- Show current status distribution
SELECT
  'Current job status distribution' as info,
  status,
  is_tradespeople_job,
  COUNT(*) as count
FROM jobs
GROUP BY status, is_tradespeople_job
ORDER BY is_tradespeople_job, status;
