-- ============================================================
-- Migration: Tighten mark_flexible_in_progress() guard
-- ============================================================
-- The UPDATE statement now includes the transition conditions
-- directly in its WHERE clause, making it a compare-and-swap.
--
-- Before:
--   UPDATE jobs SET status = 'ACTIVE' WHERE id = p_job_id;
--   (relied on prior IF checks; UPDATE itself had no guard)
--
-- After:
--   UPDATE jobs SET status = 'ACTIVE'
--   WHERE id            = p_job_id
--     AND urgency_type  = 'flexible'
--     AND status        = 'POSTED';
--   (0 rows affected = something changed between lock and update)
--
-- This prevents accidental ACTIVE→ACTIVE or COMPLETED→ACTIVE
-- even if the pre-checks are bypassed or the row changes between
-- the SELECT FOR UPDATE and the UPDATE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_flexible_in_progress(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_urgent BOOLEAN;
BEGIN
  -- Lock the row and verify caller is the homeowner
  SELECT j.status::TEXT, COALESCE(j.is_urgent, FALSE)
    INTO v_status, v_urgent
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id     = p_job_id
    AND hp.user_id = auth.uid()
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_urgent THEN
    RAISE EXCEPTION
      'mark_flexible_in_progress() is only for flexible jobs. '
      'Use confirm_tradesperson() for urgent jobs.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_status <> 'POSTED' THEN
    RAISE EXCEPTION
      'Job must be POSTED to mark in-progress (current: %)', v_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Compare-and-swap: all three conditions must hold at UPDATE time.
  -- If 0 rows are affected the row changed between the lock and here
  -- (should not happen with FOR UPDATE, but defence-in-depth).
  UPDATE jobs
  SET    status = 'ACTIVE'
  WHERE  id           = p_job_id
    AND  urgency_type = 'flexible'
    AND  status       = 'POSTED';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'State transition failed — job is not a POSTED flexible job (concurrent update?)'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.mark_flexible_in_progress(UUID) IS
  'Homeowner marks a flexible job as IN_PROGRESS (ACTIVE). '
  'Guards: caller = homeowner, urgency_type = flexible, status = POSTED. '
  'UPDATE uses compare-and-swap so all conditions hold at write time.';

GRANT EXECUTE ON FUNCTION public.mark_flexible_in_progress(UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ mark_flexible_in_progress() — UPDATE is now a compare-and-swap';
END; $$;
