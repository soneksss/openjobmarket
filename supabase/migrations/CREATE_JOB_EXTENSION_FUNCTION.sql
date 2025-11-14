-- Create the missing extend_job RPC function
-- This function extends a job posting by updating its expiration date

CREATE OR REPLACE FUNCTION public.extend_job(
  job_id_param UUID,
  new_timeline TEXT,
  new_price NUMERIC DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  days_to_add INTEGER;
  new_expiration TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Convert timeline to days
  days_to_add := CASE new_timeline
    WHEN '3_days' THEN 3
    WHEN '7_days' THEN 7
    WHEN '2_weeks' THEN 14
    WHEN '3_weeks' THEN 21
    WHEN '4_weeks' THEN 28
    ELSE 7 -- Default to 7 days if unknown timeline
  END;

  -- Calculate new expiration date from NOW (not from old expiration)
  new_expiration := NOW() + (days_to_add || ' days')::INTERVAL;

  -- Update the job with new expiration and ensure it's active
  UPDATE public.jobs
  SET
    expires_at = new_expiration,
    is_active = true,
    updated_at = NOW(),
    recruitment_timeline = new_timeline,
    price = new_price
  WHERE id = job_id_param;

  -- Check if update was successful
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.extend_job(UUID, TEXT, NUMERIC) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.extend_job IS 'Extends a job posting by updating its expiration date and ensuring it is active';

-- ============================================================================
-- Create process_job_expirations function
-- This function automatically marks expired jobs as inactive
-- ============================================================================

-- Drop existing function first (may have different return type)
DROP FUNCTION IF EXISTS public.process_job_expirations();

CREATE OR REPLACE FUNCTION public.process_job_expirations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
  expiring_jobs JSON;
  result JSON;
BEGIN
  -- Mark expired jobs as inactive
  UPDATE public.jobs
  SET is_active = false
  WHERE expires_at < NOW()
    AND is_active = true;

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Get jobs expiring in the next 3 days (for notifications)
  SELECT json_agg(
    json_build_object(
      'job_id', j.id,
      'title', j.title,
      'company_name', cp.company_name,
      'user_id', cp.user_id,
      'expires_at', j.expires_at,
      'days_until_expiration', EXTRACT(DAY FROM (j.expires_at - NOW()))
    )
  )
  INTO expiring_jobs
  FROM public.jobs j
  INNER JOIN public.company_profiles cp ON j.company_id = cp.id
  WHERE j.is_active = true
    AND j.expires_at > NOW()
    AND j.expires_at < NOW() + INTERVAL '3 days';

  -- Build result JSON
  result := json_build_object(
    'expired_count', expired_count,
    'expiring_jobs', COALESCE(expiring_jobs, '[]'::json),
    'processed_at', NOW()
  );

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_job_expirations() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.process_job_expirations IS 'Marks expired jobs as inactive and returns jobs expiring soon for notifications';
