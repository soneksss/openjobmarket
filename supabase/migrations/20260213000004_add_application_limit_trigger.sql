-- Migration: Add Application Limit Trigger for Trade Jobs
-- Date: 2026-02-13
-- Description: Trigger that enforces 5-applicant limit and updates job matching status
-- Part 2 of the Uber-style job matching implementation

-- ============================================================================
-- PART 1: CREATE TRIGGER FUNCTION FOR APPLICATION INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_job_application_insert()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  current_count INTEGER;
  is_trade_job BOOLEAN;
BEGIN
  -- Get job details
  SELECT
    id,
    is_tradespeople_job,
    matching_status,
    max_applications,
    homeowner_id,
    deadline_at
  INTO job_record
  FROM jobs
  WHERE id = NEW.job_id;

  -- If job not found, allow the insert but don't do anything special
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  is_trade_job := COALESCE(job_record.is_tradespeople_job, FALSE);

  -- For trade jobs, enforce the application limit
  IF is_trade_job THEN
    -- Check if job is still accepting applications
    IF job_record.matching_status != 'searching' THEN
      RAISE EXCEPTION 'This job is no longer accepting applications (status: %)', job_record.matching_status;
    END IF;

    -- Check if deadline has passed
    IF job_record.deadline_at IS NOT NULL AND job_record.deadline_at < NOW() THEN
      -- Update job status to expired
      UPDATE jobs
      SET matching_status = 'expired'
      WHERE id = NEW.job_id;

      RAISE EXCEPTION 'This job has expired and is no longer accepting applications';
    END IF;

    -- Count current valid applications (excluding withdrawn/rejected)
    SELECT COUNT(*) INTO current_count
    FROM job_applications
    WHERE job_id = NEW.job_id
      AND status NOT IN ('withdrawn', 'rejected')
      AND id != NEW.id; -- Exclude the current insert

    -- Check if we've reached the limit
    IF current_count >= job_record.max_applications THEN
      RAISE EXCEPTION 'This job has reached its maximum number of applications (%)' , job_record.max_applications;
    END IF;

    -- If this application brings us to the limit, update job status
    IF current_count + 1 >= job_record.max_applications THEN
      UPDATE jobs
      SET
        matching_status = 'reviewing',
        homeowner_notified = FALSE -- Will be set to TRUE when notification is sent
      WHERE id = NEW.job_id;

      -- Insert notification for homeowner
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        created_at
      ) VALUES (
        job_record.homeowner_id,
        'job_applications_full',
        'Your job has received maximum applications',
        'You have received ' || job_record.max_applications || ' applications. Review them now to find your tradesperson!',
        json_build_object(
          'job_id', NEW.job_id,
          'applications_count', job_record.max_applications
        ),
        NOW()
      );
    END IF;
  END IF;

  -- Update applications_count on the job
  UPDATE jobs
  SET applications_count = (
    SELECT COUNT(*)
    FROM job_applications
    WHERE job_id = NEW.job_id
      AND status NOT IN ('withdrawn', 'rejected')
  )
  WHERE id = NEW.job_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_job_application_insert IS
  'Trigger function that enforces application limits for trade jobs and updates matching status';

-- ============================================================================
-- PART 2: CREATE TRIGGER FOR APPLICATION STATUS CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_job_application_update()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  current_count INTEGER;
BEGIN
  -- Only handle status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get job details
  SELECT
    id,
    is_tradespeople_job,
    matching_status,
    max_applications
  INTO job_record
  FROM jobs
  WHERE id = NEW.job_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Update applications_count
  UPDATE jobs
  SET applications_count = (
    SELECT COUNT(*)
    FROM job_applications
    WHERE job_id = NEW.job_id
      AND status NOT IN ('withdrawn', 'rejected')
  )
  WHERE id = NEW.job_id;

  -- For trade jobs, check if we need to reopen for applications
  IF COALESCE(job_record.is_tradespeople_job, FALSE) THEN
    -- Count current valid applications
    SELECT COUNT(*) INTO current_count
    FROM job_applications
    WHERE job_id = NEW.job_id
      AND status NOT IN ('withdrawn', 'rejected');

    -- If application was withdrawn/rejected and we're under limit, reopen
    IF NEW.status IN ('withdrawn', 'rejected') AND job_record.matching_status = 'reviewing' THEN
      IF current_count < job_record.max_applications THEN
        UPDATE jobs
        SET matching_status = 'searching'
        WHERE id = NEW.job_id;
      END IF;
    END IF;

    -- If application was accepted, close the job
    IF NEW.status = 'accepted' THEN
      UPDATE jobs
      SET matching_status = 'closed'
      WHERE id = NEW.job_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_job_application_update IS
  'Trigger function that handles application status changes and updates job matching status';

-- ============================================================================
-- PART 3: CREATE TRIGGER FOR APPLICATION DELETE
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_job_application_delete()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  current_count INTEGER;
BEGIN
  -- Get job details
  SELECT
    id,
    is_tradespeople_job,
    matching_status,
    max_applications
  INTO job_record
  FROM jobs
  WHERE id = OLD.job_id;

  IF NOT FOUND THEN
    RETURN OLD;
  END IF;

  -- Update applications_count
  UPDATE jobs
  SET applications_count = (
    SELECT COUNT(*)
    FROM job_applications
    WHERE job_id = OLD.job_id
      AND status NOT IN ('withdrawn', 'rejected')
  )
  WHERE id = OLD.job_id;

  -- For trade jobs, check if we should reopen for applications
  IF COALESCE(job_record.is_tradespeople_job, FALSE) AND job_record.matching_status = 'reviewing' THEN
    SELECT COUNT(*) INTO current_count
    FROM job_applications
    WHERE job_id = OLD.job_id
      AND status NOT IN ('withdrawn', 'rejected');

    IF current_count < job_record.max_applications THEN
      UPDATE jobs
      SET matching_status = 'searching'
      WHERE id = OLD.job_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_job_application_delete IS
  'Trigger function that handles application deletion and updates job matching status';

-- ============================================================================
-- PART 4: CREATE/REPLACE TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_job_application_insert ON job_applications;
DROP TRIGGER IF EXISTS trigger_job_application_update ON job_applications;
DROP TRIGGER IF EXISTS trigger_job_application_delete ON job_applications;

-- Create insert trigger
CREATE TRIGGER trigger_job_application_insert
  BEFORE INSERT ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_job_application_insert();

-- Create update trigger
CREATE TRIGGER trigger_job_application_update
  AFTER UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_job_application_update();

-- Create delete trigger
CREATE TRIGGER trigger_job_application_delete
  AFTER DELETE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_job_application_delete();

-- ============================================================================
-- PART 5: CREATE FUNCTION TO EXPIRE JOBS
-- ============================================================================

-- Function to expire jobs that have passed their deadline
CREATE OR REPLACE FUNCTION expire_overdue_jobs()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE jobs
  SET matching_status = 'expired'
  WHERE is_tradespeople_job = TRUE
    AND matching_status = 'searching'
    AND deadline_at IS NOT NULL
    AND deadline_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_overdue_jobs IS
  'Expires trade jobs that have passed their deadline. Should be called by a cron job.';

-- ============================================================================
-- PART 6: CREATE FUNCTION FOR HOMEOWNER TO ACCEPT/CLOSE JOB
-- ============================================================================

-- Function for homeowner to accept an applicant and close the job
CREATE OR REPLACE FUNCTION accept_job_application(
  p_job_id UUID,
  p_application_id UUID,
  p_homeowner_id UUID
)
RETURNS JSON AS $$
DECLARE
  job_record RECORD;
  application_record RECORD;
BEGIN
  -- Get job and verify ownership
  SELECT id, homeowner_id, matching_status, is_tradespeople_job
  INTO job_record
  FROM jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Job not found');
  END IF;

  IF job_record.homeowner_id != p_homeowner_id THEN
    RETURN json_build_object('success', FALSE, 'error', 'Not authorized to manage this job');
  END IF;

  IF NOT job_record.is_tradespeople_job THEN
    RETURN json_build_object('success', FALSE, 'error', 'This function is only for trade jobs');
  END IF;

  -- Get application
  SELECT id, user_id, status
  INTO application_record
  FROM job_applications
  WHERE id = p_application_id AND job_id = p_job_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Application not found');
  END IF;

  IF application_record.status NOT IN ('pending', 'shortlisted') THEN
    RETURN json_build_object('success', FALSE, 'error', 'Application cannot be accepted (status: ' || application_record.status || ')');
  END IF;

  -- Accept the application
  UPDATE job_applications
  SET status = 'accepted'
  WHERE id = p_application_id;

  -- Reject other applications
  UPDATE job_applications
  SET status = 'rejected'
  WHERE job_id = p_job_id
    AND id != p_application_id
    AND status NOT IN ('withdrawn', 'rejected');

  -- Close the job
  UPDATE jobs
  SET matching_status = 'closed'
  WHERE id = p_job_id;

  -- Notify the accepted applicant
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    created_at
  ) VALUES (
    application_record.user_id,
    'application_accepted',
    'Your application was accepted!',
    'Great news! The homeowner has accepted your application. You can now start the job.',
    json_build_object(
      'job_id', p_job_id,
      'application_id', p_application_id
    ),
    NOW()
  );

  RETURN json_build_object(
    'success', TRUE,
    'message', 'Application accepted and job closed',
    'accepted_application_id', p_application_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_job_application IS
  'Accepts an application for a trade job, rejects others, and closes the job';

GRANT EXECUTE ON FUNCTION accept_job_application TO authenticated;

-- ============================================================================
-- PART 7: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Count triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'job_applications'
    AND t.tgname LIKE 'trigger_job_application_%';

  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'handle_job_application_insert',
    'handle_job_application_update',
    'handle_job_application_delete',
    'expire_overdue_jobs',
    'accept_job_application'
  );

  RAISE NOTICE '======================================';
  RAISE NOTICE 'Application Limit Trigger Migration Complete';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Triggers created: % of 3 expected', trigger_count;
  RAISE NOTICE 'Functions created: % of 5 expected', function_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers:';
  RAISE NOTICE '  ✓ trigger_job_application_insert (enforces limit)';
  RAISE NOTICE '  ✓ trigger_job_application_update (handles status changes)';
  RAISE NOTICE '  ✓ trigger_job_application_delete (reopens if under limit)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  ✓ handle_job_application_insert()';
  RAISE NOTICE '  ✓ handle_job_application_update()';
  RAISE NOTICE '  ✓ handle_job_application_delete()';
  RAISE NOTICE '  ✓ expire_overdue_jobs()';
  RAISE NOTICE '  ✓ accept_job_application()';
  RAISE NOTICE '======================================';
END $$;
