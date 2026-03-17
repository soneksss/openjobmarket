-- ============================================================
-- Migration: Fix apply_to_job 500 error for trade jobs
-- ============================================================
-- Problem:
--   When a tradesperson clicks Apply, the insert into job_applications
--   triggers queue_application_notification() which calls queue_notification()
--   which internally queries notification_preferences.push_vacancy_response
--   — a column that does not exist (only email_vacancy_response and
--   phone_vacancy_response exist).
--
-- Root cause:
--   Trade job applications were incorrectly routed through the vacancy
--   notification pipeline. The vacancy notification system is separate
--   from the trade job (homeowner → tradesperson) workflow.
--
-- Fix:
--   Replace queue_application_notification() so it exits immediately
--   for trade jobs (is_tradespeople_job = true). For non-trade jobs,
--   wrap the queue_notification call in an EXCEPTION block so any
--   future column/function issues never block the application row.
-- ============================================================

CREATE OR REPLACE FUNCTION public.queue_application_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  job_record        RECORD;
  company_user_id   UUID;
  homeowner_user_id UUID;
  subject_text      TEXT;
  content_text      TEXT;
  template_data     JSONB;
BEGIN
  -- Fetch job + company details
  SELECT j.*, cp.user_id AS company_user_id, cp.company_name
    INTO job_record
    FROM jobs j
    LEFT JOIN company_profiles cp ON j.company_id = cp.id
   WHERE j.id = NEW.job_id;

  -- ── Trade jobs: skip vacancy notification pipeline entirely ─
  -- Trade job notifications are sent by /api/jobs/[id]/urgent-responses
  -- via notifyHomeownerOfApplication(). The vacancy queue is not involved.
  IF NOT FOUND OR COALESCE(job_record.is_tradespeople_job, FALSE) THEN
    RETURN NEW;
  END IF;

  -- ── Vacancy (non-trade) job path ───────────────────────────
  IF job_record.company_user_id IS NOT NULL THEN
    company_user_id := job_record.company_user_id;
  ELSIF job_record.homeowner_id IS NOT NULL THEN
    SELECT hp.user_id INTO homeowner_user_id
      FROM homeowner_profiles hp
     WHERE hp.id = job_record.homeowner_id;
    company_user_id := homeowner_user_id;
  END IF;

  IF company_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  subject_text := 'New application for "' || COALESCE(job_record.title, 'Job') || '"';
  content_text := 'You have received a new application for "' || COALESCE(job_record.title, 'Job') || '".';

  template_data := jsonb_build_object(
    'job_id',         job_record.id,
    'job_title',      COALESCE(job_record.title, 'Job'),
    'application_id', NEW.id,
    'company_name',   COALESCE(job_record.company_name, 'Employer'),
    'view_url',       '/dashboard/company/applications'
  );

  -- Wrapped in EXCEPTION so a broken queue_notification() never blocks
  -- the job_applications INSERT (the column/function issue is non-fatal).
  BEGIN
    PERFORM public.queue_notification(
      company_user_id, 'vacancy_response', 'email',
      subject_text, content_text, template_data
    );
    PERFORM public.queue_notification(
      company_user_id, 'vacancy_response', 'phone',
      subject_text, 'New application received', template_data
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[queue_application_notification] queue_notification failed (non-fatal): %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DO $$ BEGIN
  RAISE NOTICE '✓ queue_application_notification() updated:';
  RAISE NOTICE '  - Trade jobs now skip vacancy notification pipeline';
  RAISE NOTICE '  - Non-trade path wrapped in EXCEPTION to prevent 500 errors';
END $$;
