-- ============================================================
-- Fix remaining Supabase Security Advisor warnings
--
-- Already handled in earlier migrations:
--   • seeded_trades RLS          → 20260509000001
--   • user_push_tokens RLS       → 20260508000004
--   • spatial_ref_sys REVOKE     → 20260508000004
--
-- NOTE: ALTER EXTENSION postgis SET SCHEMA postgis is intentionally
-- omitted. The app uses geography columns and ST_DWithin extensively
-- (see 20260303000007, 20260323000001). Moving the extension would
-- break all spatial queries. The REVOKE in 20260508000004 already
-- removes public API exposure of spatial_ref_sys.
-- ============================================================

-- ── 1. seeded_trades_email_export — fix SECURITY DEFINER warning ──────────────
-- Views without security_invoker run as the owner (SECURITY DEFINER),
-- bypassing RLS on the underlying table.

DROP VIEW IF EXISTS public.seeded_trades_email_export;

CREATE VIEW public.seeded_trades_email_export
WITH (security_invoker = true)
AS
SELECT
  company_name,
  email,
  trade_category,
  claim_url
FROM public.seeded_trades
WHERE claimed = false
  AND email IS NOT NULL;

-- Restrict to backend/admin only — never expose emails to anon or authenticated users
REVOKE ALL ON public.seeded_trades_email_export FROM anon;
REVOKE ALL ON public.seeded_trades_email_export FROM authenticated;
GRANT  SELECT ON public.seeded_trades_email_export TO service_role;

-- ── 2. company_profiles — enable RLS ─────────────────────────────────────────
-- No previous migration enabled RLS on this table.

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Public (including anon) can read all company profiles
DROP POLICY IF EXISTS "company_profiles_public_select" ON public.company_profiles;
CREATE POLICY "company_profiles_public_select"
  ON public.company_profiles FOR SELECT
  USING (true);

-- Only the owning tradesperson can insert their own profile
DROP POLICY IF EXISTS "company_profiles_owner_insert" ON public.company_profiles;
CREATE POLICY "company_profiles_owner_insert"
  ON public.company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only the owning tradesperson can update their own profile
DROP POLICY IF EXISTS "company_profiles_owner_update" ON public.company_profiles;
CREATE POLICY "company_profiles_owner_update"
  ON public.company_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the owning tradesperson can delete their own profile
DROP POLICY IF EXISTS "company_profiles_owner_delete" ON public.company_profiles;
CREATE POLICY "company_profiles_owner_delete"
  ON public.company_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 3. spatial_ref_sys — belt-and-braces REVOKE (idempotent) ─────────────────
-- Already done in 20260508000004 but safe to repeat.
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ Security warnings fixed: email export view, company_profiles RLS, spatial_ref_sys';
END $$;
