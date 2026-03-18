-- Speed up the notifications inbox query:
--   WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
-- Also speeds up the mark-as-read UPDATE and DELETE by id.

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications (user_id, created_at DESC);

DO $$ BEGIN
  RAISE NOTICE '✓ idx_notifications_user created';
END $$;
