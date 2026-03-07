-- ============================================================
-- Migration: Create urgent job state machine enum types
-- Task 1 of 7
-- ============================================================
-- Safely rename legacy enums (if they exist) so the new
-- uppercase versions can take their canonical names.
-- ============================================================

-- ─── 1. Rename legacy job_status enum ────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'job_status'
      AND typtype = 'e'
  ) THEN
    -- Only rename if it still has the old lowercase values
    IF EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'job_status'
        AND e.enumlabel = 'open'   -- old-style value
    ) THEN
      ALTER TYPE job_status RENAME TO job_status_legacy;
      RAISE NOTICE '✓ Renamed legacy job_status → job_status_legacy';
    ELSE
      RAISE NOTICE '⚠ job_status already uses new values, skipping rename';
    END IF;
  ELSE
    RAISE NOTICE '✓ No existing job_status type, nothing to rename';
  END IF;
END;
$$;

-- ─── 2. Rename legacy application_status enum ────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'application_status'
      AND typtype = 'e'
  ) THEN
    -- Only rename if it still has old lowercase values
    IF EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'application_status'
        AND e.enumlabel IN ('pending', 'reviewed', 'accepted', 'rejected', 'withdrawn')
    ) THEN
      ALTER TYPE application_status RENAME TO application_status_legacy;
      RAISE NOTICE '✓ Renamed legacy application_status → application_status_legacy';
    ELSE
      RAISE NOTICE '⚠ application_status already uses new values, skipping rename';
    END IF;
  ELSE
    RAISE NOTICE '✓ No existing application_status type, nothing to rename';
  END IF;
END;
$$;

-- ─── 3. Create new job_status enum ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'job_status'
      AND typtype = 'e'
  ) THEN
    CREATE TYPE job_status AS ENUM (
      'POSTED',       -- job published, accepting applications
      'CONFIRMED',    -- homeowner confirmed a tradesperson
      'ACTIVE',       -- job is actively in progress
      'COMPLETED',    -- job finished successfully
      'CANCELLED'     -- job cancelled by homeowner or system
    );
    RAISE NOTICE '✓ Created job_status enum with POSTED/CONFIRMED/ACTIVE/COMPLETED/CANCELLED';
  ELSE
    RAISE NOTICE '✓ job_status enum already exists with new values';
  END IF;
END;
$$;

-- ─── 4. Create new application_status enum ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'application_status'
      AND typtype = 'e'
  ) THEN
    CREATE TYPE application_status AS ENUM (
      'PENDING',          -- submitted, awaiting homeowner decision
      'WITHDRAWN',        -- tradesperson withdrew their application
      'AUTO_CANCELLED',   -- auto-cancelled when job was confirmed to another
      'EXPIRED'           -- deadline passed with no response
    );
    RAISE NOTICE '✓ Created application_status enum with PENDING/WITHDRAWN/AUTO_CANCELLED/EXPIRED';
  ELSE
    RAISE NOTICE '✓ application_status enum already exists with new values';
  END IF;
END;
$$;

-- ─── 5. Verify both enums ────────────────────────────────────
DO $$
DECLARE
  v_job_values    TEXT;
  v_app_values    TEXT;
BEGIN
  SELECT string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder)
  INTO v_job_values
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'job_status';

  SELECT string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder)
  INTO v_app_values
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'application_status';

  RAISE NOTICE '─────────────────────────────────────────────';
  RAISE NOTICE 'job_status values        : %', v_job_values;
  RAISE NOTICE 'application_status values: %', v_app_values;
  RAISE NOTICE '─────────────────────────────────────────────';

  -- Hard assert: fail migration if enums are wrong
  IF v_job_values NOT LIKE '%POSTED%' THEN
    RAISE EXCEPTION 'job_status enum missing POSTED value – migration failed';
  END IF;

  IF v_app_values NOT LIKE '%PENDING%' THEN
    RAISE EXCEPTION 'application_status enum missing PENDING value – migration failed';
  END IF;

  RAISE NOTICE '✅ Task 1 complete: both enums verified';
END;
$$;
