-- ============================================================
-- Migration: Fix confirm_tradesperson — clear matching_status
-- ============================================================
-- Problem:
--   confirm_tradesperson sets jobs.status = 'CONFIRMED' but
--   leaves matching_status = 'searching', causing the messaging
--   UI to show "Searching" even after a tradesperson is confirmed.
--
-- Fix:
--   Also set matching_status = 'closed' when confirming,
--   which signals the search is done.
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_tradesperson(
  p_job_id          UUID,
  p_tradesperson_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_status TEXT;
BEGIN
  -- Lock the job row and verify the caller is its homeowner
  SELECT j.status::TEXT
    INTO v_job_status
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id = p_job_id
    AND hp.user_id = auth.uid()
  FOR UPDATE;

  IF v_job_status IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_job_status <> 'POSTED' THEN
    RAISE EXCEPTION 'Job is not in POSTED state (current: %)', v_job_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Verify the tradesperson has a PENDING application
  IF NOT EXISTS (
    SELECT 1 FROM job_applications
    WHERE job_id = p_job_id
      AND tradesperson_id = p_tradesperson_id
      AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Tradesperson % has no pending application for this job',
      p_tradesperson_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Confirm: update job status and clear the search state
  UPDATE jobs
    SET status                    = 'CONFIRMED',
        matching_status           = 'closed',
        confirmed_tradesperson_id = p_tradesperson_id,
        confirmed_at              = now()
  WHERE id = p_job_id;

  -- Auto-cancel every OTHER pending application
  UPDATE job_applications
    SET status = 'AUTO_CANCELLED'
  WHERE job_id = p_job_id
    AND tradesperson_id <> p_tradesperson_id
    AND status = 'PENDING';

END;
$$;

-- Also backfill any already-confirmed jobs that still have matching_status = 'searching'
UPDATE public.jobs
SET matching_status = 'closed'
WHERE status = 'CONFIRMED'
  AND (matching_status = 'searching' OR matching_status IS NULL);
