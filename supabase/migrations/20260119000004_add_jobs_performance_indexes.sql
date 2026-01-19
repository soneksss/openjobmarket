-- Migration: Add Performance Indexes to Jobs Table
-- Date: 2026-01-19
-- Purpose: Fix search query timeout by adding critical indexes on frequently queried columns

-- =========================================
-- COMPOSITE INDEXES FOR CORE QUERIES
-- =========================================

-- Main search filter: status + is_active + is_tradespeople_job (always queried together)
CREATE INDEX IF NOT EXISTS idx_jobs_search_base
ON jobs(status, is_active, is_tradespeople_job)
WHERE status = 'open' AND is_active = true;

-- Expiry filtering (used in OR condition with expires_at)
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at
ON jobs(expires_at)
WHERE expires_at IS NOT NULL;

-- =========================================
-- VACANCY-SPECIFIC INDEXES
-- =========================================

-- Job type filtering for vacancies
CREATE INDEX IF NOT EXISTS idx_jobs_job_type
ON jobs(job_type)
WHERE is_tradespeople_job = false;

-- Experience level filtering for vacancies
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level
ON jobs(experience_level)
WHERE is_tradespeople_job = false;

-- Work location filtering for vacancies
CREATE INDEX IF NOT EXISTS idx_jobs_work_location
ON jobs(work_location)
WHERE is_tradespeople_job = false;

-- No experience required filtering
CREATE INDEX IF NOT EXISTS idx_jobs_no_experience_required
ON jobs(no_experience_required)
WHERE is_tradespeople_job = false AND no_experience_required = true;

-- Salary range filtering (composite for range queries)
CREATE INDEX IF NOT EXISTS idx_jobs_salary_range
ON jobs(salary_min, salary_max)
WHERE is_tradespeople_job = false;

-- =========================================
-- JOIN PERFORMANCE INDEXES
-- =========================================

-- Foreign key indexes for join performance
CREATE INDEX IF NOT EXISTS idx_jobs_company_id
ON jobs(company_id)
WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_id
ON jobs(homeowner_id)
WHERE homeowner_id IS NOT NULL;

-- =========================================
-- FULL-TEXT SEARCH INDEXES
-- =========================================

-- Add tsvector column for full-text search (replaces ILIKE)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update search_vector for existing rows
UPDATE jobs
SET search_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
WHERE search_vector IS NULL;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_jobs_search_vector
ON jobs USING gin(search_vector);

-- Create trigger to automatically update search_vector
CREATE OR REPLACE FUNCTION update_jobs_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_jobs_search_vector ON jobs;
CREATE TRIGGER trigger_update_jobs_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_search_vector();

-- =========================================
-- COMPOSITE INDEX FOR COMMON QUERIES
-- =========================================

-- Composite index for the most common query pattern: vacancies
CREATE INDEX IF NOT EXISTS idx_jobs_vacancies_common
ON jobs(status, is_active, is_tradespeople_job, job_type, experience_level)
WHERE status = 'open' AND is_active = true AND is_tradespeople_job = false;

-- Composite index for trade jobs
CREATE INDEX IF NOT EXISTS idx_jobs_trades_common
ON jobs(status, is_active, is_tradespeople_job, category, urgency)
WHERE status = 'open' AND is_active = true AND is_tradespeople_job = true;

-- =========================================
-- COMMENTS
-- =========================================

COMMENT ON INDEX idx_jobs_search_base IS
'Composite index for base search filters (status, is_active, is_tradespeople_job)';

COMMENT ON INDEX idx_jobs_expires_at IS
'Index for filtering non-expired jobs';

COMMENT ON INDEX idx_jobs_search_vector IS
'GIN index for full-text search on title and description (replaces ILIKE)';

COMMENT ON COLUMN jobs.search_vector IS
'Auto-updated full-text search vector for title + description';

-- =========================================
-- VERIFICATION
-- =========================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  -- Count new indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'jobs'
    AND indexname LIKE 'idx_jobs_%';

  RAISE NOTICE '======================================';
  RAISE NOTICE 'Jobs Performance Indexes Migration Complete';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Total indexes on jobs table: %', index_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Optimizations applied:';
  RAISE NOTICE '  ✓ Composite indexes for common queries';
  RAISE NOTICE '  ✓ Join performance indexes (company_id, homeowner_id)';
  RAISE NOTICE '  ✓ Full-text search (GIN index)';
  RAISE NOTICE '  ✓ Partial indexes for vacancies and trade jobs';
  RAISE NOTICE '======================================';
END $$;
