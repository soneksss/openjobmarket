-- ============================================================
-- Migration: Auto-cancel pending applications when job is closed
-- ============================================================
-- When a job moves to CONFIRMED, COMPLETED, or CANCELLED,
-- any PENDING applications that weren't explicitly accepted
-- are automatically set to AUTO_CANCELLED.
--
-- This is a safety-net trigger — confirm_tradesperson() already
-- handles the CONFIRMED case, but this ensures no PENDING rows
-- are left dangling if a job is closed via other code paths.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_cancel_pending_applications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when status transitions to a closed state
  IF NEW.status IN ('CONFIRMED', 'COMPLETED', 'CANCELLED')
     AND (OLD.status IS DISTINCT FROM NEW.status)
  THEN
    UPDATE public.job_applications
    SET    status = 'AUTO_CANCELLED'
    WHERE  job_id = NEW.id
      AND  status = 'PENDING';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger (idempotent)
DROP TRIGGER IF EXISTS trg_auto_cancel_pending_applications ON public.jobs;

CREATE TRIGGER trg_auto_cancel_pending_applications
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_cancel_pending_applications();

DO $$ BEGIN
  RAISE NOTICE '✓ trg_auto_cancel_pending_applications created';
  RAISE NOTICE '  - PENDING applications auto-cancelled on CONFIRMED / COMPLETED / CANCELLED';
END $$;
