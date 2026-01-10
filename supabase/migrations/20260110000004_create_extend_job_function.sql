-- Migration: Create extend_job function
-- Date: 2026-01-10
-- Description: Creates RPC function to extend job expiration dates

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.extend_job(UUID, TEXT, NUMERIC);

-- Create function to extend job expiration
CREATE OR REPLACE FUNCTION public.extend_job(
  job_id_param UUID,
  new_timeline TEXT,
  new_price NUMERIC DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_to_add INTEGER;
  new_expires_at TIMESTAMPTZ;
BEGIN
  -- Map timeline to days (max 28 days = 4 weeks)
  days_to_add := CASE new_timeline
    WHEN '3_days' THEN 3
    WHEN '5_days' THEN 5
    WHEN '7_days' THEN 7
    WHEN '14_days' THEN 14
    WHEN '21_days' THEN 21
    WHEN '28_days' THEN 28
    ELSE 7 -- Default to 7 days if invalid
  END;

  -- Calculate new expiration date from NOW (not from old expires_at)
  new_expires_at := NOW() + (days_to_add || ' days')::INTERVAL;

  -- Update the job
  UPDATE jobs
  SET
    expires_at = new_expires_at,
    recruitment_timeline = new_timeline,
    price = new_price,
    is_active = TRUE,
    updated_at = NOW()
  WHERE id = job_id_param;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.extend_job(UUID, TEXT, NUMERIC) IS
  'Extends a job posting by updating its expiration date based on the selected timeline.
   Maximum extension is 28 days (4 weeks).';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.extend_job(UUID, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_job(UUID, TEXT, NUMERIC) TO anon;
