-- Add ban/moderation columns to users table
-- Required by admin user management UI

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_banned      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason     TEXT,
  ADD COLUMN IF NOT EXISTS banned_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_by      UUID;

-- Fast lookup: who is currently banned
CREATE INDEX IF NOT EXISTS idx_users_is_banned
  ON public.users (is_banned)
  WHERE is_banned = true;
