-- ============================================================
-- Migration: company_activity_log
-- Purpose: Replace fake availability toggle with behavioural
--   truth — activity log drives freshness, not user state.
-- ============================================================

-- 1. Activity log table
CREATE TABLE IF NOT EXISTS public.company_activity_log (
  id          bigserial PRIMARY KEY,
  company_id  uuid        NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text      NOT NULL,
  -- examples: 'dashboard_open', 'view_jobs', 'apply_job', 'update_profile', 'message_sent'
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_company_id   ON public.company_activity_log (company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id      ON public.company_activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at   ON public.company_activity_log (created_at DESC);

-- RLS: traders can log their own activity; service_role can read all
ALTER TABLE public.company_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traders_insert_own_activity" ON public.company_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_role_all_activity" ON public.company_activity_log
  FOR ALL TO service_role
  USING (true);

-- 2. Derived activity status view (computed, never stored)
CREATE OR REPLACE VIEW public.company_activity_status AS
SELECT
  cp.id                             AS company_id,
  cp.user_id,
  MAX(a.created_at)                 AS last_seen,
  CASE
    WHEN MAX(a.created_at) >= now() - interval '24 hours' THEN 'active_today'
    WHEN MAX(a.created_at) >= now() - interval '7 days'   THEN 'active_week'
    ELSE                                                        'inactive'
  END                               AS activity_status
FROM public.company_profiles cp
LEFT JOIN public.company_activity_log a ON a.company_id = cp.id
GROUP BY cp.id, cp.user_id;

-- 3. RPC: log a single activity event (called from the dashboard client)
CREATE OR REPLACE FUNCTION public.log_company_activity(
  p_activity_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT id INTO v_company_id
  FROM company_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN RETURN; END IF;

  INSERT INTO company_activity_log (company_id, user_id, activity_type)
  VALUES (v_company_id, auth.uid(), p_activity_type);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_company_activity TO authenticated;

-- 4. Update get_traders_for_availability_prompt to also respect activity
--    (Condition B uses availability_last_updated_at — still valid; Condition A
--     adds an activity freshness guard so we never ping inactive traders.)
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
    -- must have at least one push token
    AND EXISTS (SELECT 1 FROM user_push_tokens t WHERE t.user_id = cp.user_id)
    -- must have shown some activity in the last 30 days (skip truly dead accounts)
    AND EXISTS (
      SELECT 1 FROM company_activity_log a
      WHERE a.company_id = cp.id
        AND a.created_at >= now() - interval '30 days'
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
