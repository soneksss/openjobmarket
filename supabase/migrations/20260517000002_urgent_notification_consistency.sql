-- ============================================================
-- Urgent/flexible notification system — consistency layer
-- ============================================================


-- ------------------------------------------------------------
-- 1. SOURCE-OF-TRUTH VIEW FOR URGENT DISPATCH
-- ------------------------------------------------------------
-- All urgent job dispatch MUST query this view, never raw table.
-- Enforces expiry check server-side so stale clients cannot
-- cause a tradesperson to receive notifications after their
-- 24h window has closed.

CREATE OR REPLACE VIEW public.active_urgent_tradespeople AS
SELECT *
FROM public.company_profiles
WHERE urgent_notifications_enabled = TRUE
  AND urgent_notifications_expires_at IS NOT NULL
  AND urgent_notifications_expires_at > now();


-- ------------------------------------------------------------
-- 2. TRIGGER: keep open_for_business in sync with urgent mode
-- ------------------------------------------------------------
-- Rule: enabling urgent notifications always marks the
-- tradesperson as open for business. Disabling does NOT
-- automatically close them — they may still want to appear on
-- the map for flexible jobs.

CREATE OR REPLACE FUNCTION public.sync_urgent_business_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.urgent_notifications_enabled = TRUE THEN
    NEW.open_for_business := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_urgent_business_state ON public.company_profiles;

CREATE TRIGGER trg_sync_urgent_business_state
BEFORE INSERT OR UPDATE OF urgent_notifications_enabled
ON public.company_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_urgent_business_state();


-- ------------------------------------------------------------
-- 3. FUNCTION: server-side expiry cleanup
-- ------------------------------------------------------------
-- Called by the expire-availability cron every few minutes.
-- Clears urgent_notifications_enabled when the 24h window has
-- passed, regardless of what the client last wrote.

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
    urgent_notifications_enabled    = FALSE,
    urgent_notifications_expires_at = NULL
  WHERE urgent_notifications_enabled = TRUE
    AND urgent_notifications_expires_at IS NOT NULL
    AND urgent_notifications_expires_at <= now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;


-- ------------------------------------------------------------
-- 4. LEGACY FIELD DEPRECATION MARKERS
-- ------------------------------------------------------------

COMMENT ON COLUMN public.company_profiles.trade_job_notifications IS
'DEPRECATED — replaced by flexible_notifications_enabled. Do not use for new dispatch logic.';

COMMENT ON COLUMN public.company_profiles.flexible_job_notifications IS
'DEPRECATED — replaced by flexible_notifications_enabled. Do not use for new dispatch logic.';

COMMENT ON COLUMN public.company_profiles.open_for_business IS
'DERIVED — automatically set TRUE by trg_sync_urgent_business_state when urgent mode is on. '
'Do not rely on this alone for notification targeting; use active_urgent_tradespeople view instead.';
