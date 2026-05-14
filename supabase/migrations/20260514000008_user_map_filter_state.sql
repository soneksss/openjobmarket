-- ============================================================
-- Migration: map_filter_event_log_v1
-- Purpose:
--   Fully eliminate UI hydration risk by enforcing:
--   - URL as ONLY UI state (outside DB scope)
--   - DB as append-only analytics event log
--   - No server-derived filter state used for rendering
--   - Safe RPC logging with auth guard
-- ============================================================

-- ------------------------------------------------------------
-- 1. EVENT LOG TABLE (ANALYTICS ONLY - NEVER UI STATE)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_map_filter_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  radius_miles INT,
  category TEXT,
  rating_min NUMERIC,
  availability_only BOOLEAN DEFAULT FALSE,

  source TEXT DEFAULT 'url',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_filter_event_user
  ON public.user_map_filter_event_log(user_id);

CREATE INDEX IF NOT EXISTS idx_map_filter_event_created
  ON public.user_map_filter_event_log(created_at DESC);

-- ------------------------------------------------------------
-- 2. RLS (INSERT ONLY - NO SELECT TO PREVENT UI MISUSE)
-- ------------------------------------------------------------

ALTER TABLE public.user_map_filter_event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_filter_event" ON public.user_map_filter_event_log;

CREATE POLICY "insert_own_filter_event"
  ON public.user_map_filter_event_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- 3. RPC (SAFE + AUTH GUARDED LOGGING ONLY)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_map_filter_event(
  p_radius_miles      INT     DEFAULT NULL,
  p_category          TEXT    DEFAULT NULL,
  p_rating_min        NUMERIC DEFAULT NULL,
  p_availability_only BOOLEAN DEFAULT FALSE,
  p_source            TEXT    DEFAULT 'url'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- prevent anonymous writes
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_map_filter_event_log (
    user_id, radius_miles, category, rating_min, availability_only, source
  )
  VALUES (
    auth.uid(), p_radius_miles, p_category, p_rating_min, p_availability_only, p_source
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_map_filter_event TO authenticated;

-- ------------------------------------------------------------
-- 4. OPTIONAL ANALYTICS VIEW (NON-UI ONLY)
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW public.user_map_filter_activity AS
SELECT
  user_id,
  MAX(created_at) AS last_used_filters,

  CASE
    WHEN MAX(created_at) >= NOW() - INTERVAL '24 hours' THEN 'active_today'
    WHEN MAX(created_at) >= NOW() - INTERVAL '7 days'   THEN 'active_week'
    ELSE 'inactive'
  END AS activity_status
FROM public.user_map_filter_event_log
GROUP BY user_id;

-- ------------------------------------------------------------
-- 5. ARCHITECTURE GUARANTEE (HARD CONTRACT)
-- ------------------------------------------------------------

COMMENT ON TABLE public.user_map_filter_event_log IS
'ANALYTICS ONLY. MUST NOT BE USED FOR UI STATE OR SSR RENDERING. UI STATE COMES EXCLUSIVELY FROM URL PARAMETERS.';

COMMENT ON FUNCTION public.log_map_filter_event IS
'Logs filter usage only. Never used for UI state, SSR, or rendering logic.';
