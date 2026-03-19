-- ============================================================
-- Migration: Backfill jobs.applications_count from real data
-- ============================================================
-- Problem: applications_count is a denormalized counter maintained
-- by triggers on job_applications. The counter drifted out of sync
-- on some rows because:
--   1. The INSERT trigger used lowercase enum values before the
--      enum was migrated to uppercase (fixed in 20260314000001),
--      so some applications slipped through without incrementing
--      the counter.
--   2. Manual data corrections or bulk operations bypassed the
--      trigger entirely.
--
-- Fix: recalculate applications_count for every job by counting
-- active (non-withdrawn, non-cancelled, non-expired) rows in
-- job_applications, then compare with the stored value and log
-- any jobs that were corrected.
-- ============================================================

DO $$
DECLARE
  corrected INT := 0;
  total     INT := 0;
BEGIN
  -- Bulk-update all jobs whose stored count doesn't match reality
  WITH real_counts AS (
    SELECT
      job_id,
      COUNT(*) FILTER (
        WHERE status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED')
      ) AS real_count
    FROM job_applications
    GROUP BY job_id
  ),
  updates AS (
    UPDATE jobs j
    SET applications_count = COALESCE(rc.real_count, 0)
    FROM real_counts rc
    WHERE j.id = rc.job_id
      AND j.applications_count IS DISTINCT FROM rc.real_count
    RETURNING j.id
  )
  SELECT COUNT(*) INTO corrected FROM updates;

  -- Also zero out jobs that have no applications at all but show a non-zero count
  WITH zero_updates AS (
    UPDATE jobs
    SET applications_count = 0
    WHERE applications_count > 0
      AND id NOT IN (SELECT DISTINCT job_id FROM job_applications)
    RETURNING id
  )
  SELECT corrected + COUNT(*) INTO corrected FROM zero_updates;

  SELECT COUNT(*) INTO total FROM jobs;

  RAISE NOTICE '✓ applications_count backfill complete: % of % jobs corrected', corrected, total;
END $$;
