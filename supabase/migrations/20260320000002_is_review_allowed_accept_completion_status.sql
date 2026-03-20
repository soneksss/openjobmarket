-- ============================================================
-- Fix is_review_allowed() to also accept legacy completed jobs
-- ============================================================
-- Some jobs were completed before the state-machine trigger was
-- enforced. They have completion_status = 'completed' but
-- status = 'CONFIRMED' (direct status update was blocked).
-- The RPC previously rejected these with a 403.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_review_allowed(
  p_job_id      UUID,
  p_reviewer_id UUID,
  p_reviewed_id UUID
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_status        TEXT;
  v_completion_status TEXT;
BEGIN
  SELECT status::TEXT, completion_status::TEXT
    INTO v_job_status, v_completion_status
  FROM jobs
  WHERE id = p_job_id;

  IF v_job_status IS NULL THEN
    RETURN QUERY SELECT false, 'Job not found';
    RETURN;
  END IF;

  -- Allow review when:
  --   status = 'COMPLETED' / 'completed'  (standard path)
  --   OR completion_status = 'completed'  (legacy path — status stuck at CONFIRMED)
  IF v_job_status NOT IN ('COMPLETED', 'completed')
     AND v_completion_status IS DISTINCT FROM 'completed' THEN
    RETURN QUERY SELECT false,
      format('Reviews are only allowed for COMPLETED jobs (current: %s)', v_job_status);
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM reviews
    WHERE job_id      = p_job_id
      AND reviewer_id = p_reviewer_id
      AND reviewed_id = p_reviewed_id
  ) THEN
    RETURN QUERY SELECT false, 'You have already reviewed this person for this job';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Review allowed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_review_allowed(UUID, UUID, UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ is_review_allowed() now accepts completion_status=completed for legacy jobs';
END; $$;
