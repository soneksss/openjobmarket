-- ============================================================
-- Migration: Fix job_application trigger enum + dispatch alerts RLS
-- ============================================================
-- Problem 1: handle_job_application_insert still uses lowercase
--   status NOT IN ('withdrawn', 'rejected')
--   After enum migration, valid values are uppercase (WITHDRAWN etc).
--   PostgreSQL fails to cast 'withdrawn' → INSERT into job_applications
--   throws invalid_input_value → apply_to_job returns 500.
--
-- Problem 2: urgent_job_dispatch_alerts has no SELECT policy for
--   authenticated users. GET /api/jobs/[id]/urgent-responses reads
--   it with the user client → always gets count=0 → live page shows
--   "No cleaners available" after 20 s even when trades were notified.
-- ============================================================


-- ── FIX 1: Rebuild INSERT trigger with uppercase enum values ──

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

    -- Use uppercase enum values (WITHDRAWN, AUTO_CANCELLED, EXPIRED)
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
    SELECT COUNT(*) INTO current_count
      FROM job_applications
     WHERE job_id = NEW.job_id
       AND status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED');

    UPDATE jobs SET applications_count = current_count + 1 WHERE id = NEW.job_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── FIX 2: Also fix UPDATE and DELETE triggers while we're here ──

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

  SELECT COUNT(*) INTO current_count
    FROM job_applications
   WHERE job_id = NEW.job_id
     AND status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED');

  UPDATE jobs SET applications_count = current_count WHERE id = NEW.job_id;

  IF COALESCE(job_record.is_tradespeople_job, FALSE) THEN
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


-- ── FIX 3: Add RLS SELECT for job owners on dispatch alerts ──
-- Allows homeowners/companies to see how many trades were notified
-- for their own job. The GET /api/jobs/[id]/urgent-responses route
-- needs this (or would have to use service_role for every poll).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.urgent_job_dispatch_alerts'::regclass
      AND polname = 'job_owner_can_read_own_dispatch_alerts'
  ) THEN
    EXECUTE $p$
      CREATE POLICY job_owner_can_read_own_dispatch_alerts
        ON public.urgent_job_dispatch_alerts
        FOR SELECT
        USING (
          job_id IN (
            SELECT id FROM jobs
            WHERE company_id   IN (SELECT id FROM company_profiles   WHERE user_id = auth.uid())
               OR homeowner_id IN (SELECT id FROM homeowner_profiles WHERE user_id = auth.uid())
          )
        )
    $p$;
    RAISE NOTICE '✓ RLS SELECT policy added to urgent_job_dispatch_alerts';
  ELSE
    RAISE NOTICE '✓ Policy already exists — skipped';
  END IF;
END $$;


DO $$ BEGIN
  RAISE NOTICE '✓ job_application trigger functions fixed (uppercase enum values)';
  RAISE NOTICE '✓ urgent_job_dispatch_alerts RLS updated';
END $$;
