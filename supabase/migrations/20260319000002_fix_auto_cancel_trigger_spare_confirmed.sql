-- ============================================================
-- Migration: Fix auto_cancel_pending_applications trigger
-- ============================================================
-- Bug: The trigger cancels ALL pending applications when a job
-- moves to CONFIRMED, including the confirmed tradesperson's own
-- application. This breaks the 15-minute acceptance window —
-- accept_confirmed_job() can no longer find a PENDING row for
-- the confirmed tradesperson.
--
-- Fix: Exclude the confirmed_tradesperson_id from auto-cancel
-- when the job transitions to CONFIRMED state.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_cancel_pending_applications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('CONFIRMED', 'COMPLETED', 'CANCELLED')
     AND (OLD.status IS DISTINCT FROM NEW.status)
  THEN
    UPDATE public.job_applications
    SET    status = 'AUTO_CANCELLED'
    WHERE  job_id = NEW.id
      AND  status = 'PENDING'
      -- When CONFIRMED: spare the confirmed tradesperson's own application
      -- so accept_confirmed_job() can still find it within the 15-min window.
      AND  (
        NEW.status <> 'CONFIRMED'
        OR tradesperson_id IS DISTINCT FROM NEW.confirmed_tradesperson_id
      );
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  RAISE NOTICE '✓ auto_cancel_pending_applications fixed — confirmed tradesperson application spared on CONFIRMED transition';
END $$;
