-- Migration: Populate search_vector for existing jobs
-- Date: 2026-01-19
-- Purpose: Ensure all existing jobs have search_vector populated for full-text search

-- Update search_vector for all jobs that don't have it
UPDATE jobs
SET search_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, ''))
WHERE search_vector IS NULL;

-- Verify
DO $$
DECLARE
  v_total_jobs INTEGER;
  v_jobs_with_vector INTEGER;
  v_jobs_without_vector INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_jobs FROM jobs;
  SELECT COUNT(*) INTO v_jobs_with_vector FROM jobs WHERE search_vector IS NOT NULL;
  SELECT COUNT(*) INTO v_jobs_without_vector FROM jobs WHERE search_vector IS NULL;

  RAISE NOTICE '======================================';
  RAISE NOTICE 'Search Vector Population Complete';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Total jobs: %', v_total_jobs;
  RAISE NOTICE 'Jobs with search_vector: %', v_jobs_with_vector;
  RAISE NOTICE 'Jobs without search_vector: %', v_jobs_without_vector;
  RAISE NOTICE '======================================';
END $$;
