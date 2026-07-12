-- ============================================================================
-- Migration: Membership system (Phase B) — first-completed-job reward hook
-- ============================================================================
-- Wires public.grant_first_job_reward_if_due() (from the Phase A migration)
-- into the complete_job() RPC — one of three places in this codebase that can
-- mark a job COMPLETED. The other two (app/api/jobs/[id]/complete/route.ts
-- and app/api/jobs/[id]/tradesperson-complete/route.ts) update jobs.status
-- directly rather than via this RPC, so they call the same shared function
-- from application code right after their own update succeeds — see those
-- files for the corresponding change.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_job(p_job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tradesperson_id UUID; -- company_profiles.id (== jobs.confirmed_tradesperson_id)
BEGIN
  UPDATE public.jobs
  SET status       = 'COMPLETED',
      is_active    = false,
      completed_at = NOW()
  WHERE id = p_job_id
    AND status IN ('POSTED', 'CONFIRMED', 'ACTIVE')
  RETURNING confirmed_tradesperson_id INTO v_tradesperson_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found or already in a terminal state', p_job_id;
  END IF;

  PERFORM public.grant_first_job_reward_if_due(v_tradesperson_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_job(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20260715000002 (first-job reward hook) complete';
END;
$$;
