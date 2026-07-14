-- ============================================================================
-- Migration: Urgent dispatch — canonical response-counting seam
-- ============================================================================
-- "How many genuine responses does this job have, and how many does it need
-- before we stop expanding the search?" was previously answered by four
-- separate inline COUNT(*) queries (one in a trigger, two in the cron route,
-- one in the apply route) — all hardcoding both the counting logic AND the
-- literal number 3.
--
-- This migration centralises both behind two functions:
--   count_urgent_job_responses(job_id) — the definition of "a response"
--   urgent_response_target()           — how many are needed to stop
--
-- Today these count public.urgent_job_dispatch_alerts WHERE responded = true,
-- exactly matching prior behaviour — no functional change yet. This is
-- deliberately the seam for a future move away from "applications" toward
-- direct-messaging / expressions-of-interest: when that happens, only
-- count_urgent_job_responses() needs to change (e.g. to count distinct
-- conversations with at least one tradesperson-sent message), and every
-- caller — the trigger, the expansion cron, and the apply route — picks up
-- the new definition automatically.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_urgent_job_responses(p_job_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Current definition: dispatch alerts the tradesperson genuinely responded
  -- to (i.e. applied — see apply_to_job()), never merely delivered/viewed.
  -- Future definition (not yet implemented): distinct conversations for this
  -- job with at least one message sent by the tradesperson.
  SELECT COUNT(*)::INTEGER
  FROM public.urgent_job_dispatch_alerts
  WHERE job_id = p_job_id AND responded = true;
$$;

GRANT EXECUTE ON FUNCTION public.count_urgent_job_responses(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_urgent_job_responses(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.urgent_response_target()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  -- How many genuine responses stop further radius expansion.
  -- A plain constant for now; trivially swappable to read from
  -- admin_settings later without touching any caller.
  SELECT 3;
$$;

GRANT EXECUTE ON FUNCTION public.urgent_response_target() TO service_role;
GRANT EXECUTE ON FUNCTION public.urgent_response_target() TO authenticated;

-- ── Rewire the race-safe auto-complete trigger to use the seam ─────────────

CREATE OR REPLACE FUNCTION public.trg_fn_auto_complete_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT (NEW.responded = true AND (OLD.responded IS NULL OR OLD.responded = false)) THEN
    RETURN NEW;
  END IF;

  v_count := public.count_urgent_job_responses(NEW.job_id);

  IF v_count >= public.urgent_response_target() THEN
    UPDATE public.jobs
    SET dispatch_state = 'completed'
    WHERE id = NEW.job_id
      AND dispatch_state IN ('searching', 'expanding');

    RAISE NOTICE '[dispatch] Job % reached % responses — dispatch_state set to completed', NEW.job_id, v_count;
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN RAISE NOTICE '✅ Migration 20260715000006 (response-counting seam) complete'; END; $$;
