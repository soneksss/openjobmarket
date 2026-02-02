-- ============================================================================
-- Migration: Fix saved_jobs table to support all user types (professionals and companies)
-- Date: 2026-02-02
-- Purpose: Add user_id column and update RLS policies for saved_jobs
-- ============================================================================

-- Add user_id column if it doesn't exist (companies save jobs using user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_jobs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE saved_jobs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added user_id column to saved_jobs table';
  END IF;
END $$;

-- Backfill user_id from professional_id where possible
UPDATE saved_jobs sj
SET user_id = pp.user_id
FROM professional_profiles pp
WHERE sj.professional_id = pp.id
  AND sj.user_id IS NULL;

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);

-- Enable RLS on saved_jobs
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own saved jobs" ON saved_jobs;
DROP POLICY IF EXISTS "Users can insert their own saved jobs" ON saved_jobs;
DROP POLICY IF EXISTS "Users can delete their own saved jobs" ON saved_jobs;
DROP POLICY IF EXISTS "Professionals can view their saved jobs" ON saved_jobs;
DROP POLICY IF EXISTS "Professionals can save jobs" ON saved_jobs;
DROP POLICY IF EXISTS "Professionals can unsave jobs" ON saved_jobs;

-- RLS Policy: Users can view their own saved jobs (by user_id OR professional_id match)
CREATE POLICY "Users can view their own saved jobs"
ON saved_jobs FOR SELECT
USING (
  auth.uid() = user_id
  OR
  auth.uid() IN (SELECT user_id FROM professional_profiles WHERE id = professional_id)
);

-- RLS Policy: Users can insert their own saved jobs
CREATE POLICY "Users can insert their own saved jobs"
ON saved_jobs FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR
  auth.uid() IN (SELECT user_id FROM professional_profiles WHERE id = professional_id)
);

-- RLS Policy: Users can delete their own saved jobs
CREATE POLICY "Users can delete their own saved jobs"
ON saved_jobs FOR DELETE
USING (
  auth.uid() = user_id
  OR
  auth.uid() IN (SELECT user_id FROM professional_profiles WHERE id = professional_id)
);

-- Log the migration
DO $$
DECLARE
  v_total_saved INTEGER;
  v_with_user_id INTEGER;
  v_with_professional_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_saved FROM saved_jobs;
  SELECT COUNT(*) INTO v_with_user_id FROM saved_jobs WHERE user_id IS NOT NULL;
  SELECT COUNT(*) INTO v_with_professional_id FROM saved_jobs WHERE professional_id IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Saved Jobs Migration Complete:';
  RAISE NOTICE '  - Total saved jobs: %', v_total_saved;
  RAISE NOTICE '  - With user_id: %', v_with_user_id;
  RAISE NOTICE '  - With professional_id: %', v_with_professional_id;
  RAISE NOTICE '========================================';
END $$;
