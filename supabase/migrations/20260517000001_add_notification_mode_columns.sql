-- Add urgent/flexible notification mode columns to company_profiles.
-- These replace the mixed use of open_for_business + trade_job_notifications for
-- controlling which job types a tradesperson receives notifications for.

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS urgent_notifications_enabled      BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS urgent_notifications_expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flexible_notifications_enabled    BOOLEAN   DEFAULT TRUE;

-- Auto-expire urgent notifications: if now() > urgent_notifications_expires_at,
-- the application layer (dashboard load / cron) is responsible for clearing the flag.
-- No DB trigger needed — the UI reads expires_at and treats stale = off.
