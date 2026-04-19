-- Fix: add missing `active` column to admin_users
-- The get_admin_settings() and update_admin_settings() RPCs both query
--   WHERE user_id = auth.uid() AND active = true
-- but the column never existed, causing a runtime error on every call.
-- Default true so all existing admins stay active with no manual update.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Verify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'active'
  ) THEN
    RAISE EXCEPTION 'active column still missing from admin_users';
  END IF;
  RAISE NOTICE '✓ admin_users.active column added — settings page will load correctly';
END;
$$;
