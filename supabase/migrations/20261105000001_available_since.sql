-- ============================================================================
-- company_profiles.available_since: when the tradesperson last went
-- "Available now", for the map bar's "Live for 2h 15m".
--
-- Kept by a trigger rather than by each writer, because availability is
-- switched from several places (the toggle, the 9 AM confirm push, the
-- decline push, the expire-availability cron): set when
-- urgent_notifications_enabled turns on, cleared when it turns off.
-- Rows already on keep NULL — the bar then shows "Live" without a duration.
-- ============================================================================

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS available_since TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.company_profiles_set_available_since()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.urgent_notifications_enabled, FALSE) THEN
    IF NOT COALESCE(OLD.urgent_notifications_enabled, FALSE) THEN
      NEW.available_since := NOW();
    END IF;
  ELSE
    NEW.available_since := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_profiles_available_since ON public.company_profiles;
CREATE TRIGGER trg_company_profiles_available_since
  BEFORE UPDATE OF urgent_notifications_enabled ON public.company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.company_profiles_set_available_since();

DO $$ BEGIN
  RAISE NOTICE '✓ company_profiles.available_since + trigger ready';
END $$;
