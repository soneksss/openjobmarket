-- ============================================================
-- Migration: Backfill jobs.status to POSTED for active trade jobs
-- ============================================================
-- Problem:
--   The job wizard modal never set status on the payload, so jobs
--   inserted via the wizard got the column DEFAULT ('open' from the
--   old job_status enum).  After migration 20260302000001 renamed the
--   enum to job_status_legacy and created a new job_status enum with
--   values POSTED/CONFIRMED/ACTIVE/COMPLETED/CANCELLED, the wizard
--   jobs ended up with the old 'open' value (cast to job_status_legacy).
--
--   Two symptoms:
--   1. apply_to_job() checks status = 'POSTED' → raises exception for
--      wizard jobs → tradesperson gets 500 when applying.
--   2. InteractiveJobMap queries status = 'POSTED' → returns 0 rows.
--
-- Fix:
--   Cast the status column to the new job_status enum and set all
--   active, published jobs to 'POSTED'.
-- ============================================================

-- Backfill: any active job that is not yet in a terminal state → POSTED
UPDATE public.jobs
SET status = 'POSTED'
WHERE is_active = true
  AND status::text NOT IN ('CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

DO $$ BEGIN
  RAISE NOTICE '✓ Backfilled active jobs to status = POSTED';
END $$;
