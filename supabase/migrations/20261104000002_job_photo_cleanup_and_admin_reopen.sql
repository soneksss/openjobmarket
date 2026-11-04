-- ============================================================================
-- Job photo cleanup, admin "Reopen job", and an extend_job() ownership fix
-- Date: 2026-11-04
--
-- 1. job_photos_due_for_cleanup(): which job-photos files can go.
--    A job's photo is deleted only once the job has stayed CLOSED for more
--    than 30 days. "Closed" = not visible on the site: completed, cancelled,
--    expired, filled, taken down, or past its expiry date. Jobs in progress
--    with a tradesperson (CONFIRMED / ACTIVE) are never touched.
--    The 30 days run from the latest of updated_at / expires_at, and
--    trg_set_updated_at bumps updated_at on every change — so reopening,
--    reposting or editing a job restarts the clock.
--    Also lists files no job points at any more (replaced photos, posts that
--    never completed) once they're 30 days old.
--    The files themselves are removed through the Storage API by
--    /api/cron/cleanup-job-photos (daily), which then clears job_photo_url.
--
-- 2. admin_reopen_job(): puts any closed job back on the site, including
--    COMPLETED / CANCELLED / EXPIRED / FILLED ones that the state machine
--    treats as terminal. Service role only (called from the admin page).
--
-- 3. extend_job() was SECURITY DEFINER, granted to anon, with no ownership
--    check — anyone with the public anon key could re-activate any job or
--    change its price. It now only works for the job's own poster.
--
-- 4. Weekly trim of pg_cron run history (stale-search-cleanup runs every
--    minute, so cron.job_run_details grows ~1,400 rows/day forever).
-- ============================================================================


-- ── 1. Photos due for cleanup ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.job_photos_due_for_cleanup(p_limit INT DEFAULT 500)
RETURNS TABLE (job_id UUID, path TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  (
    SELECT j.id, split_part(j.job_photo_url, '/job-photos/', 2)
    FROM   jobs j
    WHERE  j.job_photo_url LIKE '%/job-photos/%'
      AND  (
             j.status::TEXT IN ('COMPLETED', 'CANCELLED', 'EXPIRED', 'FILLED')
             OR (j.status::TEXT = 'POSTED'
                 AND (j.is_active IS NOT TRUE OR j.expires_at < NOW()))
           )
      AND  GREATEST(j.updated_at, j.expires_at, j.created_at) < NOW() - INTERVAL '30 days'
    LIMIT  p_limit
  )
  UNION ALL
  (
    SELECT NULL::UUID, o.name
    FROM   storage.objects o
    WHERE  o.bucket_id = 'job-photos'
      AND  o.created_at < NOW() - INTERVAL '30 days'
      AND  NOT EXISTS (
             SELECT 1 FROM jobs j
             WHERE  split_part(j.job_photo_url, '/job-photos/', 2) = o.name
           )
    LIMIT  p_limit
  );
$$;

REVOKE ALL ON FUNCTION public.job_photos_due_for_cleanup(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.job_photos_due_for_cleanup(INT) TO service_role;


-- ── 2. Admin reopen ─────────────────────────────────────────────────────────

-- enforce_job_state_machine() body is 20260902000002 verbatim, plus the
-- admin_reopen_job() bypass at the top. The bypass flag is a transaction-local
-- setting only that function sets; end users still can't change jobs.status
-- at all (trg_guard_jobs_state_columns blocks anon/authenticated).
CREATE OR REPLACE FUNCTION public.enforce_job_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- ── Admin reopen (admin_reopen_job) ───────────────────────
  IF current_setting('ojm.admin_reopen', true) = 'on' AND NEW.status::TEXT = 'POSTED' THEN
    RETURN NEW;
  END IF;

  -- ── Flexible jobs (is_urgent = false) ─────────────────────
  IF NOT COALESCE(NEW.is_urgent, FALSE) THEN
    IF (OLD.status::TEXT, NEW.status::TEXT) IN (
      ('POSTED',    'ACTIVE'    ),
      ('POSTED',    'COMPLETED' ),
      ('POSTED',    'CANCELLED' ),
      ('POSTED',    'EXPIRED'   ),
      ('POSTED',    'FILLED'    ),
      ('POSTED',    'CONFIRMED' ),
      ('CONFIRMED', 'ACTIVE'    ),
      ('CONFIRMED', 'COMPLETED' ),
      ('CONFIRMED', 'CANCELLED' ),
      ('CONFIRMED', 'POSTED'    ),
      ('FILLED',    'COMPLETED' ),
      ('FILLED',    'CANCELLED' ),
      ('FILLED',    'CONFIRMED' ),
      ('ACTIVE',    'COMPLETED' ),
      ('ACTIVE',    'CANCELLED' )
    ) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'Invalid flexible-job state transition: % → %. Allowed from %: %',
      OLD.status, NEW.status, OLD.status,
      CASE OLD.status::TEXT
        WHEN 'POSTED'    THEN 'ACTIVE, COMPLETED, CANCELLED, EXPIRED, FILLED, CONFIRMED'
        WHEN 'CONFIRMED' THEN 'ACTIVE, COMPLETED, CANCELLED, POSTED'
        WHEN 'FILLED'    THEN 'COMPLETED, CANCELLED, CONFIRMED'
        WHEN 'ACTIVE'    THEN 'COMPLETED, CANCELLED'
        ELSE 'none (terminal state)'
      END
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Urgent jobs — existing machine ────────────────────────
  IF NOT public.is_valid_job_transition(OLD.status, NEW.status) THEN
    RAISE EXCEPTION
      'Invalid job state transition: % → %. Allowed transitions from %: %',
      OLD.status, NEW.status, OLD.status,
      CASE OLD.status
        WHEN 'POSTED'    THEN 'CONFIRMED, CANCELLED, COMPLETED'
        WHEN 'CONFIRMED' THEN 'ACTIVE, POSTED (timeout), CANCELLED, COMPLETED'
        WHEN 'ACTIVE'    THEN 'COMPLETED'
        ELSE 'none (terminal state)'
      END
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reopen_job(p_job_id UUID, p_days INT DEFAULT 14)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_live   INT;
BEGIN
  SELECT status::TEXT INTO v_status FROM jobs WHERE id = p_job_id FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  IF v_status IN ('CONFIRMED', 'ACTIVE') THEN
    RAISE EXCEPTION 'This job is in progress with a tradesperson, so it can''t be reopened';
  END IF;

  -- A FILLED job hit its reply cap; give it room for 10 more replies.
  SELECT COUNT(*) INTO v_live
  FROM   job_applications
  WHERE  job_id = p_job_id
    AND  status NOT IN ('WITHDRAWN', 'AUTO_CANCELLED', 'EXPIRED');

  PERFORM set_config('ojm.admin_reopen', 'on', true);

  UPDATE jobs
  SET    status          = 'POSTED',
         is_active       = TRUE,
         expires_at      = NOW() + make_interval(days => GREATEST(1, LEAST(COALESCE(p_days, 14), 60))),
         bumped_at       = NOW(),
         matching_status = 'searching',
         dispatch_state  = NULL,
         max_responses   = CASE
                             WHEN v_live >= COALESCE(max_responses, 10) THEN v_live + 10
                             ELSE max_responses
                           END
  WHERE  id = p_job_id;

  PERFORM set_config('ojm.admin_reopen', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reopen_job(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reopen_job(UUID, INT) TO service_role;


-- ── 3. extend_job(): poster only ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.extend_job(
  job_id_param UUID,
  new_timeline TEXT,
  new_price NUMERIC DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_to_add INTEGER;
BEGIN
  days_to_add := CASE new_timeline
    WHEN '3_days'  THEN 3
    WHEN '5_days'  THEN 5
    WHEN '7_days'  THEN 7
    WHEN '14_days' THEN 14
    WHEN '21_days' THEN 21
    WHEN '28_days' THEN 28
    ELSE 7
  END;

  UPDATE jobs j
  SET    expires_at           = NOW() + (days_to_add || ' days')::INTERVAL,
         recruitment_timeline = new_timeline,
         price                = new_price,
         is_active            = TRUE,
         updated_at           = NOW()
  WHERE  j.id = job_id_param
    AND  auth.uid() IS NOT NULL
    AND  (
           j.company_id   IN (SELECT id FROM company_profiles   WHERE user_id = auth.uid())
        OR j.homeowner_id IN (SELECT id FROM homeowner_profiles WHERE user_id = auth.uid())
         );

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.extend_job(UUID, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_job(UUID, TEXT, NUMERIC) TO authenticated;


-- ── 4. Trim pg_cron history weekly (Sunday 04:00 UTC, keep 7 days) ──────────

SELECT cron.schedule(
  'trim-cron-history-weekly',
  '0 4 * * 0',
  $$DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL '7 days'$$
)
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'trim-cron-history-weekly'
);

DO $$ BEGIN
  RAISE NOTICE '✓ job photo cleanup, admin_reopen_job, extend_job owner check, cron history trim ready';
END $$;
