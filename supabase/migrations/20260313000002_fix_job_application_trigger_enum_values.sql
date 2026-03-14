-- ============================================================
-- Migration: Fix job_application trigger functions for new enum
-- ============================================================
-- Problems fixed:
--   1. Old statuses ('withdrawn','rejected') removed — not valid
--      in the new application_status enum.
--   2. Removed unnecessary ::text casts — compare enum directly.
--   3. max_applications guarded against NULL.
--   4. current_count reused for applications_count UPDATE
--      instead of a second COUNT query.
-- ============================================================


-- ── INSERT trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_job_application_insert()
RETURNS TRIGGER AS $$
DECLARE
  job_record    RECORD;
  current_count INTEGER;
BEGIN
  SELECT id, is_tradespeople_job, matching_status, max_applications,
         homeowner_id, deadline_at
    INTO job_record
    FROM jobs
   WHERE id = NEW.job_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  IF COALESCE(job_record.is_tradespeople_job, FALSE) THEN

    IF job_record.matching_status != 'searching' THEN
      RAISE EXCEPTION 'This job is no longer accepting applications (status: %)',
        job_record.matching_status;
    END IF;

    IF job_record.deadline_at IS NOT NULL AND job_record.deadline_at < NOW() THEN
      UPDATE jobs SET matching_status = 'expired' WHERE id = NEW.job_id;
      RAISE EXCEPTION 'This job has expired and is no longer accepting applications';
    END IF;

    SELECT COUNT(*) INTO current_count
      FROM job_applications
     WHERE job_id = NEW.job_id
       AND status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED')
       AND id != NEW.id;

    IF job_record.max_applications IS NOT NULL
       AND current_count >= job_record.max_applications THEN
      RAISE EXCEPTION 'This job has reached its maximum number of applications (%)',
        job_record.max_applications;
    END IF;

    -- Reuse current_count (+1 for this new application) for the jobs update
    UPDATE jobs
       SET applications_count = current_count + 1,
           matching_status    = CASE
             WHEN job_record.max_applications IS NOT NULL
               AND current_count + 1 >= job_record.max_applications
             THEN 'reviewing'
             ELSE matching_status
           END,
           homeowner_notified = CASE
             WHEN job_record.max_applications IS NOT NULL
               AND current_count + 1 >= job_record.max_applications
             THEN FALSE
             ELSE homeowner_notified
           END
     WHERE id = NEW.job_id;

  ELSE
    -- Non-trade job: just keep applications_count in sync
    SELECT COUNT(*) INTO current_count
      FROM job_applications
     WHERE job_id = NEW.job_id
       AND status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED');

    UPDATE jobs SET applications_count = current_count + 1 WHERE id = NEW.job_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── UPDATE trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_job_application_update()
RETURNS TRIGGER AS $$
DECLARE
  job_record    RECORD;
  current_count INTEGER;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT id, is_tradespeople_job, matching_status, max_applications
    INTO job_record
    FROM jobs
   WHERE id = NEW.job_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Count active applications (reused for both the UPDATE and the reopen check)
  SELECT COUNT(*) INTO current_count
    FROM job_applications
   WHERE job_id = NEW.job_id
     AND status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED');

  UPDATE jobs SET applications_count = current_count WHERE id = NEW.job_id;

  IF COALESCE(job_record.is_tradespeople_job, FALSE) THEN
    -- If a slot opened up and we were at the limit, reopen for applications
    IF NEW.status IN ('WITHDRAWN', 'AUTO_CANCELLED')
       AND job_record.matching_status = 'reviewing'
       AND (job_record.max_applications IS NULL
            OR current_count < job_record.max_applications) THEN
      UPDATE jobs SET matching_status = 'searching' WHERE id = NEW.job_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── DELETE trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_job_application_delete()
RETURNS TRIGGER AS $$
DECLARE
  job_record    RECORD;
  current_count INTEGER;
BEGIN
  SELECT id, is_tradespeople_job, matching_status, max_applications
    INTO job_record
    FROM jobs
   WHERE id = OLD.job_id;

  IF NOT FOUND THEN RETURN OLD; END IF;

  SELECT COUNT(*) INTO current_count
    FROM job_applications
   WHERE job_id = OLD.job_id
     AND status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED');

  UPDATE jobs SET applications_count = current_count WHERE id = OLD.job_id;

  IF COALESCE(job_record.is_tradespeople_job, FALSE)
     AND job_record.matching_status = 'reviewing'
     AND (job_record.max_applications IS NULL
          OR current_count < job_record.max_applications) THEN
    UPDATE jobs SET matching_status = 'searching' WHERE id = OLD.job_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DO $$ BEGIN
  RAISE NOTICE '✓ job_application trigger functions fixed for new application_status enum';
END; $$;
