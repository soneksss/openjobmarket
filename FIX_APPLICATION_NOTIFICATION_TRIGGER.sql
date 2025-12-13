-- =============================================================================
-- FIX: Update queue_application_notification to use correct notification type
-- =============================================================================
-- This fixes the "column email_new_applications does not exist" error
-- by updating the trigger function to use the correct notification preference
-- column name: 'vacancy_response' instead of 'new_applications'
-- =============================================================================

-- Drop and recreate the function with the correct notification type
CREATE OR REPLACE FUNCTION public.queue_application_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  job_record RECORD;
  company_user_id UUID;
  subject_text TEXT;
  content_text TEXT;
  template_data JSONB;
BEGIN
  -- Get job and company details
  SELECT j.*, cp.user_id as company_user_id, cp.company_name
  INTO job_record
  FROM jobs j
  JOIN company_profiles cp ON j.company_id = cp.id
  WHERE j.id = NEW.job_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Prepare notification content
  subject_text := 'New application for "' || job_record.title || '"';
  content_text := 'You have received a new application for your job posting "' || job_record.title || '".';

  template_data := jsonb_build_object(
    'job_id', job_record.id,
    'job_title', job_record.title,
    'application_id', NEW.id,
    'company_name', job_record.company_name,
    'view_url', '/dashboard/company/applications'
  );

  -- Queue email notification
  -- FIXED: Changed 'new_applications' to 'vacancy_response' to match notification_preferences.email_vacancy_response
  PERFORM queue_notification(
    job_record.company_user_id,
    'vacancy_response',  -- ✅ This matches email_vacancy_response and phone_vacancy_response columns
    'email',
    subject_text,
    content_text,
    template_data
  );

  -- Queue phone/SMS notification
  -- FIXED: Changed from 'push' to 'phone' since notification_preferences only has email_* and phone_* columns (no push_* columns)
  PERFORM queue_notification(
    job_record.company_user_id,
    'vacancy_response',  -- ✅ This matches email_vacancy_response and phone_vacancy_response columns
    'phone',  -- ✅ Changed from 'push' to 'phone'
    subject_text,
    'New application received',
    template_data
  );

  RETURN NEW;
END;
$function$;

-- =============================================================================
-- Verification: Test that the fix works
-- =============================================================================
-- After running the above, you can test by submitting a job application
-- It should now work without the "email_new_applications" error
