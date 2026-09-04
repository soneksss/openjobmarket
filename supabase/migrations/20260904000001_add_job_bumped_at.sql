-- ============================================================================
-- jobs.bumped_at — "freshness" timestamp for the public jobs map
-- Date: 2026-09-04
--
-- When a homeowner EXTENDS (or reactivates) a job it should read as fresh to
-- tradespeople — not "posted 5w ago", which makes a perfectly good job look
-- stale / suspicious. `created_at` stays the true creation date (analytics,
-- audit); the public map shows `age = now - COALESCE(bumped_at, created_at)`.
--
-- NULL until the job is first extended. Safe / idempotent.
-- ============================================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS bumped_at TIMESTAMPTZ;

COMMENT ON COLUMN public.jobs.bumped_at IS
  'Last time the homeowner extended/reactivated this job. Public "posted X ago" '
  'uses COALESCE(bumped_at, created_at). NULL = never extended.';

DO $$ BEGIN RAISE NOTICE '✓ jobs.bumped_at added'; END $$;
