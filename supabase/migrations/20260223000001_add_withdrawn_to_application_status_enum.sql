-- Migration: Add 'withdrawn' value to application_status enum
-- Date: 2026-02-23
-- Problem: The job_application triggers reference 'withdrawn' in NOT IN ('withdrawn', 'rejected')
--          comparisons, but 'withdrawn' was never added to the application_status enum.
--          This causes account deletion to fail with:
--          "invalid input value for enum application_status: 'withdrawn'"
--
-- Fix: Add 'withdrawn' as a valid enum value.

-- PostgreSQL requires ALTER TYPE ... ADD VALUE to be run outside a transaction
-- for some versions, but Supabase migrations support it fine.

ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'withdrawn';

-- Verify the enum now contains 'withdrawn'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'application_status'
      AND e.enumlabel = 'withdrawn'
  ) THEN
    RAISE NOTICE '✓ application_status enum now includes ''withdrawn''';
  ELSE
    RAISE WARNING '✗ Failed to add ''withdrawn'' to application_status enum';
  END IF;
END $$;