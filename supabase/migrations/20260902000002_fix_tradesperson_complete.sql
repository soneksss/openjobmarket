-- ============================================================================
-- Fix: tradesperson "Mark as Completed" does nothing on flexible jobs
-- Date: 2026-09-02
--
-- confirm_tradesperson() moves ANY tradespeople job (urgent OR flexible) to
-- status = 'CONFIRMED'. The tradesperson then completes it from My Jobs via
-- POST /api/jobs/[id]/tradesperson-complete → UPDATE jobs SET status='COMPLETED'.
--
-- enforce_job_state_machine() (20260715000008) splits by is_urgent:
--   • urgent  → is_valid_job_transition(): CONFIRMED→COMPLETED is allowed ✓
--   • flexible → an explicit list that has NO 'CONFIRMED' transitions at all,
--     so the UPDATE raises "Invalid flexible-job state transition:
--     CONFIRMED → COMPLETED" and the API returns 422.
--
-- Fix: add the confirm→complete lifecycle to the flexible branch so a
-- flexible job that was confirmed to a tradesperson can be completed (and
-- cancelled / reverted) the same way an urgent one can. Everything else is
-- the 20260715000008 body verbatim.
--
-- Also add company_profiles.first_review_prompt_shown (mirrors
-- homeowner_profiles) so the tradesperson gets the one-time Trustpilot prompt
-- after their first completed job.
-- ============================================================================

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS first_review_prompt_shown BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.enforce_job_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- ── Flexible jobs (is_urgent = false) ─────────────────────
  IF NOT COALESCE(NEW.is_urgent, FALSE) THEN
    IF (OLD.status::TEXT, NEW.status::TEXT) IN (
      ('POSTED',    'ACTIVE'    ),
      ('POSTED',    'COMPLETED' ),
      ('POSTED',    'CANCELLED' ),
      ('POSTED',    'EXPIRED'   ),
      ('POSTED',    'FILLED'    ),
      ('POSTED',    'CONFIRMED' ),   -- homeowner confirms a tradesperson       ← NEW
      ('CONFIRMED', 'ACTIVE'    ),   -- optional in-progress step               ← NEW
      ('CONFIRMED', 'COMPLETED' ),   -- tradesperson / homeowner completes      ← NEW
      ('CONFIRMED', 'CANCELLED' ),   -- either side cancels after confirming    ← NEW
      ('CONFIRMED', 'POSTED'    ),   -- confirmation reverted / timed out       ← NEW
      ('FILLED',    'COMPLETED' ),
      ('FILLED',    'CANCELLED' ),
      ('FILLED',    'CONFIRMED' ),   -- homeowner picks one of the responders   ← NEW
      ('ACTIVE',    'COMPLETED' ),
      ('ACTIVE',    'CANCELLED' )
    ) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'Invalid flexible-job state transition: % → %. Allowed from %: %',
      OLD.status, NEW.status, OLD.status,
      CASE OLD.status::TEXT
        WHEN 'POSTED'    THEN 'ACTIVE, COMPLETED, CANCELLED, EXPIRED, FILLED, CONFIRMED'
        WHEN 'CONFIRMED' THEN 'ACTIVE, COMPLETED, CANCELLED, POSTED'
        WHEN 'FILLED'    THEN 'COMPLETED, CANCELLED, CONFIRMED'
        WHEN 'ACTIVE'    THEN 'COMPLETED, CANCELLED'
        ELSE 'none (terminal state)'
      END
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Urgent jobs — existing machine ────────────────────────
  IF NOT public.is_valid_job_transition(OLD.status, NEW.status) THEN
    RAISE EXCEPTION
      'Invalid job state transition: % → %. Allowed transitions from %: %',
      OLD.status, NEW.status, OLD.status,
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

-- Belt-and-braces: make sure the urgent path also has CONFIRMED→COMPLETED
-- (it should already, from 20260317000004).
CREATE OR REPLACE FUNCTION public.is_valid_job_transition(p_old job_status, p_new job_status)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT (p_old, p_new) IN (
    ('POSTED'   ::job_status, 'CONFIRMED' ::job_status),
    ('POSTED'   ::job_status, 'CANCELLED' ::job_status),
    ('POSTED'   ::job_status, 'COMPLETED' ::job_status),
    ('CONFIRMED'::job_status, 'ACTIVE'    ::job_status),
    ('CONFIRMED'::job_status, 'POSTED'    ::job_status),
    ('CONFIRMED'::job_status, 'CANCELLED' ::job_status),
    ('CONFIRMED'::job_status, 'COMPLETED' ::job_status),
    ('ACTIVE'   ::job_status, 'COMPLETED' ::job_status),
    ('ACTIVE'   ::job_status, 'CANCELLED' ::job_status)
  );
$$;

DO $$ BEGIN
  RAISE NOTICE 'enforce_job_state_machine: flexible jobs can now go CONFIRMED→COMPLETED';
END $$;
