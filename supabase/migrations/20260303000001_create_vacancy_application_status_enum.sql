-- ============================================================
-- Migration: Create vacancy_application_status enum
-- Decouples the company hiring workflow from the trade job
-- state machine (application_status enum).
-- ============================================================
-- company job postings (vacancies) use this enum
-- trade job applications (homeowner → tradesperson) use
-- application_status (PENDING / WITHDRAWN / AUTO_CANCELLED / EXPIRED)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'vacancy_application_status'
      AND typtype = 'e'
  ) THEN
    CREATE TYPE vacancy_application_status AS ENUM (
      'APPLIED',     -- submitted, not yet reviewed
      'REVIEWED',    -- employer has opened the application
      'INTERVIEW',   -- invited to interview
      'OFFERED',     -- job offer extended
      'ACCEPTED',    -- candidate accepted the offer
      'REJECTED'     -- employer or candidate declined
    );
    RAISE NOTICE '✓ Created vacancy_application_status enum';
  ELSE
    RAISE NOTICE '✓ vacancy_application_status already exists, skipping';
  END IF;
END;
$$;


-- ── Verification ─────────────────────────────────────────────
DO $$
DECLARE
  v_values TEXT;
BEGIN
  SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
    INTO v_values
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'vacancy_application_status';

  IF v_values IS NULL THEN
    RAISE EXCEPTION 'vacancy_application_status enum not found';
  END IF;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'vacancy_application_status values: %', v_values;
  RAISE NOTICE '✅ Task 1 complete: vacancy_application_status enum ready';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
