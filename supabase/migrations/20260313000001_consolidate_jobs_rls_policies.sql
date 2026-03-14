-- ============================================================
-- Migration: Consolidate jobs table RLS policies
-- ============================================================
-- The jobs table accumulated 14 overlapping RLS policies from
-- multiple migrations. PostgreSQL evaluates ALL applicable
-- policies on every query, so duplicate/redundant policies
-- multiply the subquery cost and cause INSERT hangs.
--
-- This migration:
--   1. Drops all existing jobs RLS policies
--   2. Re-creates exactly 4 clean, indexed policies
-- ============================================================

-- ── Drop every existing policy ──────────────────────────────
DROP POLICY IF EXISTS "All users can manage their own jobs"          ON public.jobs;
DROP POLICY IF EXISTS "Anyone can view active jobs"                  ON public.jobs;
DROP POLICY IF EXISTS "Business accounts can post trade jobs"        ON public.jobs;
DROP POLICY IF EXISTS "Companies can delete their jobs"              ON public.jobs;
DROP POLICY IF EXISTS "Companies can insert jobs"                    ON public.jobs;
DROP POLICY IF EXISTS "Companies can update their jobs"              ON public.jobs;
DROP POLICY IF EXISTS "Homeowners can insert jobs"                   ON public.jobs;
DROP POLICY IF EXISTS "Professionals with homeowner permission can insert trade jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs"              ON public.jobs;
DROP POLICY IF EXISTS "Users can update their own jobs"              ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete_own_company"                      ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_own_company"                      ON public.jobs;
DROP POLICY IF EXISTS "jobs_select_active"                           ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_own_company"                      ON public.jobs;

-- ── Re-create 4 consolidated policies ───────────────────────

-- SELECT: active jobs visible to everyone; owner always sees their own
CREATE POLICY "jobs_select"
  ON public.jobs FOR SELECT
  USING (
    is_active = true
    OR company_id    IN (SELECT id FROM company_profiles    WHERE user_id = auth.uid())
    OR homeowner_id  IN (SELECT id FROM homeowner_profiles  WHERE user_id = auth.uid())
  );

-- INSERT: owner must match the profile id they claim
CREATE POLICY "jobs_insert"
  ON public.jobs FOR INSERT
  WITH CHECK (
    (company_id   IS NOT NULL AND company_id   IN (SELECT id FROM company_profiles   WHERE user_id = auth.uid()))
    OR
    (homeowner_id IS NOT NULL AND homeowner_id IN (SELECT id FROM homeowner_profiles WHERE user_id = auth.uid()))
  );

-- UPDATE: only the owner can update
CREATE POLICY "jobs_update"
  ON public.jobs FOR UPDATE
  USING (
    company_id   IN (SELECT id FROM company_profiles   WHERE user_id = auth.uid())
    OR homeowner_id IN (SELECT id FROM homeowner_profiles WHERE user_id = auth.uid())
  );

-- DELETE: only the owner can delete
CREATE POLICY "jobs_delete"
  ON public.jobs FOR DELETE
  USING (
    company_id   IN (SELECT id FROM company_profiles   WHERE user_id = auth.uid())
    OR homeowner_id IN (SELECT id FROM homeowner_profiles WHERE user_id = auth.uid())
  );

-- ── Ensure indexes exist for the subqueries above ───────────
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id
  ON public.company_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_homeowner_profiles_user_id
  ON public.homeowner_profiles (user_id);

DO $$ BEGIN
  RAISE NOTICE '✓ jobs RLS consolidated: 14 policies → 4 policies';
END $$;
