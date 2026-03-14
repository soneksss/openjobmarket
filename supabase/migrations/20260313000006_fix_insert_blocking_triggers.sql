-- ============================================================
-- Migration: Drop all INSERT-blocking triggers on jobs table
-- ============================================================
-- Idempotent. Safe to re-run even if triggers are already gone.
-- This supersedes 20260313000005 (which may not have run yet).
-- ============================================================

-- ── Drop every known INSERT-touching trigger ───────────────
-- search_vector trigger (references dropped column)
DROP TRIGGER IF EXISTS trigger_update_jobs_search_vector ON public.jobs;
DROP TRIGGER IF EXISTS tsvectorupdate_jobs               ON public.jobs;

-- annual salary trigger (references dropped column)
DROP TRIGGER IF EXISTS trigger_update_annual_salary ON public.jobs;

-- ── Drop their backing functions ───────────────────────────
DROP FUNCTION IF EXISTS public.update_jobs_search_vector()      CASCADE;
DROP FUNCTION IF EXISTS public.jobs_search_vector_trigger()     CASCADE;
DROP FUNCTION IF EXISTS public.update_annual_salary()           CASCADE;

-- ── Verify: list remaining INSERT triggers on jobs ─────────
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '── Triggers that fire on INSERT for public.jobs ──────────';
  FOR r IN
    SELECT t.tgname,
           CASE t.tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
           p.proname AS function_name
    FROM pg_trigger t
    JOIN pg_proc    p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.jobs'::regclass
      AND t.tgtype  & 4 > 0   -- bit 2 set = fires on INSERT
      AND NOT t.tgisinternal
    ORDER BY t.tgname
  LOOP
    RAISE NOTICE '  % (%) → %', r.tgname, r.timing, r.function_name;
  END LOOP;

  RAISE NOTICE '── All triggers on public.jobs ───────────────────────────';
  FOR r IN
    SELECT t.tgname,
           CASE t.tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
           CASE
             WHEN t.tgtype & 4 > 0 THEN 'INSERT '  ELSE ''
           END ||
           CASE
             WHEN t.tgtype & 8 > 0 THEN 'DELETE '  ELSE ''
           END ||
           CASE
             WHEN t.tgtype & 16 > 0 THEN 'UPDATE'  ELSE ''
           END AS events,
           p.proname AS function_name
    FROM pg_trigger t
    JOIN pg_proc    p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.jobs'::regclass
      AND NOT t.tgisinternal
    ORDER BY t.tgname
  LOOP
    RAISE NOTICE '  % (%, %) → %', r.tgname, r.timing, r.events, r.function_name;
  END LOOP;
END $$;
