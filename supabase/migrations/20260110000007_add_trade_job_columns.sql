-- Migration: Add Trade Job specific columns to jobs table
-- Date: 2026-01-10
-- Description: Adds category, urgency, budget_min, and budget_max columns for Trade Jobs

-- ============================================================================
-- ADD TRADE JOB COLUMNS
-- ============================================================================

-- Add category column (e.g., "Plumbing", "Electrical", "Construction")
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN jobs.category IS
  'Trade job category (e.g., Plumbing, Electrical, Construction, Carpentry, etc.)';

-- Add urgency column (e.g., "urgent", "within_week", "flexible")
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS urgency TEXT;

COMMENT ON COLUMN jobs.urgency IS
  'Trade job urgency level (e.g., urgent, within_week, within_month, flexible)';

-- Add budget_min column (minimum budget in smallest currency unit)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS budget_min INTEGER;

COMMENT ON COLUMN jobs.budget_min IS
  'Minimum budget for trade job (in smallest currency unit, e.g., cents/pence)';

-- Add budget_max column (maximum budget in smallest currency unit)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS budget_max INTEGER;

COMMENT ON COLUMN jobs.budget_max IS
  'Maximum budget for trade job (in smallest currency unit, e.g., cents/pence)';

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on category for filtering trade jobs by category
CREATE INDEX IF NOT EXISTS idx_jobs_category
ON jobs(category)
WHERE is_tradespeople_job = TRUE;

-- Index on urgency for filtering trade jobs by urgency
CREATE INDEX IF NOT EXISTS idx_jobs_urgency
ON jobs(urgency)
WHERE is_tradespeople_job = TRUE;

-- Index on budget range for filtering trade jobs by budget
CREATE INDEX IF NOT EXISTS idx_jobs_budget_range
ON jobs(budget_min, budget_max)
WHERE is_tradespeople_job = TRUE;

-- ============================================================================
-- VALIDATION CONSTRAINTS (OPTIONAL)
-- ============================================================================

-- Add check constraint for valid urgency values
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_urgency_check;

ALTER TABLE jobs
ADD CONSTRAINT jobs_urgency_check
CHECK (urgency IS NULL OR urgency IN ('urgent', 'within_week', 'within_month', 'flexible'));

-- Add check constraint for valid budget values (budget_max must be >= budget_min)
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_budget_check;

ALTER TABLE jobs
ADD CONSTRAINT jobs_budget_check
CHECK (
  (budget_min IS NULL AND budget_max IS NULL) OR
  (budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_max >= budget_min)
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify columns exist
DO $$
DECLARE
  columns_exist BOOLEAN;
BEGIN
  SELECT COUNT(*) = 4 INTO columns_exist
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'jobs'
    AND column_name IN ('category', 'urgency', 'budget_min', 'budget_max');

  IF columns_exist THEN
    RAISE NOTICE 'Trade Job columns added successfully: category, urgency, budget_min, budget_max';
  ELSE
    RAISE WARNING 'Some Trade Job columns may not have been created';
  END IF;
END $$;
