-- "Available now" now resets at a fixed daily time (9am) instead of a rolling
-- 24h window from when it was toggled on — see lib/availability.ts. That part
-- is purely an application-layer change (what gets written to
-- urgent_notifications_expires_at / availability_expires_at), no schema change
-- needed for it.
--
-- This migration fixes a real bug found while making that change: the 9:00am
-- expire-availability cron was nulling urgent_notifications_expires_at, but
-- the 9:05am daily-availability-prompt cron needs that (now-past) timestamp
-- to find who to send the confirmation push to — so it was finding almost
-- nobody. Stop nulling the timestamp here; it just stays stale until the
-- trader re-toggles or responds to the prompt (confirm/decline both overwrite
-- or clear it explicitly).
CREATE OR REPLACE FUNCTION public.expire_urgent_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.company_profiles
  SET
    urgent_notifications_enabled = FALSE
  WHERE urgent_notifications_enabled = TRUE
    AND urgent_notifications_expires_at IS NOT NULL
    AND urgent_notifications_expires_at <= now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;
