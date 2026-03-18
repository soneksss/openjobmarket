-- ============================================================
-- FIX: Jobs search indexes used status = 'open' but queries
--      now filter status = 'POSTED'. Old partial indexes are
--      never used → full seq-scan → 10 s timeout.
--
-- Drop the stale partial indexes and recreate them for 'POSTED'.
-- ============================================================

-- Drop old partial indexes (they referenced status = 'open', never matched 'POSTED' rows)
DROP INDEX IF EXISTS idx_jobs_search_base;
DROP INDEX IF EXISTS idx_jobs_vacancies_common;
DROP INDEX IF EXISTS idx_jobs_trades_common;

-- ── Main search base (always filters these three together) ───────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_search_base_posted
ON jobs (is_tradespeople_job, is_active, expires_at)
WHERE status = 'POSTED' AND is_active = true;

-- ── Trade-job composite (the most common search path) ────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_trades_posted
ON jobs (is_tradespeople_job, is_active, industry, expires_at)
WHERE status = 'POSTED' AND is_active = true AND is_tradespeople_job = true;

-- ── Vacancy composite ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_vacancies_posted
ON jobs (is_tradespeople_job, is_active, expires_at)
WHERE status = 'POSTED' AND is_active = true AND is_tradespeople_job = false;

-- ── Expires-at (for the OR condition expires_at IS NULL OR expires_at > now) ─
-- Already exists as idx_jobs_expires_at — no change needed.

-- ── Bounding-box filter (lat/lon range queries) ──────────────────────────────
-- idx_jobs_location_coords already exists — no change needed.

-- ── FK join indexes (already exist, recreate IF NOT EXISTS just in case) ─────
CREATE INDEX IF NOT EXISTS idx_jobs_company_id
ON jobs (company_id)
WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_id
ON jobs (homeowner_id)
WHERE homeowner_id IS NOT NULL;

-- Re-run ANALYZE so the planner picks up the new statistics immediately
ANALYZE jobs;

DO $$ BEGIN
  RAISE NOTICE '✓ Jobs search indexes rebuilt for status = POSTED';
END $$;
