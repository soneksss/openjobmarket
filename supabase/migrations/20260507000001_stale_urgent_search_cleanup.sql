-- Stale urgent-search cleanup
-- Jobs stuck in active_search for more than 5 minutes are moved to background_search.
-- This prevents zombie "Searching…" states caused by server crashes or force-close.

CREATE OR REPLACE FUNCTION cleanup_stale_urgent_searches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE jobs
  SET
    search_state = 'background_search',
    updated_at   = NOW()
  WHERE
    search_state = 'active_search'
    AND status = 'POSTED'
    AND updated_at < NOW() - interval '5 minutes';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Moved % stale urgent searches to background_search', affected;
  RETURN affected;
END;
$$;

-- Allow service-role to call this function
GRANT EXECUTE ON FUNCTION cleanup_stale_urgent_searches() TO service_role;

-- Index so the cleanup query never full-scans the jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_active_search_updated
  ON jobs(search_state, updated_at);

-- Register the pg_cron job if pg_cron extension is enabled.
-- If pg_cron is not available, call this function from an Edge Function on a schedule.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Guard against duplicate cron jobs on repeated migration runs
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'stale-search-cleanup'
    ) THEN
      PERFORM cron.schedule(
        'stale-search-cleanup',
        '* * * * *',
        $cron$ SELECT cleanup_stale_urgent_searches(); $cron$
      );
    END IF;
  END IF;
END;
$$;
