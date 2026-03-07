-- ============================================================
-- Migration: Feature flags table + vacancy system kill-switch
-- Task 3 of 3 — disable vacancy system at the database layer
-- ============================================================
-- Architecture:
--   1. feature_flags table  — single source of truth
--   2. is_vacancy_system_enabled() helper — reusable in RPCs
--   3. RESTRICTIVE RLS policy on vacancy_applications
--      — blocks even direct table access when flag is off
--   4. accept_job_application() guard — belt-and-suspenders
--      (function is already deprecated; guard added as template)
--
-- To re-enable the vacancy system:
--   UPDATE feature_flags SET enabled = true
--   WHERE key = 'vacancy_system';
-- No migrations, no rework, no risk.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  PART A: feature_flags table
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key        TEXT    PRIMARY KEY,
  enabled    BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.feature_flags IS
  'Global on/off switches for optional system features. '
  'Toggle with: UPDATE feature_flags SET enabled = true WHERE key = ''vacancy_system'';';

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read flags (needed for RLS sub-queries
-- on vacancy_applications and for is_vacancy_system_enabled())
CREATE POLICY "authenticated can read feature_flags"
  ON public.feature_flags
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service_role may write (admin RPCs use SECURITY DEFINER
-- which runs as postgres/service_role, bypassing this restriction)
-- No INSERT/UPDATE/DELETE policy for authenticated → implicitly denied.


-- ── Initial data ─────────────────────────────────────────────
INSERT INTO public.feature_flags (key, enabled)
VALUES ('vacancy_system', false)
ON CONFLICT (key) DO NOTHING;   -- idempotent re-run

DO $$ BEGIN
  RAISE NOTICE '✓ feature_flags table created and vacancy_system flag inserted (enabled = false)';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART B: is_vacancy_system_enabled() helper
-- ════════════════════════════════════════════════════════════
-- SECURITY DEFINER so it bypasses RLS when used inside other
-- SECURITY DEFINER functions / trigger guards.
-- Returns TRUE when the flag exists and enabled = true.
-- Returns FALSE if the row is missing (safe default = off).

CREATE OR REPLACE FUNCTION public.is_vacancy_system_enabled()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM feature_flags WHERE key = 'vacancy_system'),
    false
  );
$$;

COMMENT ON FUNCTION public.is_vacancy_system_enabled() IS
  'Returns TRUE when the vacancy_system feature flag is enabled. '
  'Used in RLS policies and RPC guards. '
  'Toggle: UPDATE feature_flags SET enabled = true WHERE key = ''vacancy_system'';';

GRANT EXECUTE ON FUNCTION public.is_vacancy_system_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_vacancy_system_enabled() TO anon;


-- ════════════════════════════════════════════════════════════
--  PART C: RESTRICTIVE RLS policy on vacancy_applications
-- ════════════════════════════════════════════════════════════
-- RESTRICTIVE policies use AND semantics — all restrictive
-- policies must pass, regardless of permissive policies.
-- This blocks every SELECT / INSERT / UPDATE / DELETE on
-- vacancy_applications for authenticated/anon users when the
-- flag is off — even direct table queries bypass the application
-- layer entirely and still hit this wall.
-- service_role bypasses RLS by design (for admin maintenance).

DROP POLICY IF EXISTS "vacancy_system_must_be_enabled"
  ON public.vacancy_applications;

CREATE POLICY "vacancy_system_must_be_enabled"
  ON public.vacancy_applications
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (public.is_vacancy_system_enabled())
  WITH CHECK (public.is_vacancy_system_enabled());

COMMENT ON POLICY "vacancy_system_must_be_enabled"
  ON public.vacancy_applications IS
  'RESTRICTIVE: blocks all access to vacancy_applications '
  'when feature_flags.vacancy_system = false. '
  'Toggle via UPDATE feature_flags, not a migration.';

DO $$ BEGIN
  RAISE NOTICE '✓ RESTRICTIVE RLS policy added to vacancy_applications';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART D: Guard pattern in accept_job_application()
-- ════════════════════════════════════════════════════════════
-- This function was deprecated in migration 20260303000003.
-- The flag check is added here as a canonical template for
-- any future vacancy RPCs.

CREATE OR REPLACE FUNCTION public.accept_job_application(
  p_job_id         UUID,
  p_application_id UUID,
  p_homeowner_id   UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Feature flag guard (template for all vacancy RPCs) ────
  IF NOT public.is_vacancy_system_enabled() THEN
    RAISE EXCEPTION 'Vacancy system is currently disabled'
      USING ERRCODE = 'feature_not_supported';
  END IF;

  -- ── Deprecated: superseded by state machine RPCs ──────────
  RAISE EXCEPTION
    'accept_job_application() is no longer available. '
    'Use confirm_tradesperson(p_job_id, p_tradesperson_id) instead. '
    'See migration 20260302000004.'
    USING ERRCODE = 'feature_not_supported';
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_job_application(UUID, UUID, UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ accept_job_application() updated with feature flag guard (template for future vacancy RPCs)';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART E: Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_table_exists   BOOLEAN;
  v_flag_value     BOOLEAN;
  v_fn_exists      BOOLEAN;
  v_policy_exists  BOOLEAN;
  v_rls_enabled    BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'feature_flags'
  ) INTO v_table_exists;

  SELECT enabled INTO v_flag_value
  FROM feature_flags WHERE key = 'vacancy_system';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_vacancy_system_enabled' AND n.nspname = 'public'
  ) INTO v_fn_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vacancy_applications'
      AND policyname = 'vacancy_system_must_be_enabled'
  ) INTO v_policy_exists;

  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'vacancy_applications'
    AND relnamespace = 'public'::regnamespace;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'feature_flags table                    : %', CASE WHEN v_table_exists  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'vacancy_system flag (enabled = false)  : %', CASE WHEN v_flag_value IS NOT DISTINCT FROM false THEN '✓' ELSE '✗ WRONG VALUE: ' || v_flag_value::text END;
  RAISE NOTICE 'is_vacancy_system_enabled() function   : %', CASE WHEN v_fn_exists    THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'RESTRICTIVE policy on vacancy_apps     : %', CASE WHEN v_policy_exists THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'RLS on vacancy_applications            : %', CASE WHEN v_rls_enabled   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_table_exists AND v_fn_exists AND v_policy_exists AND v_rls_enabled
          AND v_flag_value IS NOT DISTINCT FROM false) THEN
    RAISE EXCEPTION 'Task 3 (DB layer) verification failed — see NOTICE output above';
  END IF;

  RAISE NOTICE '✅ Task 3 complete: vacancy system disabled at database layer';
  RAISE NOTICE '';
  RAISE NOTICE 'To re-enable when ready to launch:';
  RAISE NOTICE '  UPDATE feature_flags SET enabled = true WHERE key = ''vacancy_system'';';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
