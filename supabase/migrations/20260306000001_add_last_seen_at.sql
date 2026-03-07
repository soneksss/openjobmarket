-- Add last_seen_at to users table for online/offline presence
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Index for quick online checks
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users (last_seen_at);
