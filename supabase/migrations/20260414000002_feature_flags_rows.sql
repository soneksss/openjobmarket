-- ============================================================
-- Migration: Add app feature flag rows + get_public_feature_flags() RPC
-- Uses existing feature_flags table (key TEXT PK, enabled BOOLEAN, updated_at)
-- ============================================================

-- ── Part A: Insert new feature flag rows ─────────────────────
-- ON CONFLICT DO NOTHING = safe to re-run (idempotent)
INSERT INTO feature_flags (key, enabled)
VALUES
  ('ai_job_matching', false),
  ('video_quotes',    false),
  ('instant_booking', false)
ON CONFLICT (key) DO NOTHING;

-- ── Part B: Public RPC — returns all flags as a JSON object ──
-- { "vacancy_system": false, "ai_job_matching": false, ... }
-- Called alongside get_public_admin_settings() for the /api/app-config endpoint.
CREATE OR REPLACE FUNCTION get_public_feature_flags()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT COALESCE(json_object_agg(key, enabled), '{}')
  FROM feature_flags;
$$;

COMMENT ON FUNCTION public.get_public_feature_flags() IS
  'Returns all feature flags as a JSON object {key: enabled}. '
  'Safe for public/anon access — flags are intentionally public. '
  'Toggle a flag: UPDATE feature_flags SET enabled = true WHERE key = ''ai_job_matching'';';

GRANT EXECUTE ON FUNCTION public.get_public_feature_flags() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_feature_flags() TO authenticated;

-- ── Verification ─────────────────────────────────────────────
DO $$
DECLARE
  v_ai       boolean;
  v_video    boolean;
  v_booking  boolean;
  v_fn       boolean;
BEGIN
  SELECT enabled INTO v_ai      FROM feature_flags WHERE key = 'ai_job_matching';
  SELECT enabled INTO v_video   FROM feature_flags WHERE key = 'video_quotes';
  SELECT enabled INTO v_booking FROM feature_flags WHERE key = 'instant_booking';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'get_public_feature_flags' AND n.nspname = 'public'
  ) INTO v_fn;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'ai_job_matching flag     : %', CASE WHEN v_ai      IS NOT DISTINCT FROM false THEN '✓ (disabled)' ELSE '✗' END;
  RAISE NOTICE 'video_quotes flag        : %', CASE WHEN v_video   IS NOT DISTINCT FROM false THEN '✓ (disabled)' ELSE '✗' END;
  RAISE NOTICE 'instant_booking flag     : %', CASE WHEN v_booking IS NOT DISTINCT FROM false THEN '✓ (disabled)' ELSE '✗' END;
  RAISE NOTICE 'get_public_feature_flags : %', CASE WHEN v_fn THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE '✅ Migration 20260414000002 complete';
END;
$$;
