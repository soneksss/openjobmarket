-- ============================================================
-- Migration: availability_cron_security_and_prompt_tracking
-- Purpose:
--   1. Ensure daily availability prompts cannot spam traders
--   2. Track last prompt time
--   3. Add helper RPCs for cron jobs
-- ============================================================

-- 1. Ensure column exists for prompt deduplication
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS last_availability_prompt_at timestamptz;

-- ============================================================
-- 2. Function: get traders eligible for daily availability prompt
-- Conditions:
--   - availability expired
--   - availability_expires_at IS NOT NULL
--   - last prompt older than 12 hours (or null)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_traders_for_availability_prompt()
RETURNS TABLE (
  user_id uuid,
  company_id uuid,
  latitude numeric,
  longitude numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    user_id,
    id,
    latitude,
    longitude
  FROM company_profiles
  WHERE availability_expires_at IS NOT NULL
    AND availability_expires_at < now()
    AND (
      last_availability_prompt_at IS NULL
      OR last_availability_prompt_at < now() - interval '12 hours'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_traders_for_availability_prompt TO service_role;

-- ============================================================
-- 3. Function: mark trader as prompted
-- Called by cron after sending push notification
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_availability_prompt_sent(p_company_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE company_profiles
  SET last_availability_prompt_at = now()
  WHERE id = p_company_id;
$$;

GRANT EXECUTE ON FUNCTION public.mark_availability_prompt_sent TO service_role;

-- ============================================================
-- 4. Function: decline availability (used by push notification)
-- Sets availability_expires_at = NULL so cron never targets them again
-- ============================================================

CREATE OR REPLACE FUNCTION public.decline_availability()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE company_profiles
  SET availability_expires_at = NULL
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.decline_availability TO authenticated;

-- ============================================================
-- Done
-- This migration ensures:
--   ✓ no duplicate prompts within 12h
--   ✓ traders can permanently decline reminders
--   ✓ cron can safely mark prompts as sent
-- ============================================================
