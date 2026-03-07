-- Migration: Add urgency_type and deadline_at columns for trade jobs timer system
-- Date: 2026-02-13
-- Description: Adds urgency_type (asap/today/flexible) and deadline_at timestamp for trade jobs
-- Urgency levels:
--   - asap: 1 hour deadline
--   - today: 6 hours deadline
--   - flexible: 1-7 days deadline (user selects)

-- ============================================================================
-- ADD URGENCY_TYPE COLUMN
-- ============================================================================

-- Add urgency_type column with constrained values
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS urgency_type TEXT;

COMMENT ON COLUMN jobs.urgency_type IS
  'Trade job urgency level: asap (1 hour), today (6 hours), flexible (1-7 days)';

-- Add check constraint for valid urgency_type values
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_urgency_type_check;

ALTER TABLE jobs
ADD CONSTRAINT jobs_urgency_type_check
CHECK (urgency_type IS NULL OR urgency_type IN ('asap', 'today', 'flexible'));

-- ============================================================================
-- ADD DEADLINE_AT COLUMN
-- ============================================================================

-- Add deadline_at timestamp column for timer display
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;

COMMENT ON COLUMN jobs.deadline_at IS
  'Deadline timestamp for trade jobs timer. Set based on urgency_type when job is created.';

-- Create index for deadline queries
CREATE INDEX IF NOT EXISTS idx_jobs_deadline_at
ON jobs(deadline_at)
WHERE is_tradespeople_job = TRUE AND deadline_at IS NOT NULL;

-- ============================================================================
-- MIGRATE EXISTING TRADE JOBS
-- ============================================================================

-- Set all existing trade jobs to 'flexible' with 7-day deadline from now
-- This ensures existing jobs work with the new timer system
UPDATE jobs
SET
  urgency_type = 'flexible',
  deadline_at = NOW() + INTERVAL '7 days'
WHERE is_tradespeople_job = TRUE
  AND urgency_type IS NULL;

-- ============================================================================
-- CREATE HELPER FUNCTION FOR DEADLINE CALCULATION
-- ============================================================================

-- Function to calculate deadline based on urgency_type
CREATE OR REPLACE FUNCTION calculate_job_deadline(p_urgency_type TEXT, p_flexible_days INTEGER DEFAULT 7)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  CASE p_urgency_type
    WHEN 'asap' THEN
      RETURN NOW() + INTERVAL '1 hour';
    WHEN 'today' THEN
      RETURN NOW() + INTERVAL '6 hours';
    WHEN 'flexible' THEN
      -- Flexible uses the specified number of days (1-7)
      RETURN NOW() + (p_flexible_days || ' days')::INTERVAL;
    ELSE
      RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_job_deadline IS
  'Calculates the deadline timestamp based on urgency_type. asap=1hr, today=6hrs, flexible=1-7 days';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  urgency_type_exists BOOLEAN;
  deadline_at_exists BOOLEAN;
  migrated_count INTEGER;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'urgency_type'
  ) INTO urgency_type_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'deadline_at'
  ) INTO deadline_at_exists;

  -- Count migrated jobs
  SELECT COUNT(*) INTO migrated_count
  FROM jobs
  WHERE is_tradespeople_job = TRUE AND urgency_type IS NOT NULL;

  IF urgency_type_exists AND deadline_at_exists THEN
    RAISE NOTICE 'Successfully added urgency_type and deadline_at columns';
    RAISE NOTICE 'Migrated % existing trade jobs to flexible with 7-day deadline', migrated_count;
  ELSE
    RAISE WARNING 'Some columns may not have been created';
  END IF;
END $$;
