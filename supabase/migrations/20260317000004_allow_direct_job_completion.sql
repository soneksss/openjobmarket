-- ============================================================
-- Migration: Allow homeowner to mark job COMPLETED directly
-- ============================================================
-- Problem:
--   is_valid_job_transition only allowed ACTIVE → COMPLETED.
--   Homeowners using the tradespeople/urgent flow need to mark
--   a job COMPLETED when it is still POSTED or CONFIRMED.
--
-- Fix:
--   Add POSTED → COMPLETED and CONFIRMED → COMPLETED as valid
--   transitions. The /api/jobs/[id]/complete route uses the
--   admin client and handles the homeowner-auth check itself.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_valid_job_transition(
  p_old  job_status,
  p_new  job_status
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT (p_old, p_new) IN (
    ('POSTED'   ::job_status, 'CONFIRMED' ::job_status),
    ('POSTED'   ::job_status, 'CANCELLED' ::job_status),
    ('POSTED'   ::job_status, 'COMPLETED' ::job_status),  -- homeowner closes directly
    ('CONFIRMED'::job_status, 'ACTIVE'    ::job_status),
    ('CONFIRMED'::job_status, 'POSTED'    ::job_status),
    ('CONFIRMED'::job_status, 'CANCELLED' ::job_status),
    ('CONFIRMED'::job_status, 'COMPLETED' ::job_status),  -- homeowner closes after confirming
    ('ACTIVE'   ::job_status, 'COMPLETED' ::job_status)
  );
$$;

-- Update the error message in the trigger to reflect the new allowed transitions
CREATE OR REPLACE FUNCTION public.enforce_job_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_valid_job_transition(OLD.status, NEW.status) THEN
    RAISE EXCEPTION
      'Invalid job state transition: % → %. '
      'Allowed transitions from %: %',
      OLD.status,
      NEW.status,
      OLD.status,
      CASE OLD.status
        WHEN 'POSTED'    THEN 'CONFIRMED, CANCELLED, COMPLETED'
        WHEN 'CONFIRMED' THEN 'ACTIVE, POSTED (timeout), CANCELLED, COMPLETED'
        WHEN 'ACTIVE'    THEN 'COMPLETED'
        ELSE 'none (terminal state)'
      END
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  RETURN NEW;
END;
$$;
