-- Find every trader stuck by the availability_expires_at-nulling bug:
-- currently marked not-available, but with no expiry timestamp for the
-- daily-availability-prompt cron to key off of, and never prompted.
SELECT user_id, id AS company_id, company_name, open_for_business,
       urgent_notifications_enabled, availability_expires_at, last_availability_prompt_at
FROM public.company_profiles
WHERE open_for_business = false
  AND availability_expires_at IS NULL
  AND last_availability_prompt_at IS NULL;

-- To put them back into tomorrow's prompt cycle immediately (safe — this is
-- exactly what the expire-availability cron itself would have left behind
-- had the client not raced ahead of it), backfill availability_expires_at to
-- a few minutes in the past so it satisfies `< now()` right away:
-- UPDATE public.company_profiles
-- SET availability_expires_at = now() - interval '5 minutes'
-- WHERE open_for_business = false
--   AND availability_expires_at IS NULL
--   AND last_availability_prompt_at IS NULL;
