-- Speed up the messages inbox query:
--   WHERE sender_id = $1 OR recipient_id = $1
--   ORDER BY created_at DESC
-- Without indexes Postgres does a seq scan over every message row.

CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON public.messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_recipient
  ON public.messages (recipient_id, created_at DESC);

DO $$ BEGIN
  RAISE NOTICE '✓ idx_messages_sender + idx_messages_recipient created';
END $$;
