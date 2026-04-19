-- ============================================================
-- Harden presence system
-- ============================================================

-- 1) Deprecate is_online — presence must derive from last_seen_at
COMMENT ON COLUMN users.is_online IS
  'DEPRECATED — do not read or write. Presence status must be derived '
  'from last_seen_at using the user_presence view or the CASE expression '
  'directly. This column will be dropped in a future migration.';

-- 2) Canonical presence view — single source of truth for all consumers
--    NULL-safe: last_seen_at IS NULL → 'offline', minutes_ago → NULL
CREATE OR REPLACE VIEW user_presence AS
SELECT
  id,
  last_seen_at,
  CASE
    WHEN last_seen_at IS NULL                         THEN 'offline'
    WHEN last_seen_at > NOW() - INTERVAL '2 minutes'  THEN 'online'
    WHEN last_seen_at > NOW() - INTERVAL '10 minutes' THEN 'away'
    ELSE 'offline'
  END AS presence_status,
  CASE
    WHEN last_seen_at IS NULL THEN NULL
    ELSE ROUND(EXTRACT(EPOCH FROM (NOW() - last_seen_at)) / 60.0, 1)
  END AS minutes_ago
FROM users;

-- 3) Plain btree index on last_seen_at (descending, nulls last).
--    PostgreSQL does not allow NOW() in partial-index predicates because
--    it is not immutable — a plain index on the column is correct here.
--    The query planner uses it automatically for range scans like
--      WHERE last_seen_at > NOW() - INTERVAL '2 minutes'.
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at_desc
  ON users (last_seen_at DESC NULLS LAST);

-- 4) Debug helper — inspect live presence from any Postgres client
CREATE OR REPLACE FUNCTION debug_user_presence()
RETURNS TABLE (
  user_id      UUID,
  last_seen_at TIMESTAMPTZ,
  minutes_ago  NUMERIC,
  status       TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    last_seen_at,
    CASE
      WHEN last_seen_at IS NULL THEN NULL
      ELSE ROUND(EXTRACT(EPOCH FROM (NOW() - last_seen_at)) / 60.0, 1)
    END,
    CASE
      WHEN last_seen_at IS NULL                         THEN 'offline'
      WHEN last_seen_at > NOW() - INTERVAL '2 minutes'  THEN 'online'
      WHEN last_seen_at > NOW() - INTERVAL '10 minutes' THEN 'away'
      ELSE 'offline'
    END
  FROM users
  ORDER BY last_seen_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION debug_user_presence() TO authenticated;

-- ── Verification ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'user_presence') THEN
    RAISE EXCEPTION 'user_presence view was not created';
  END IF;
  RAISE NOTICE '✓ is_online deprecated via column comment';
  RAISE NOTICE '✓ user_presence view created';
  RAISE NOTICE '✓ idx_users_last_seen_at_desc index ensured';
  RAISE NOTICE '✓ debug_user_presence() function created';
END;
$$;
