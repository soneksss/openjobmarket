-- ============================================================
-- Migration: Drop legacy job triggers referencing removed columns
-- ============================================================
-- search_vector, salary_min, salary_max were dropped in migration
-- 20260313000004. Any trigger that references them causes INSERT
-- to hang or error. Drop them all here.
-- ============================================================

-- ── Drop triggers ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trigger_update_jobs_search_vector ON public.jobs;
DROP TRIGGER IF EXISTS tsvectorupdate_jobs               ON public.jobs;
DROP TRIGGER IF EXISTS trigger_update_annual_salary      ON public.jobs;

-- ── Drop functions ────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_jobs_search_vector() CASCADE;
DROP FUNCTION IF EXISTS public.jobs_search_vector_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.update_annual_salary()       CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✓ Legacy job triggers and functions dropped';
END; $$;
