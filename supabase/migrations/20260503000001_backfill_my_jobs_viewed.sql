-- Backfill: mark all pre-existing job_applications as viewed.
-- The is_viewed_by_tradesperson column was added with DEFAULT FALSE
-- (migration 20260320000010), which caused historical confirmed/active
-- jobs to appear as "new" in the My Jobs badge count.
-- This resets the badge — only confirmations AFTER this migration run
-- will show as new.
UPDATE job_applications
SET is_viewed_by_tradesperson = TRUE
WHERE is_viewed_by_tradesperson = FALSE;

DO $$ BEGIN
  RAISE NOTICE '✓ Backfilled is_viewed_by_tradesperson = TRUE for all existing rows';
END $$;
