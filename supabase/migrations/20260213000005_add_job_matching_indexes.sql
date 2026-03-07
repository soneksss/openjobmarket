-- Migration: Add Performance Indexes for Job Matching System
-- Date: 2026-02-13
-- Description: Adds indexes for efficient job matching queries and radius-based searches
-- Part 3 of the Uber-style job matching implementation

-- ============================================================================
-- PART 1: INDEXES FOR MATCHING STATUS QUERIES
-- ============================================================================

-- Index for finding jobs in 'searching' status (active trade jobs)
CREATE INDEX IF NOT EXISTS idx_jobs_matching_status_searching
ON jobs(matching_status)
WHERE is_tradespeople_job = TRUE AND matching_status = 'searching';

-- Index for finding jobs in 'reviewing' status
CREATE INDEX IF NOT EXISTS idx_jobs_matching_status_reviewing
ON jobs(matching_status)
WHERE is_tradespeople_job = TRUE AND matching_status = 'reviewing';

-- Composite index for trade job queries with matching status
CREATE INDEX IF NOT EXISTS idx_jobs_trade_matching
ON jobs(is_tradespeople_job, matching_status, deadline_at)
WHERE is_tradespeople_job = TRUE;

-- ============================================================================
-- PART 2: INDEXES FOR RADIUS-BASED QUERIES
-- ============================================================================

-- Index for job location (lat/lon for distance calculations)
CREATE INDEX IF NOT EXISTS idx_jobs_location_coords
ON jobs(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for current radius (for expansion queries)
CREATE INDEX IF NOT EXISTS idx_jobs_current_radius
ON jobs(current_radius)
WHERE is_tradespeople_job = TRUE AND matching_status = 'searching';

-- Index for broadcast timing (for radius expansion cron)
CREATE INDEX IF NOT EXISTS idx_jobs_last_broadcast
ON jobs(last_broadcast_at)
WHERE is_tradespeople_job = TRUE AND matching_status = 'searching';

-- ============================================================================
-- PART 3: INDEXES FOR APPLICATION QUERIES
-- ============================================================================

-- Index for counting applications per job
CREATE INDEX IF NOT EXISTS idx_job_applications_job_status
ON job_applications(job_id, status);

-- Index for user's applications (for "Jobs You Applied For")
CREATE INDEX IF NOT EXISTS idx_job_applications_user
ON job_applications(user_id, applied_at DESC);

-- Index for pending applications (for tradesperson notifications)
CREATE INDEX IF NOT EXISTS idx_job_applications_pending
ON job_applications(status, applied_at DESC)
WHERE status = 'pending';

-- ============================================================================
-- PART 4: INDEXES FOR DEADLINE QUERIES
-- ============================================================================

-- Index for finding jobs near deadline (for expiration cron)
CREATE INDEX IF NOT EXISTS idx_jobs_deadline_expiring
ON jobs(deadline_at)
WHERE is_tradespeople_job = TRUE
  AND matching_status = 'searching'
  AND deadline_at IS NOT NULL;

-- Index for urgency type filtering
CREATE INDEX IF NOT EXISTS idx_jobs_urgency_type
ON jobs(urgency_type)
WHERE is_tradespeople_job = TRUE AND urgency_type IS NOT NULL;

-- ============================================================================
-- PART 5: COMPOSITE INDEX FOR COMMON TRADESPERSON SEARCH
-- ============================================================================

-- Composite index for searching trade jobs by category and location
CREATE INDEX IF NOT EXISTS idx_jobs_trade_search
ON jobs(category, matching_status, latitude, longitude)
WHERE is_tradespeople_job = TRUE AND matching_status = 'searching';

-- ============================================================================
-- PART 6: INDEX FOR HOMEOWNER'S JOB MANAGEMENT
-- ============================================================================

-- Index for homeowner's jobs with matching status
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_matching
ON jobs(homeowner_id, matching_status, created_at DESC)
WHERE homeowner_id IS NOT NULL;

-- ============================================================================
-- PART 7: GEOSPATIAL INDEX (if PostGIS is available)
-- ============================================================================

-- Check if PostGIS is available and create a geospatial index
DO $$
BEGIN
  -- Check if PostGIS extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    -- Add geometry column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'jobs' AND column_name = 'geom'
    ) THEN
      EXECUTE 'ALTER TABLE jobs ADD COLUMN geom geometry(Point, 4326)';

      -- Populate geometry from lat/lon
      EXECUTE 'UPDATE jobs SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
               WHERE latitude IS NOT NULL AND longitude IS NOT NULL';

      -- Create spatial index
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_jobs_geom ON jobs USING GIST(geom)';

      RAISE NOTICE 'PostGIS geospatial index created on jobs table';
    END IF;
  ELSE
    RAISE NOTICE 'PostGIS not available - using standard lat/lon indexes for distance queries';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create PostGIS index: %', SQLERRM;
END $$;

-- ============================================================================
-- PART 8: ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ============================================================================

ANALYZE jobs;
ANALYZE job_applications;

-- ============================================================================
-- PART 9: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  jobs_idx_count INTEGER;
  applications_idx_count INTEGER;
BEGIN
  -- Count new indexes on jobs
  SELECT COUNT(*) INTO jobs_idx_count
  FROM pg_indexes
  WHERE tablename = 'jobs'
    AND indexname LIKE 'idx_jobs_%';

  -- Count new indexes on job_applications
  SELECT COUNT(*) INTO applications_idx_count
  FROM pg_indexes
  WHERE tablename = 'job_applications'
    AND indexname LIKE 'idx_job_applications_%';

  RAISE NOTICE '======================================';
  RAISE NOTICE 'Job Matching Indexes Migration Complete';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Indexes on jobs table: %', jobs_idx_count;
  RAISE NOTICE 'Indexes on job_applications table: %', applications_idx_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Optimized queries:';
  RAISE NOTICE '  ✓ Matching status filtering';
  RAISE NOTICE '  ✓ Radius-based job search';
  RAISE NOTICE '  ✓ Application counting per job';
  RAISE NOTICE '  ✓ Deadline expiration checks';
  RAISE NOTICE '  ✓ Homeowner job management';
  RAISE NOTICE '  ✓ Tradesperson job notifications';
  RAISE NOTICE '======================================';
END $$;
