-- ============================================================
-- Fix: pg_trgm indexes on jobs.industry and jobs.category
-- ============================================================
--
-- Problem: ilike '%keyword%' on industry/category columns
-- causes a sequential scan when there are many POSTED jobs,
-- leading to 10+ second timeouts in the tradesperson search.
--
-- Solution: GIN trigram indexes allow Postgres to use an index
-- for both LIKE and ILIKE patterns with leading wildcards.
--
-- Note: Partial indexes (WHERE status='POSTED' AND is_active=true
-- AND is_tradespeople_job=true) keep the index small and fast.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index on industry column (used in autoSearch industry filter)
CREATE INDEX IF NOT EXISTS idx_jobs_industry_trgm
  ON public.jobs USING gin (industry gin_trgm_ops)
  WHERE status = 'POSTED'
    AND is_active = true
    AND is_tradespeople_job = true;

-- Index on category column (also used in some search paths)
CREATE INDEX IF NOT EXISTS idx_jobs_category_trgm
  ON public.jobs USING gin (category gin_trgm_ops)
  WHERE status = 'POSTED'
    AND is_active = true
    AND is_tradespeople_job = true;

DO $$ BEGIN
  RAISE NOTICE '✓ pg_trgm extension enabled';
  RAISE NOTICE '✓ idx_jobs_industry_trgm created (GIN, partial: POSTED+active+tradespeople)';
  RAISE NOTICE '✓ idx_jobs_category_trgm created (GIN, partial: POSTED+active+tradespeople)';
END; $$;
