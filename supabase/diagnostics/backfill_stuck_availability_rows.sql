-- Backfill the 13 traders found stuck by the availability_expires_at-nulling
-- bug (fixed in contexts/available-now-context.tsx) — puts them back into
-- tomorrow's (well, today's next run of) daily-availability-prompt cycle by
-- giving them a past-due availability_expires_at, exactly what
-- expire-availability's own cron would have left behind had the client not
-- raced ahead of it.

UPDATE public.company_profiles
SET availability_expires_at = now() - interval '5 minutes'
WHERE open_for_business = false
  AND urgent_notifications_enabled = false
  AND availability_expires_at IS NULL
  AND last_availability_prompt_at IS NULL
RETURNING user_id, id AS company_id, company_name, availability_expires_at;
