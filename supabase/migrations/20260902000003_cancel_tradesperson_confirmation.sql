-- ============================================================================
-- cancel_tradesperson_confirmation(p_job_id)
-- Date: 2026-09-02
--
-- Lets the homeowner undo a confirmation (green "Confirmed" → "Cancel" on the
-- conversation page). Reverts the job CONFIRMED → POSTED, clears the confirmed
-- tradesperson, and restores the other applicants that confirm_tradesperson()
-- auto-cancelled so they're back in the running.
--
-- Only from CONFIRMED (not ACTIVE — once work has started, don't un-confirm).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_tradesperson_confirmation(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Caller must be the job's homeowner
  SELECT j.status::TEXT
    INTO v_status
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id = p_job_id
    AND hp.user_id = auth.uid()
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'Job is not in CONFIRMED state (current: %)', v_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE jobs
    SET status                    = 'POSTED',
        matching_status           = 'searching',
        confirmed_tradesperson_id = NULL,
        confirmed_at              = NULL
  WHERE id = p_job_id;

  -- Bring back everyone confirm_tradesperson() auto-cancelled.
  UPDATE job_applications
    SET status = 'PENDING'
  WHERE job_id = p_job_id
    AND status = 'AUTO_CANCELLED';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_tradesperson_confirmation(UUID) TO authenticated;

DO $$ BEGIN RAISE NOTICE 'cancel_tradesperson_confirmation() created'; END $$;
