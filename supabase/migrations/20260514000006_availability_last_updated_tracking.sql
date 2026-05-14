-- ============================================================
-- Migration: availability_last_updated_tracking
-- Purpose: Prevent the "Busy Forever" bug where traders who
--   manually turn Busy are silently ignored by all crons.
--
-- Solution: track every availability toggle interaction.
-- The daily-prompt cron gains a second condition that catches
-- traders stuck Busy for 7+ days and re-engages them weekly.
-- ============================================================

-- 1. Add tracking column
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS availability_last_updated_at timestamptz;

-- 2. Backfill — use last_availability_confirmed_at if available,
--    otherwise fall back to updated_at / now()
UPDATE public.company_profiles
SET availability_last_updated_at = COALESCE(
  last_availability_confirmed_at,
  updated_at,
  now()
)
WHERE availability_last_updated_at IS NULL;

-- 3. Replace get_traders_for_availability_prompt with two-condition query:
--
--   Condition A — Normal 24 h expiry cycle:
--     availability expired AND prompted > 12 h ago (or never)
--
--   Condition B — Stuck Busy re-engagement:
--     availability_expires_at IS NULL (manually went Busy or never enabled)
--     AND last toggle > 7 days ago
--     AND last prompt > 7 days ago (or never)
--     AND availability_last_updated_at is known (guards against unset backfills)
--
-- This means:
--   • Active traders keep their daily 24 h reminder cycle
--   • Traders who declined a reminder (NULL expiry, last_updated = now) are
--     silent for 7 days before being re-engaged
--   • Traders who went Busy manually weeks ago get a weekly nudge

CREATE OR REPLACE FUNCTION public.get_traders_for_availability_prompt()
RETURNS TABLE (
  user_id    uuid,
  company_id uuid,
  latitude   numeric,
  longitude  numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.user_id, cp.id, cp.latitude, cp.longitude
  FROM company_profiles cp
  WHERE
    cp.user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_push_tokens t WHERE t.user_id = cp.user_id
    )
    AND (
      -- Condition A: normal expiry → daily reminder
      (
        cp.availability_expires_at IS NOT NULL
        AND cp.availability_expires_at < now()
        AND (
          cp.last_availability_prompt_at IS NULL
          OR cp.last_availability_prompt_at < now() - interval '12 hours'
        )
      )
      OR
      -- Condition B: stuck Busy → weekly re-engagement
      (
        cp.availability_expires_at IS NULL
        AND cp.availability_last_updated_at IS NOT NULL
        AND cp.availability_last_updated_at < now() - interval '7 days'
        AND (
          cp.last_availability_prompt_at IS NULL
          OR cp.last_availability_prompt_at < now() - interval '7 days'
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_traders_for_availability_prompt TO service_role;
