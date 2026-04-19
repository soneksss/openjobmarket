-- ============================================================
-- Presence tracking: last_seen_at + is_online on users
-- is_online is kept for backward compat / index hot path,
-- but actual online/away/offline status ALWAYS derives from
-- last_seen_at so it's accurate without any cron job.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_online    BOOLEAN NOT NULL DEFAULT false;

-- Descending so "most-recently-seen" queries hit the index
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
  ON users (last_seen_at DESC NULLS LAST);

-- Partial index for the "who is online right now" fast path
-- Rewritten by the heartbeat API; stale rows automatically fall
-- out of any query that checks last_seen_at > NOW() - INTERVAL '2 minutes'
CREATE INDEX IF NOT EXISTS idx_users_is_online
  ON users (is_online)
  WHERE is_online = true;

-- ── Verification ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_seen_at'
  ) THEN
    RAISE EXCEPTION 'last_seen_at column missing from users — migration failed';
  END IF;
  RAISE NOTICE '✓ users.last_seen_at added';
  RAISE NOTICE '✓ users.is_online added';
  RAISE NOTICE '✓ Presence tracking indexes created';
END;
$$;
