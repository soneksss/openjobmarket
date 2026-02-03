-- =============================================================================
-- Migration: Fix queue_application_notification to use valid channel values
-- Date: 2026-02-03
-- Purpose: Fix the "notification_queue_channel_check" constraint violation
-- =============================================================================
-- The trigger function was using 'phone' as a channel, but the notification_queue
-- table only allows 'email' and 'push' as valid channels. This fixes the trigger
-- to use 'push' instead of 'phone'.
-- =============================================================================

-- First, let's check what valid channels exist in the constraint
-- (Uncomment to run and see the current constraint definition)
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'notification_queue_channel_check';

-- Fix the queue_application_notification function to use 'push' instead of 'phone'
CREATE OR REPLACE FUNCTION public.queue_application_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  job_record RECORD;
  company_user_id UUID;
  homeowner_user_id UUID;
  subject_text TEXT;
  content_text TEXT;
  template_data JSONB;
BEGIN
  -- First, try to get job with company details (regular jobs/vacancies)
  SELECT j.*, cp.user_id as company_user_id, cp.company_name
  INTO job_record
  FROM jobs j
  LEFT JOIN company_profiles cp ON j.company_id = cp.id
  WHERE j.id = NEW.job_id;

  -- If it's a homeowner job (trade job), get homeowner details
  IF job_record.company_user_id IS NULL AND job_record.homeowner_id IS NOT NULL THEN
    SELECT hp.user_id
    INTO homeowner_user_id
    FROM homeowner_profiles hp
    WHERE hp.id = job_record.homeowner_id;
  END IF;

  -- Determine the target user (company or homeowner)
  IF job_record.company_user_id IS NOT NULL THEN
    company_user_id := job_record.company_user_id;
  ELSIF homeowner_user_id IS NOT NULL THEN
    company_user_id := homeowner_user_id;
  ELSE
    -- No target user found, skip notification
    RETURN NEW;
  END IF;

  -- Prepare notification content
  subject_text := 'New application for "' || COALESCE(job_record.title, 'Job') || '"';
  content_text := 'You have received a new application for your job posting "' || COALESCE(job_record.title, 'Job') || '".';

  template_data := jsonb_build_object(
    'job_id', job_record.id,
    'job_title', COALESCE(job_record.title, 'Job'),
    'application_id', NEW.id,
    'company_name', COALESCE(job_record.company_name, 'Employer'),
    'view_url', '/dashboard/company/applications'
  );

  -- Queue email notification
  -- Using 'vacancy_response' which matches email_vacancy_response and phone_vacancy_response columns
  PERFORM queue_notification(
    company_user_id,
    'vacancy_response',
    'email',  -- Valid channel
    subject_text,
    content_text,
    template_data
  );

  -- Queue push notification (changed from 'phone' to 'push' to match constraint)
  PERFORM queue_notification(
    company_user_id,
    'vacancy_response',
    'push',  -- FIXED: Changed from 'phone' to 'push' - matches notification_queue_channel_check constraint
    subject_text,
    'New application received',
    template_data
  );

  RETURN NEW;
END;
$function$;

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed queue_application_notification function:';
  RAISE NOTICE '  - Changed channel from "phone" to "push"';
  RAISE NOTICE '  - Added support for homeowner jobs';
  RAISE NOTICE '  - Fixed potential NULL title handling';
  RAISE NOTICE '========================================';
END $$;
