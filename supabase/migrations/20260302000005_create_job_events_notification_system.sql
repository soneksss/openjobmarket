-- ============================================================
-- Migration: Job events table + notification trigger system
-- Task 5 of 7
-- ============================================================
-- Architecture (outbox pattern):
--
--   1. jobs AFTER UPDATE trigger  →  INSERT INTO job_events
--   2. Trigger also calls pg_notify('job_status_changed', payload)
--      so a live Edge Function subscriber is woken immediately.
--   3. job_events.processed flag lets a scheduled Edge Function
--      poll for unprocessed events as a reliable fallback.
--   4. The Edge Function reads job_events, sends push/email
--      notifications, then marks processed = true.
--
-- Push notifications are NEVER sent directly from the frontend.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  PART A: job_events table
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.job_events (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id          UUID        NOT NULL REFERENCES public.jobs(id)  ON DELETE CASCADE,

  -- Status transition
  old_status      job_status,               -- NULL for INSERT events (if ever needed)
  new_status      job_status      NOT NULL,

  -- Denormalised recipients captured at trigger time so the
  -- Edge Function doesn't need a second query (avoids race).
  homeowner_id    UUID,                     -- homeowner_profiles.id of the job owner
  tradesperson_id UUID,                     -- company_profiles.id relevant to this event
                                            -- (the confirmed one, or the auto-cancelled one)

  -- Extra context for the Edge Function (flexible)
  metadata        JSONB       NOT NULL DEFAULT '{}',

  -- Outbox processing flag
  processed       BOOLEAN     NOT NULL DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.job_events IS
  'Outbox table for job state-machine events. '
  'Consumed by Edge Functions to send push/email notifications. '
  'Never written by the frontend — only by Postgres triggers.';

COMMENT ON COLUMN public.job_events.processed IS
  'Set to TRUE by the Edge Function after notifications are dispatched. '
  'Allows scheduled polling as a fallback to Realtime.';

COMMENT ON COLUMN public.job_events.metadata IS
  'Extra context for the Edge Function: job title, homeowner name, etc.';

-- ─── Indexes ─────────────────────────────────────────────────
-- Edge Function polling: unprocessed events, oldest first
CREATE INDEX IF NOT EXISTS idx_job_events_unprocessed
  ON public.job_events (created_at ASC)
  WHERE processed = FALSE;

-- Lookup by job
CREATE INDEX IF NOT EXISTS idx_job_events_job_id
  ON public.job_events (job_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

-- End users must never read or write job_events directly.
-- The Edge Function uses service_role which bypasses RLS.
-- Admins can read for debugging.
CREATE POLICY "service_role full access to job_events"
  ON public.job_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No policy for authenticated/anon → they are implicitly denied.

-- ─── Realtime publication ────────────────────────────────────
-- Adds job_events to the default Supabase Realtime publication
-- so an Edge Function can subscribe via the Supabase client.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Only add if not already a member
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND tablename = 'job_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.job_events;
      RAISE NOTICE '✓ job_events added to supabase_realtime publication';
    ELSE
      RAISE NOTICE '✓ job_events already in supabase_realtime publication';
    END IF;
  ELSE
    RAISE NOTICE '⚠ supabase_realtime publication not found — skip';
  END IF;
END;
$$;


-- ════════════════════════════════════════════════════════════
--  PART B: Trigger function
-- ════════════════════════════════════════════════════════════
-- Fires AFTER UPDATE on jobs whenever status changes.
-- Inserts one row into job_events and calls pg_notify so a
-- live Edge Function subscriber is woken immediately.
-- Uses SECURITY DEFINER so it can always INSERT into job_events
-- regardless of which role fired the triggering UPDATE.

CREATE OR REPLACE FUNCTION public.record_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSON;
BEGIN
  -- Only act when status actually changed
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Build a compact payload for pg_notify (max ~8 kB)
  v_payload := json_build_object(
    'event_type',      'job_status_changed',
    'job_id',          NEW.id,
    'old_status',      OLD.status,
    'new_status',      NEW.status,
    'homeowner_id',    NEW.homeowner_id,
    'tradesperson_id', NEW.confirmed_tradesperson_id,
    'job_title',       NEW.title
  );

  -- Insert into outbox table
  INSERT INTO job_events (
    job_id,
    old_status,
    new_status,
    homeowner_id,
    tradesperson_id,
    metadata
  )
  VALUES (
    NEW.id,
    OLD.status,
    NEW.status,
    NEW.homeowner_id,
    NEW.confirmed_tradesperson_id,
    v_payload
  );

  -- Wake any live Edge Function subscriber immediately
  PERFORM pg_notify('job_status_changed', v_payload::TEXT);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.record_job_status_change() IS
  'AFTER UPDATE trigger on jobs. Inserts into job_events outbox '
  'and fires pg_notify(''job_status_changed'') on every status change. '
  'SECURITY DEFINER so it can always write job_events.';


-- ════════════════════════════════════════════════════════════
--  PART C: Attach trigger to jobs
-- ════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_job_status_changed ON public.jobs;

CREATE TRIGGER trg_job_status_changed
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.record_job_status_change();

COMMENT ON TRIGGER trg_job_status_changed ON public.jobs IS
  'Fires after jobs.status changes. Writes to job_events outbox '
  'and notifies the Edge Function via pg_notify.';


-- ════════════════════════════════════════════════════════════
--  PART D: Helper — mark_job_events_processed(ids)
-- ════════════════════════════════════════════════════════════
-- Called by the Edge Function after successfully dispatching
-- notifications for a batch of events.

CREATE OR REPLACE FUNCTION public.mark_job_events_processed(p_event_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE job_events
    SET processed    = TRUE,
        processed_at = now()
  WHERE id = ANY(p_event_ids)
    AND processed = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.mark_job_events_processed(UUID[]) IS
  'Edge Function calls this after dispatching notifications for a batch. '
  'Returns number of rows marked. Idempotent (processed rows are skipped).';

REVOKE EXECUTE ON FUNCTION public.mark_job_events_processed(UUID[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_job_events_processed(UUID[]) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_job_events_processed(UUID[]) TO service_role;


-- ════════════════════════════════════════════════════════════
--  PART E: Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_table_exists  BOOLEAN;
  v_trigger_exists BOOLEAN;
  v_fn_record     BOOLEAN;
  v_fn_mark       BOOLEAN;
  v_rls_enabled   BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'job_events'
  ) INTO v_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_job_status_changed'
  ) INTO v_trigger_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'record_job_status_change' AND n.nspname = 'public'
  ) INTO v_fn_record;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'mark_job_events_processed' AND n.nspname = 'public'
  ) INTO v_fn_mark;

  SELECT relrowsecurity
    INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'job_events'
    AND relnamespace = 'public'::regnamespace;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'job_events table              : %', CASE WHEN v_table_exists   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'RLS on job_events             : %', CASE WHEN v_rls_enabled    THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'trigger trg_job_status_changed: %', CASE WHEN v_trigger_exists THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'fn record_job_status_change() : %', CASE WHEN v_fn_record      THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'fn mark_job_events_processed(): %', CASE WHEN v_fn_mark        THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_table_exists AND v_trigger_exists AND v_fn_record AND v_fn_mark AND v_rls_enabled) THEN
    RAISE EXCEPTION 'Task 5 verification failed – see NOTICE output above';
  END IF;

  RAISE NOTICE '✅ Task 5 complete: job_events outbox + notification trigger ready';
  RAISE NOTICE '';
  RAISE NOTICE 'Edge Function integration checklist:';
  RAISE NOTICE '  1. Subscribe to pg_notify channel: job_status_changed';
  RAISE NOTICE '     OR poll: SELECT * FROM job_events WHERE processed = FALSE ORDER BY created_at LIMIT 50';
  RAISE NOTICE '  2. Send push/email based on old_status → new_status';
  RAISE NOTICE '  3. Call mark_job_events_processed(ARRAY[id1, id2, ...]) when done';
  RAISE NOTICE '  4. Configure Database Webhook in Supabase dashboard:';
  RAISE NOTICE '     Table: job_events, Event: INSERT, Function: your-edge-function';
END;
$$;
