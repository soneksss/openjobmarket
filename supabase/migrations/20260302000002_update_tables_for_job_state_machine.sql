-- ============================================================
-- Migration: Update tables for urgent job state machine
-- Task 2 of 7
-- ============================================================
-- We ALTER the existing jobs and job_applications tables in
-- place. Legacy columns are preserved for backward compat.
-- Status columns are migrated from old lowercase enums to
-- the new uppercase enums created in Task 1.
--
-- Views strategy:
--   company_analytics – dropped (not needed going forward).
--   job_status_view   – dropped then recreated identically.
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  PART A: jobs table
-- ════════════════════════════════════════════════════════════

-- ─── A1. Add confirmed_tradesperson_id ──────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS confirmed_tradesperson_id UUID
    REFERENCES company_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN jobs.confirmed_tradesperson_id IS
  'The company_profile.id of the tradesperson confirmed for this job. Must be set when status = CONFIRMED.';

-- ─── A2. Add is_urgent boolean ───────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN jobs.is_urgent IS
  'Whether this is an urgent/trade job subject to the state machine. Default TRUE for new trade jobs.';

-- ─── A3. Drop everything that references jobs.status ─────────
-- Views
DROP VIEW IF EXISTS public.company_analytics CASCADE;
DROP VIEW IF EXISTS public.job_status_view CASCADE;

-- Partial indexes with WHERE status = 'open' predicates.
-- These cause "operator does not exist: job_status = text"
-- when PostgreSQL tries to rebuild them for the new column type.
DROP INDEX IF EXISTS public.idx_jobs_search_base;
DROP INDEX IF EXISTS public.idx_jobs_vacancies_common;
DROP INDEX IF EXISTS public.idx_jobs_trades_common;

-- Any other index that has a status predicate (catch-all)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'jobs'
      AND indexdef ILIKE '%status%=%'
      AND indexname NOT IN (
        'idx_jobs_search_base',
        'idx_jobs_vacancies_common',
        'idx_jobs_trades_common'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
    RAISE NOTICE 'Dropped status-predicate index: %', r.indexname;
  END LOOP;
END;
$$;

-- ─── A4. Migrate jobs.status to new job_status enum ─────────
-- Use EXECUTE inside the DO block so PL/pgSQL does NOT resolve
-- types in the USING clause — the SQL parser handles it instead.
-- Use searched CASE (WHEN condition THEN) not simple CASE
-- (CASE expr WHEN val) to avoid "operator does not exist:
-- job_status = text" caused by PL/pgSQL's type unification.
DO $$
DECLARE
  v_udt_name TEXT;
BEGIN
  SELECT udt_name
    INTO v_udt_name
  FROM information_schema.columns
  WHERE table_name = 'jobs' AND column_name = 'status';

  IF v_udt_name IS NULL THEN
    EXECUTE 'ALTER TABLE jobs ADD COLUMN status job_status NOT NULL DEFAULT ''POSTED''';
    RAISE NOTICE '✓ Added jobs.status (new column)';

  ELSIF v_udt_name = 'job_status' THEN
    RAISE NOTICE '✓ jobs.status already job_status enum, skipping';

  ELSE
    -- Drop default before type change
    EXECUTE 'ALTER TABLE jobs ALTER COLUMN status DROP DEFAULT';

    -- Searched CASE inside EXECUTE: each WHEN is a boolean expression,
    -- so TEXT = TEXT comparisons are unambiguous.
    EXECUTE $q$
      ALTER TABLE jobs
        ALTER COLUMN status
          TYPE job_status
          USING (
            CASE
              WHEN status::text = 'open'        THEN 'POSTED'::job_status
              WHEN status::text = 'accepted'    THEN 'CONFIRMED'::job_status
              WHEN status::text = 'in_progress' THEN 'ACTIVE'::job_status
              WHEN status::text = 'completed'   THEN 'COMPLETED'::job_status
              WHEN status::text = 'failed'      THEN 'CANCELLED'::job_status
              WHEN status::text = 'POSTED'      THEN 'POSTED'::job_status
              WHEN status::text = 'CONFIRMED'   THEN 'CONFIRMED'::job_status
              WHEN status::text = 'ACTIVE'      THEN 'ACTIVE'::job_status
              WHEN status::text = 'COMPLETED'   THEN 'COMPLETED'::job_status
              WHEN status::text = 'CANCELLED'   THEN 'CANCELLED'::job_status
              ELSE                                   'POSTED'::job_status
            END
          )
    $q$;

    EXECUTE $q$ ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'POSTED' $q$;
    EXECUTE 'ALTER TABLE jobs ALTER COLUMN status SET NOT NULL';

    RAISE NOTICE '✓ Migrated jobs.status → job_status enum';
  END IF;
END;
$$;

-- ─── A5. Recreate job_status_view ────────────────────────────
CREATE VIEW public.job_status_view
WITH (security_invoker = true)
AS
SELECT
    j.*,
    cp.company_name,
    cp.user_id AS company_user_id,
    CASE
        WHEN j.expires_at IS NULL THEN 'no_expiration'
        WHEN j.expires_at <= NOW() THEN 'expired'
        WHEN j.expires_at <= NOW() + INTERVAL '3 days' THEN 'expiring_soon'
        ELSE 'active'
    END AS expiration_status,
    CASE
        WHEN j.expires_at IS NULL THEN NULL
        ELSE EXTRACT(days FROM j.expires_at - NOW())::integer
    END AS days_until_expiration
FROM public.jobs j
LEFT JOIN public.company_profiles cp ON j.company_id = cp.id;

GRANT SELECT ON public.job_status_view TO authenticated;
GRANT SELECT ON public.job_status_view TO anon;

COMMENT ON VIEW public.job_status_view IS
  'All job fields with expiration status and company info. Uses SECURITY INVOKER for proper RLS enforcement.';

-- ─── A6. Recreate partial indexes with new enum values ───────
-- 'open' → 'POSTED' in all predicates
CREATE INDEX IF NOT EXISTS idx_jobs_search_base
  ON jobs (status, is_active, is_tradespeople_job)
  WHERE status = 'POSTED' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_jobs_vacancies_common
  ON jobs (status, is_active, is_tradespeople_job, job_type, experience_level)
  WHERE status = 'POSTED' AND is_active = true AND is_tradespeople_job = false;

CREATE INDEX IF NOT EXISTS idx_jobs_trades_common
  ON jobs (status, is_active, is_tradespeople_job, category, urgency)
  WHERE status = 'POSTED' AND is_active = true AND is_tradespeople_job = true;

-- ─── A7. Confirmed-tradesperson constraint ───────────────────
ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS chk_confirmed_has_tradesperson;

ALTER TABLE jobs
  ADD CONSTRAINT chk_confirmed_has_tradesperson CHECK (
    (status::TEXT != 'CONFIRMED')
    OR (confirmed_tradesperson_id IS NOT NULL)
  );

-- ─── A8. State machine indexes ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_status_urgent
  ON jobs (status, is_urgent, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_confirmed_tradesperson
  ON jobs (confirmed_tradesperson_id)
  WHERE confirmed_tradesperson_id IS NOT NULL;


-- ════════════════════════════════════════════════════════════
--  PART B: job_applications table
-- ════════════════════════════════════════════════════════════

-- ─── B1. Add tradesperson_id column ─────────────────────────
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS tradesperson_id UUID
    REFERENCES company_profiles(id) ON DELETE CASCADE;

COMMENT ON COLUMN job_applications.tradesperson_id IS
  'Unified tradesperson reference (company_profiles.id). Mirrors company_id for state machine use.';

-- Backfill from existing company_id
UPDATE job_applications
  SET tradesperson_id = company_id
  WHERE tradesperson_id IS NULL
    AND company_id IS NOT NULL;

-- ─── B1b. Drop all views + status-predicate indexes that block
--         ALTER COLUMN TYPE on job_applications.status ─────────
-- Views are saved via pg_get_viewdef so they can be recreated.
-- A temp table persists the definitions across the DO blocks.
CREATE TEMP TABLE IF NOT EXISTS _saved_ja_views (
  viewname TEXT PRIMARY KEY,
  viewdef  TEXT,
  security_invoker BOOLEAN DEFAULT FALSE
) ON COMMIT DROP;

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Collect every view in public schema that references job_applications
  FOR r IN
    SELECT v.viewname, pg_get_viewdef(('public.' || v.viewname)::regclass, true) AS vdef
    FROM pg_views v
    WHERE v.schemaname = 'public'
      AND v.definition ILIKE '%job_applications%'
  LOOP
    INSERT INTO _saved_ja_views (viewname, viewdef, security_invoker)
    VALUES (
      r.viewname,
      r.vdef,
      EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = r.viewname
          AND n.nspname = 'public'
          AND c.reloptions::text ILIKE '%security_invoker=true%'
      )
    )
    ON CONFLICT (viewname) DO NOTHING;

    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', r.viewname);
    RAISE NOTICE 'Dropped view: %', r.viewname;
  END LOOP;

  -- Drop status-predicate indexes
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'job_applications'
      AND indexdef ILIKE '%status%=%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
    RAISE NOTICE 'Dropped status-predicate index: %', r.indexname;
  END LOOP;
END;
$$;

-- ─── B2. Migrate job_applications.status to new enum ────────
DO $$
DECLARE
  v_udt_name TEXT;
BEGIN
  SELECT udt_name
    INTO v_udt_name
  FROM information_schema.columns
  WHERE table_name = 'job_applications' AND column_name = 'status';

  IF v_udt_name IS NULL THEN
    EXECUTE 'ALTER TABLE job_applications ADD COLUMN status application_status NOT NULL DEFAULT ''PENDING''';
    RAISE NOTICE '✓ Added job_applications.status (new column)';

  ELSIF v_udt_name = 'application_status' THEN
    RAISE NOTICE '✓ job_applications.status already application_status enum, skipping';

  ELSE
    EXECUTE 'ALTER TABLE job_applications ALTER COLUMN status DROP DEFAULT';

    EXECUTE $q$
      ALTER TABLE job_applications
        ALTER COLUMN status
          TYPE application_status
          USING (
            CASE
              WHEN status::text = 'pending'        THEN 'PENDING'::application_status
              WHEN status::text = 'reviewed'       THEN 'PENDING'::application_status
              WHEN status::text = 'interview'      THEN 'PENDING'::application_status
              WHEN status::text = 'withdrawn'      THEN 'WITHDRAWN'::application_status
              WHEN status::text = 'rejected'       THEN 'AUTO_CANCELLED'::application_status
              WHEN status::text = 'auto_cancelled' THEN 'AUTO_CANCELLED'::application_status
              WHEN status::text = 'accepted'       THEN 'EXPIRED'::application_status
              WHEN status::text = 'expired'        THEN 'EXPIRED'::application_status
              WHEN status::text = 'PENDING'        THEN 'PENDING'::application_status
              WHEN status::text = 'WITHDRAWN'      THEN 'WITHDRAWN'::application_status
              WHEN status::text = 'AUTO_CANCELLED' THEN 'AUTO_CANCELLED'::application_status
              WHEN status::text = 'EXPIRED'        THEN 'EXPIRED'::application_status
              ELSE                                      'PENDING'::application_status
            END
          )
    $q$;

    EXECUTE $q$ ALTER TABLE job_applications ALTER COLUMN status SET DEFAULT 'PENDING' $q$;
    EXECUTE 'ALTER TABLE job_applications ALTER COLUMN status SET NOT NULL';

    RAISE NOTICE '✓ Migrated job_applications.status → application_status enum';
  END IF;
END;
$$;

-- ─── B2b. Recreate views that depended on job_applications ───
-- Uses a retry loop so views that depend on OTHER saved views
-- are recreated after their dependencies (max 10 passes).
DO $$
DECLARE
  r            RECORD;
  retry        INT := 0;
  any_failed   BOOLEAN;
BEGIN
  LOOP
    any_failed := FALSE;

    FOR r IN SELECT viewname, viewdef, security_invoker FROM _saved_ja_views LOOP
      BEGIN
        IF r.security_invoker THEN
          EXECUTE format(
            'CREATE OR REPLACE VIEW public.%I WITH (security_invoker = true) AS %s',
            r.viewname, r.viewdef
          );
        ELSE
          EXECUTE format(
            'CREATE OR REPLACE VIEW public.%I AS %s',
            r.viewname, r.viewdef
          );
        END IF;
        EXECUTE format('GRANT SELECT ON public.%I TO authenticated', r.viewname);
        EXECUTE format('GRANT SELECT ON public.%I TO anon', r.viewname);
        RAISE NOTICE 'Recreated view: %', r.viewname;
      EXCEPTION WHEN OTHERS THEN
        any_failed := TRUE;
        RAISE NOTICE 'Deferred (will retry): % — %', r.viewname, SQLERRM;
      END;
    END LOOP;

    EXIT WHEN NOT any_failed OR retry >= 10;
    retry := retry + 1;
  END LOOP;

  IF any_failed THEN
    RAISE WARNING 'One or more views could not be recreated — check manually';
  END IF;
END;
$$;

-- ─── B2c. Recreate application status index with new value ───
CREATE INDEX IF NOT EXISTS idx_job_applications_pending
  ON job_applications (status, applied_at DESC)
  WHERE status = 'PENDING';

-- ─── B3. Unique index: one application per tradesperson per job
DROP INDEX IF EXISTS uidx_job_applications_job_tradesperson;

CREATE UNIQUE INDEX uidx_job_applications_job_tradesperson
  ON job_applications (job_id, tradesperson_id)
  WHERE tradesperson_id IS NOT NULL;

COMMENT ON INDEX uidx_job_applications_job_tradesperson IS
  'Prevents a tradesperson from applying to the same job twice.';

-- ─── B4. Index for status queries ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_applications_status_new
  ON job_applications (status, job_id);


-- ════════════════════════════════════════════════════════════
--  PART C: Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_has_confirmed_col   BOOLEAN;
  v_has_is_urgent       BOOLEAN;
  v_has_tradesperson_id BOOLEAN;
  v_has_unique_idx      BOOLEAN;
  v_has_constraint      BOOLEAN;
  v_has_status_view     BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'confirmed_tradesperson_id'
  ) INTO v_has_confirmed_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'is_urgent'
  ) INTO v_has_is_urgent;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_applications' AND column_name = 'tradesperson_id'
  ) INTO v_has_tradesperson_id;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'job_applications'
      AND indexname = 'uidx_job_applications_job_tradesperson'
  ) INTO v_has_unique_idx;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_confirmed_has_tradesperson'
  ) INTO v_has_constraint;

  SELECT EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'job_status_view'
  ) INTO v_has_status_view;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'jobs.confirmed_tradesperson_id  : %', CASE WHEN v_has_confirmed_col   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'jobs.is_urgent                  : %', CASE WHEN v_has_is_urgent       THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'jobs constraint (CONFIRMED→id)  : %', CASE WHEN v_has_constraint      THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'job_applications.tradesperson_id: %', CASE WHEN v_has_tradesperson_id THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'unique(job_id, tradesperson_id) : %', CASE WHEN v_has_unique_idx      THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'job_status_view recreated       : %', CASE WHEN v_has_status_view     THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_has_confirmed_col AND v_has_is_urgent AND v_has_tradesperson_id
          AND v_has_unique_idx AND v_has_constraint AND v_has_status_view) THEN
    RAISE EXCEPTION 'Task 2 verification failed – see NOTICE output above';
  END IF;

  RAISE NOTICE '✅ Task 2 complete: tables updated for state machine';
END;
$$;
