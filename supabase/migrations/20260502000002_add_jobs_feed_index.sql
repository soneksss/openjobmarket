-- Composite index for job feed queries (status filter + recency sort).
-- Covers: homepage feed, admin job list, any ORDER BY created_at DESC WHERE status = ...
CREATE INDEX IF NOT EXISTS idx_jobs_status_created
  ON public.jobs (status, created_at DESC);
