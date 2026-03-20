-- ============================================================
-- Migration: complete_job() — accept CONFIRMED status
-- ============================================================
-- Homeowner jobs flow: POSTED → CONFIRMED (tradesperson selected)
--                                → COMPLETED (homeowner marks done)
-- The RPC previously only accepted POSTED/ACTIVE, blocking the
-- normal post-confirmation completion path.
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT j.status::TEXT AS status, COALESCE(j.is_urgent, FALSE) AS is_urgent
    INTO v_job
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id     = p_job_id
    AND hp.user_id = auth.uid()
  FOR UPDATE;

  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_job.is_urgent THEN
    IF v_job.status NOT IN ('ACTIVE', 'CONFIRMED') THEN
      RAISE EXCEPTION 'Urgent job must be ACTIVE or CONFIRMED to complete (current: %)', v_job.status
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  ELSE
    -- Flexible / standard jobs: accept POSTED, ACTIVE, or CONFIRMED
    IF v_job.status NOT IN ('POSTED', 'ACTIVE', 'CONFIRMED') THEN
      RAISE EXCEPTION 'Job must be POSTED, ACTIVE, or CONFIRMED to complete (current: %)', v_job.status
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;

  UPDATE jobs
  SET status           = 'COMPLETED',
      completed_at     = NOW(),
      completion_status = 'completed'
  WHERE id = p_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_job(UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ complete_job() now accepts CONFIRMED → COMPLETED transition';
END; $$;
