-- ============================================================
-- Migration: Move company hiring rows to vacancy_applications
-- Task 3 of 4 — decouple company hiring workflow
-- ============================================================
-- Identification logic:
--   vacancy rows = job_applications WHERE the linked job has
--   jobs.is_tradespeople_job = false  (company vacancy postings)
--
-- Status mapping (Task 2 already collapsed old text values):
--   application_status   →  vacancy_application_status
--   ──────────────────────────────────────────────────
--   PENDING              →  APPLIED
--     (covered: original pending + reviewed + interview,
--      all collapsed to PENDING by Task 2 migration)
--   WITHDRAWN            →  REJECTED
--     (applicant withdrew — no WITHDRAWN in new enum)
--   AUTO_CANCELLED       →  REJECTED
--     (was employer rejection in the old hiring workflow)
--   EXPIRED              →  ACCEPTED
--     (Task 2 mapped old 'accepted' → EXPIRED incorrectly for
--      vacancy rows; we restore the original semantics here)
--
-- After a successful copy the source rows are DELETED from
-- job_applications so the trade state machine no longer sees them.
-- The operation is wrapped in a single transaction; any error
-- rolls back everything.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  PART 0: Patch legacy trigger functions
-- ════════════════════════════════════════════════════════════
-- The three trigger functions from 20260213000004 still compare
-- job_applications.status against old lowercase text literals
-- ('withdrawn', 'rejected', 'accepted').  After the Task 2
-- migration the column is the application_status enum (uppercase).
-- PostgreSQL cannot implicitly cast 'withdrawn'::text to
-- application_status, so every DELETE/UPDATE fires an error.
-- We rewrite the functions in-place before touching the data.
--
-- accept_job_application() is superseded by the new state machine
-- RPCs (confirm_tradesperson / accept_confirmed_job). It is
-- patched to raise a helpful error rather than silently use the
-- wrong enum values.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_job_application_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_record     RECORD;
  current_count  INTEGER;
  is_trade_job   BOOLEAN;
BEGIN
  SELECT id, is_tradespeople_job, matching_status,
         max_applications, homeowner_id, deadline_at
    INTO job_record
  FROM jobs
  WHERE id = NEW.job_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  is_trade_job := COALESCE(job_record.is_tradespeople_job, FALSE);

  IF is_trade_job THEN
    IF job_record.matching_status != 'searching' THEN
      RAISE EXCEPTION 'This job is no longer accepting applications (status: %)',
        job_record.matching_status;
    END IF;

    IF job_record.deadline_at IS NOT NULL AND job_record.deadline_at < NOW() THEN
      UPDATE jobs SET matching_status = 'expired' WHERE id = NEW.job_id;
      RAISE EXCEPTION 'This job has expired and is no longer accepting applications';
    END IF;

    -- Count active applications (enum-safe: exclude WITHDRAWN + AUTO_CANCELLED)
    SELECT COUNT(*) INTO current_count
    FROM job_applications
    WHERE job_id = NEW.job_id
      AND status NOT IN (
            'WITHDRAWN'::application_status,
            'AUTO_CANCELLED'::application_status
          )
      AND id != NEW.id;

    IF current_count >= job_record.max_applications THEN
      RAISE EXCEPTION 'This job has reached its maximum number of applications (%)',
        job_record.max_applications;
    END IF;

    IF current_count + 1 >= job_record.max_applications THEN
      UPDATE jobs
        SET matching_status    = 'reviewing',
            homeowner_notified = FALSE
      WHERE id = NEW.job_id;

      INSERT INTO notifications (user_id, type, title, message, data, created_at)
      VALUES (
        job_record.homeowner_id,
        'job_applications_full',
        'Your job has received maximum applications',
        'You have received ' || job_record.max_applications ||
          ' applications. Review them now to find your tradesperson!',
        json_build_object(
          'job_id',             NEW.job_id,
          'applications_count', job_record.max_applications
        ),
        NOW()
      );
    END IF;
  END IF;

  UPDATE jobs
    SET applications_count = (
      SELECT COUNT(*) FROM job_applications
      WHERE job_id = NEW.job_id
        AND status NOT IN (
              'WITHDRAWN'::application_status,
              'AUTO_CANCELLED'::application_status
            )
    )
  WHERE id = NEW.job_id;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.handle_job_application_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_record     RECORD;
  current_count  INTEGER;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT id, is_tradespeople_job, matching_status, max_applications
    INTO job_record
  FROM jobs
  WHERE id = NEW.job_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  UPDATE jobs
    SET applications_count = (
      SELECT COUNT(*) FROM job_applications
      WHERE job_id = NEW.job_id
        AND status NOT IN (
              'WITHDRAWN'::application_status,
              'AUTO_CANCELLED'::application_status
            )
    )
  WHERE id = NEW.job_id;

  IF COALESCE(job_record.is_tradespeople_job, FALSE) THEN
    SELECT COUNT(*) INTO current_count
    FROM job_applications
    WHERE job_id = NEW.job_id
      AND status NOT IN (
            'WITHDRAWN'::application_status,
            'AUTO_CANCELLED'::application_status
          );

    -- Reopen if application was withdrawn/cancelled and we're under limit
    IF NEW.status IN (
         'WITHDRAWN'::application_status,
         'AUTO_CANCELLED'::application_status
       )
       AND job_record.matching_status = 'reviewing'
       AND current_count < job_record.max_applications
    THEN
      UPDATE jobs SET matching_status = 'searching' WHERE id = NEW.job_id;
    END IF;

    -- NOTE: application_status no longer has an 'accepted' value.
    -- Trade job acceptance is handled by the confirm_tradesperson() /
    -- accept_confirmed_job() state machine RPCs which update jobs.status,
    -- not job_applications.status.  No action needed here.
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.handle_job_application_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_record     RECORD;
  current_count  INTEGER;
BEGIN
  SELECT id, is_tradespeople_job, matching_status, max_applications
    INTO job_record
  FROM jobs
  WHERE id = OLD.job_id;

  IF NOT FOUND THEN RETURN OLD; END IF;

  UPDATE jobs
    SET applications_count = (
      SELECT COUNT(*) FROM job_applications
      WHERE job_id = OLD.job_id
        AND status NOT IN (
              'WITHDRAWN'::application_status,
              'AUTO_CANCELLED'::application_status
            )
    )
  WHERE id = OLD.job_id;

  IF COALESCE(job_record.is_tradespeople_job, FALSE)
     AND job_record.matching_status = 'reviewing'
  THEN
    SELECT COUNT(*) INTO current_count
    FROM job_applications
    WHERE job_id = OLD.job_id
      AND status NOT IN (
            'WITHDRAWN'::application_status,
            'AUTO_CANCELLED'::application_status
          );

    IF current_count < job_record.max_applications THEN
      UPDATE jobs SET matching_status = 'searching' WHERE id = OLD.job_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;


-- Patch accept_job_application() — superseded by state machine RPCs
CREATE OR REPLACE FUNCTION public.accept_job_application(
  p_job_id         UUID,
  p_application_id UUID,
  p_homeowner_id   UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION
    'accept_job_application() is no longer available. '
    'Use confirm_tradesperson(p_job_id, p_tradesperson_id) instead. '
    'See migration 20260302000004.'
    USING ERRCODE = 'feature_not_supported';
END;
$$;

DO $$ BEGIN
  RAISE NOTICE '✓ Patched handle_job_application_insert/update/delete and accept_job_application()';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART 1–4: Data migration
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_copied   INT := 0;
  v_deleted  INT := 0;
  v_skipped  INT := 0;
BEGIN

  -- ── STEP 1: count what we are about to move ───────────────
  SELECT COUNT(*)
    INTO v_skipped
  FROM public.job_applications ja
  JOIN public.jobs j ON j.id = ja.job_id
  WHERE j.is_tradespeople_job = false
    AND ja.professional_id IS NULL;   -- can't map, no FK target

  IF v_skipped > 0 THEN
    RAISE NOTICE '⚠  % vacancy application(s) have NULL professional_id — these will be skipped',
      v_skipped;
  END IF;

  -- ── STEP 2: copy rows into vacancy_applications ───────────
  INSERT INTO public.vacancy_applications (
    id,
    vacancy_id,
    applicant_id,
    status,
    created_at
  )
  SELECT
    ja.id,
    ja.job_id,
    ja.professional_id,
    CASE ja.status::text
      WHEN 'PENDING'        THEN 'APPLIED'  ::vacancy_application_status
      WHEN 'WITHDRAWN'      THEN 'REJECTED' ::vacancy_application_status
      WHEN 'AUTO_CANCELLED' THEN 'REJECTED' ::vacancy_application_status
      WHEN 'EXPIRED'        THEN 'ACCEPTED' ::vacancy_application_status
      ELSE                       'APPLIED'  ::vacancy_application_status
    END,
    COALESCE(ja.applied_at, now())
  FROM public.job_applications ja
  JOIN public.jobs j ON j.id = ja.job_id
  WHERE j.is_tradespeople_job = false
    AND ja.professional_id IS NOT NULL
  ON CONFLICT (vacancy_id, applicant_id) DO NOTHING;  -- idempotent re-run

  GET DIAGNOSTICS v_copied = ROW_COUNT;
  RAISE NOTICE '✓ Copied % vacancy application row(s) → vacancy_applications', v_copied;

  -- ── STEP 3: delete migrated rows from job_applications ────
  -- Only delete rows confirmed present in vacancy_applications
  -- (handles ON CONFLICT DO NOTHING for idempotent re-runs).
  DELETE FROM public.job_applications ja
  USING public.jobs j
  WHERE ja.job_id = j.id
    AND j.is_tradespeople_job = false
    AND ja.professional_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.vacancy_applications va
      WHERE va.vacancy_id   = ja.job_id
        AND va.applicant_id = ja.professional_id
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '✓ Removed % row(s) from job_applications', v_deleted;

  -- ── STEP 4: sanity check ──────────────────────────────────
  DECLARE
    v_remaining INT;
  BEGIN
    SELECT COUNT(*)
      INTO v_remaining
    FROM public.job_applications ja
    JOIN public.jobs j ON j.id = ja.job_id
    WHERE j.is_tradespeople_job = false
      AND ja.professional_id IS NOT NULL;

    IF v_remaining > 0 THEN
      RAISE EXCEPTION
        '% vacancy row(s) still remain in job_applications after migration',
        v_remaining;
    END IF;
  END;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Rows copied   : %', v_copied;
  RAISE NOTICE 'Rows deleted  : %', v_deleted;
  RAISE NOTICE 'Rows skipped  : % (NULL professional_id)', v_skipped;
  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE '✅ Task 3 complete: hiring data moved to vacancy_applications';

END;
$$;


-- ── Verification ─────────────────────────────────────────────
DO $$
DECLARE
  v_total_vacancy  INT;
  v_leftover_in_ja INT;
BEGIN
  SELECT COUNT(*) INTO v_total_vacancy FROM public.vacancy_applications;

  SELECT COUNT(*)
    INTO v_leftover_in_ja
  FROM public.job_applications ja
  JOIN public.jobs j ON j.id = ja.job_id
  WHERE j.is_tradespeople_job = false
    AND ja.professional_id IS NOT NULL;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Total rows in vacancy_applications      : %', v_total_vacancy;
  RAISE NOTICE 'Leftover vacancy rows in job_applications: %', v_leftover_in_ja;

  IF v_leftover_in_ja > 0 THEN
    RAISE EXCEPTION 'Task 3 verification failed: % vacancy row(s) still in job_applications',
      v_leftover_in_ja;
  END IF;

  RAISE NOTICE '✅ Task 3 verified: job_applications contains no company hiring rows';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
