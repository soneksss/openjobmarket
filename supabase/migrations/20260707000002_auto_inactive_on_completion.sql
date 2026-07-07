-- Migration: auto-set is_active = false when job status becomes COMPLETED or CANCELLED.
-- This is the authoritative fix; the API routes also set it explicitly for belt-and-suspenders.

-- 1. Trigger function
CREATE OR REPLACE FUNCTION public.jobs_set_inactive_on_terminal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('COMPLETED', 'CANCELLED') AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Trigger (idempotent)
DROP TRIGGER IF EXISTS trg_jobs_inactive_on_terminal_status ON public.jobs;
CREATE TRIGGER trg_jobs_inactive_on_terminal_status
  BEFORE UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.jobs_set_inactive_on_terminal_status();

-- 3. Backfill existing completed/cancelled jobs that still have is_active = true
UPDATE public.jobs
SET is_active = false
WHERE status IN ('COMPLETED', 'CANCELLED')
  AND is_active = true;

-- 4. Update complete_job() RPC to also set is_active = false directly (belt-and-suspenders)
CREATE OR REPLACE FUNCTION public.complete_job(p_job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.jobs
  SET status       = 'COMPLETED',
      is_active    = false,
      completed_at = NOW()
  WHERE id = p_job_id
    AND status IN ('POSTED', 'CONFIRMED', 'ACTIVE');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found or already in a terminal state', p_job_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_job(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✓ is_active trigger installed + % existing terminal jobs backfilled',
    (SELECT count(*) FROM public.jobs WHERE status IN ('COMPLETED','CANCELLED'));
END;
$$;
