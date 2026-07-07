-- Fix real-time chat delivery for all user combinations (homeowner↔trade, trade↔trade).
--
-- Three problems this resolves:
-- 1. REPLICA IDENTITY DEFAULT only puts the PK in WAL UPDATE/DELETE rows.
--    Filtered postgres_changes subscriptions on conversation_id need FULL so
--    the realtime service can check the filter against every event.
-- 2. Supabase realtime checks RLS SELECT before forwarding an INSERT event to a
--    subscriber.  If no SELECT policy exists the subscriber sees nothing.
-- 3. The UPDATE on is_read (marking messages read) also needs an UPDATE policy
--    so the user client can mark incoming messages read without 403 errors.

-- ── 1. Full row identity so realtime filters work on non-PK columns ────────
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ── 2. Enable RLS (idempotent) ─────────────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ── 3. SELECT: sender and recipient can read their own messages ─────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Users can read their own messages"
      ON public.messages FOR SELECT
      USING (sender_id = auth.uid() OR recipient_id = auth.uid());
    RAISE NOTICE '✓ messages SELECT policy created';
  ELSE
    RAISE NOTICE '✓ messages SELECT policy already exists';
  END IF;
END;
$$;

-- ── 4. UPDATE: recipient can mark messages as read ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "Recipients can mark messages read"
      ON public.messages FOR UPDATE
      USING (recipient_id = auth.uid())
      WITH CHECK (recipient_id = auth.uid());
    RAISE NOTICE '✓ messages UPDATE policy created';
  ELSE
    RAISE NOTICE '✓ messages UPDATE policy already exists';
  END IF;
END;
$$;

-- ── 5. INSERT: senders can insert their own messages ───────────────────────
--    (Admin client bypasses this, but the user client needs it for any direct
--     inserts and for Supabase to validate rows in the publication.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Users can insert their own messages"
      ON public.messages FOR INSERT
      WITH CHECK (sender_id = auth.uid());
    RAISE NOTICE '✓ messages INSERT policy created';
  ELSE
    RAISE NOTICE '✓ messages INSERT policy already exists';
  END IF;
END;
$$;
