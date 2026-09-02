-- ============================================================================
-- Deactivation trigger for tradesperson_live_locations
-- Date: 2026-09-01  (split out of 20260901000007)
--
-- When a company goes "not available" (open_for_business OR
-- urgent_notifications_enabled true→false) — from the toggle, the client
-- expiry guard, or the 9:00 AM expire-availability cron — deactivate its live
-- location row in the same statement. Never re-activates: the client creates a
-- fresh active row on the next GPS ping when "Available now" goes back on.
--
-- CREATE TRIGGER needs a strong lock on company_profiles (one of the hottest
-- tables). Run this on its own, ideally during low traffic. If it fails with
-- "deadlock detected" / "canceling statement due to lock timeout", nothing was
-- committed — just run it again.
-- ============================================================================

SET lock_timeout = '8s';

CREATE OR REPLACE FUNCTION public.deactivate_live_location_on_unavailable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(OLD.open_for_business, false)            AND NOT COALESCE(NEW.open_for_business, false))
  OR (COALESCE(OLD.urgent_notifications_enabled, false) AND NOT COALESCE(NEW.urgent_notifications_enabled, false))
  THEN
    UPDATE public.tradesperson_live_locations
    SET    is_active = false
    WHERE  company_id = NEW.id AND is_active;
  END IF;
  RETURN NEW;
END;
$$;

-- Take the lock explicitly and up front so it fails fast (lock_timeout) rather
-- than deadlocking half-way through.
LOCK TABLE public.company_profiles IN SHARE ROW EXCLUSIVE MODE;

DROP TRIGGER IF EXISTS trg_deactivate_live_location ON public.company_profiles;
CREATE TRIGGER trg_deactivate_live_location
AFTER UPDATE OF open_for_business, urgent_notifications_enabled ON public.company_profiles
FOR EACH ROW
EXECUTE FUNCTION public.deactivate_live_location_on_unavailable();

DO $$ BEGIN RAISE NOTICE 'trg_deactivate_live_location installed on company_profiles'; END $$;
