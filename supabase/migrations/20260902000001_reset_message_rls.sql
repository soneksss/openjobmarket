-- ============================================================================
-- Reset messages / conversations RLS to plain participant visibility
-- Date: 2026-09-02
--
-- Symptom: a tradesperson messages a homeowner directly (from the job map,
-- no job link → messages.job_id = NULL). The homeowner's badge ticks to 1
-- (realtime INSERT event) but /messages shows "No conversations yet" — their
-- own client can't SELECT the row.
--
-- Cause: a leftover RLS policy from the era when tradespeople could only
-- *apply* (never DM), added via the dashboard (e.g. "Messages are viewable by
-- sender and recipient" with a job-application gate) — not tracked in
-- migrations.
--
-- Fix: drop EVERY policy on both tables and recreate only the ones we want.
-- Rows are still written by the service-role client (bypasses RLS); these
-- policies only govern client reads/updates.
--
-- ── If this run fails with "deadlock detected" or "canceling statement due to
--    lock timeout": nothing was committed — just press Run again. Ideally run
--    it during a quiet moment. Locks are taken messages → conversations in a
--    fixed order and held only for this transaction.
-- ============================================================================

SET lock_timeout = '5s';

-- ── messages ───────────────────────────────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
LOCK TABLE public.messages IN ACCESS EXCLUSIVE MODE;   -- fails fast if contended

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.messages', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "messages_select_participants"
  ON public.messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_update_recipient_read"
  ON public.messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ── conversations ──────────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
LOCK TABLE public.conversations IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'conversations'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.conversations', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "conversations_select_participants"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "conversations_insert_participant"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "conversations_delete_participant"
  ON public.conversations FOR DELETE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

DO $$
DECLARE v_msg int; v_conv int;
BEGIN
  SELECT count(*) INTO v_msg  FROM pg_policies WHERE schemaname='public' AND tablename='messages';
  SELECT count(*) INTO v_conv FROM pg_policies WHERE schemaname='public' AND tablename='conversations';
  RAISE NOTICE 'messages policies=% (expect 3), conversations policies=% (expect 3)', v_msg, v_conv;
END $$;
