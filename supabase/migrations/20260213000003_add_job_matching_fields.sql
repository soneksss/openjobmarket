-- Migration: Add Uber-Style Job Matching Fields to Jobs Table
-- Date: 2026-02-13
-- Description: Adds fields for 5-applicant limit job matching system with radius expansion
-- Part 1 of the Uber-style job matching implementation

-- ============================================================================
-- PART 1: ADD MATCHING STATUS COLUMN
-- ============================================================================

-- Add matching_status for trade job lifecycle (separate from existing 'status' column)
-- Values: searching (active), reviewing (5 applicants reached), closed (hired), expired (deadline passed)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS matching_status TEXT DEFAULT 'searching';

COMMENT ON COLUMN jobs.matching_status IS
  'Trade job matching lifecycle: searching (active), reviewing (5 applicants), closed (hired), expired (deadline passed)';

-- Add check constraint for valid matching_status values
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_matching_status_check;

ALTER TABLE jobs
ADD CONSTRAINT jobs_matching_status_check
CHECK (matching_status IS NULL OR matching_status IN ('searching', 'reviewing', 'closed', 'expired'));

-- ============================================================================
-- PART 2: ADD APPLICATION LIMIT FIELDS
-- ============================================================================

-- max_applications: Maximum number of applications before job stops accepting (default 5)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS max_applications INTEGER DEFAULT 5;

COMMENT ON COLUMN jobs.max_applications IS
  'Maximum number of applications for trade jobs (default 5). Job moves to "reviewing" when reached.';

-- Add check constraint for valid max_applications values (1-10)
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_max_applications_check;

ALTER TABLE jobs
ADD CONSTRAINT jobs_max_applications_check
CHECK (max_applications IS NULL OR (max_applications >= 1 AND max_applications <= 10));

-- homeowner_notified: Boolean flag for when max applications is reached
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS homeowner_notified BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN jobs.homeowner_notified IS
  'Whether the homeowner has been notified that max applications was reached';

-- ============================================================================
-- PART 3: ADD BROADCAST RADIUS FIELDS
-- ============================================================================

-- broadcast_radius: Initial radius for broadcasting job to nearby tradespeople (in miles)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS broadcast_radius DOUBLE PRECISION DEFAULT 5.0;

COMMENT ON COLUMN jobs.broadcast_radius IS
  'Initial broadcast radius in miles for trade jobs (default 5 miles)';

-- current_radius: Current expanded radius (starts same as broadcast_radius)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS current_radius DOUBLE PRECISION DEFAULT 5.0;

COMMENT ON COLUMN jobs.current_radius IS
  'Current search radius in miles (expands if not enough applicants)';

-- last_broadcast_at: Timestamp of last radius expansion/broadcast
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS last_broadcast_at TIMESTAMPTZ;

COMMENT ON COLUMN jobs.last_broadcast_at IS
  'When the job was last broadcast or radius was expanded (for timing next expansion)';

-- max_radius: Maximum radius to expand to (prevents infinite expansion)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS max_radius DOUBLE PRECISION DEFAULT 50.0;

COMMENT ON COLUMN jobs.max_radius IS
  'Maximum radius in miles for job broadcast expansion (default 50 miles)';

-- ============================================================================
-- PART 4: ADD LATITUDE/LONGITUDE FOR JOBS (for radius calculations)
-- ============================================================================

-- Job location coordinates for distance calculations
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMENT ON COLUMN jobs.latitude IS
  'Job location latitude for radius-based tradesperson matching';

COMMENT ON COLUMN jobs.longitude IS
  'Job location longitude for radius-based tradesperson matching';

-- ============================================================================
-- PART 5: MIGRATE EXISTING TRADE JOBS
-- ============================================================================

-- Set existing trade jobs to appropriate defaults
UPDATE jobs
SET
  matching_status = CASE
    WHEN status = 'open' AND is_active = true THEN 'searching'
    WHEN status = 'closed' OR is_active = false THEN 'closed'
    ELSE 'searching'
  END,
  max_applications = 5,
  broadcast_radius = 5.0,
  current_radius = 5.0,
  max_radius = 50.0,
  last_broadcast_at = created_at
WHERE is_tradespeople_job = TRUE
  AND matching_status IS NULL;

-- ============================================================================
-- PART 6: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 3959; -- Earth radius in miles
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);

  a := SIN(dlat/2) * SIN(dlat/2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon/2) * SIN(dlon/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));

  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_distance_miles IS
  'Calculates distance in miles between two lat/lon points using Haversine formula';

-- Function to check if a job can accept more applications
CREATE OR REPLACE FUNCTION can_job_accept_applications(job_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  job_record RECORD;
  current_count INTEGER;
BEGIN
  -- Get job details
  SELECT matching_status, max_applications, is_tradespeople_job, deadline_at
  INTO job_record
  FROM jobs
  WHERE id = job_id_param;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Non-trade jobs have different rules (unlimited by default)
  IF NOT job_record.is_tradespeople_job THEN
    RETURN TRUE;
  END IF;

  -- Check if job is still in searching status
  IF job_record.matching_status != 'searching' THEN
    RETURN FALSE;
  END IF;

  -- Check if deadline has passed
  IF job_record.deadline_at IS NOT NULL AND job_record.deadline_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Count current applications
  SELECT COUNT(*) INTO current_count
  FROM job_applications
  WHERE job_id = job_id_param
    AND status NOT IN ('withdrawn', 'rejected');

  -- Check if under limit
  RETURN current_count < job_record.max_applications;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_job_accept_applications IS
  'Checks if a trade job can accept more applications (under max_applications limit)';

GRANT EXECUTE ON FUNCTION can_job_accept_applications TO authenticated;

-- Function to get job matching status with details
CREATE OR REPLACE FUNCTION get_job_matching_status(job_id_param UUID)
RETURNS JSON AS $$
DECLARE
  job_record RECORD;
  current_count INTEGER;
  time_remaining INTERVAL;
BEGIN
  -- Get job details
  SELECT
    id,
    matching_status,
    max_applications,
    is_tradespeople_job,
    deadline_at,
    urgency_type,
    current_radius,
    max_radius,
    homeowner_notified
  INTO job_record
  FROM jobs
  WHERE id = job_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Job not found');
  END IF;

  -- Count current applications
  SELECT COUNT(*) INTO current_count
  FROM job_applications
  WHERE job_id = job_id_param
    AND status NOT IN ('withdrawn', 'rejected');

  -- Calculate time remaining
  IF job_record.deadline_at IS NOT NULL THEN
    time_remaining := job_record.deadline_at - NOW();
  ELSE
    time_remaining := NULL;
  END IF;

  RETURN json_build_object(
    'job_id', job_record.id,
    'matching_status', job_record.matching_status,
    'applications_count', current_count,
    'max_applications', job_record.max_applications,
    'applications_remaining', GREATEST(0, job_record.max_applications - current_count),
    'is_full', current_count >= job_record.max_applications,
    'deadline_at', job_record.deadline_at,
    'time_remaining_seconds', CASE
      WHEN time_remaining IS NOT NULL THEN EXTRACT(EPOCH FROM time_remaining)
      ELSE NULL
    END,
    'is_expired', job_record.deadline_at IS NOT NULL AND job_record.deadline_at < NOW(),
    'urgency_type', job_record.urgency_type,
    'current_radius', job_record.current_radius,
    'max_radius', job_record.max_radius,
    'homeowner_notified', job_record.homeowner_notified
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_job_matching_status IS
  'Returns detailed matching status for a trade job including application count and time remaining';

GRANT EXECUTE ON FUNCTION get_job_matching_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_matching_status TO anon;

-- ============================================================================
-- PART 7: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  new_columns_count INTEGER;
  trade_jobs_migrated INTEGER;
BEGIN
  -- Count new columns
  SELECT COUNT(*) INTO new_columns_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'jobs'
    AND column_name IN ('matching_status', 'max_applications', 'broadcast_radius',
                        'current_radius', 'last_broadcast_at', 'max_radius',
                        'homeowner_notified', 'latitude', 'longitude');

  -- Count migrated trade jobs
  SELECT COUNT(*) INTO trade_jobs_migrated
  FROM jobs
  WHERE is_tradespeople_job = TRUE
    AND matching_status IS NOT NULL;

  RAISE NOTICE '======================================';
  RAISE NOTICE 'Job Matching Fields Migration Complete';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'New columns added: % of 9 expected', new_columns_count;
  RAISE NOTICE 'Trade jobs migrated: %', trade_jobs_migrated;
  RAISE NOTICE '';
  RAISE NOTICE 'New fields:';
  RAISE NOTICE '  ✓ matching_status (searching/reviewing/closed/expired)';
  RAISE NOTICE '  ✓ max_applications (default 5)';
  RAISE NOTICE '  ✓ broadcast_radius (initial radius in miles)';
  RAISE NOTICE '  ✓ current_radius (current expanded radius)';
  RAISE NOTICE '  ✓ last_broadcast_at (timestamp for expansion timing)';
  RAISE NOTICE '  ✓ max_radius (maximum expansion limit)';
  RAISE NOTICE '  ✓ homeowner_notified (notification flag)';
  RAISE NOTICE '  ✓ latitude/longitude (job location for radius calc)';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper functions created:';
  RAISE NOTICE '  ✓ calculate_distance_miles()';
  RAISE NOTICE '  ✓ can_job_accept_applications()';
  RAISE NOTICE '  ✓ get_job_matching_status()';
  RAISE NOTICE '======================================';
END $$;
