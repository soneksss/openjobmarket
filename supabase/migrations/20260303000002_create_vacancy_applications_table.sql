-- ============================================================
-- Migration: Create vacancy_applications table
-- Task 2 of 4 — decouple company hiring workflow
-- ============================================================
-- NOTE: There is no separate "vacancies" table.
-- Company job postings are rows in the shared `jobs` table
-- where is_tradespeople_job = false and company_id IS NOT NULL.
-- Therefore vacancy_id → jobs(id).
--
-- applicant_id references professional_profiles(id) —
-- the same FK target used by the legacy job_applications.professional_id.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vacancy_applications (
  id           UUID                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vacancy_id   UUID                      NOT NULL
                 REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id UUID                      NOT NULL
                 REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  status       vacancy_application_status NOT NULL DEFAULT 'APPLIED',
  created_at   TIMESTAMPTZ               NOT NULL DEFAULT now(),

  CONSTRAINT uq_vacancy_applicant UNIQUE (vacancy_id, applicant_id)
);

COMMENT ON TABLE public.vacancy_applications IS
  'Applications by professionals to company vacancy postings (jobs.is_tradespeople_job = false). '
  'Uses vacancy_application_status enum. '
  'Completely separate from job_applications which serves the homeowner trade job state machine.';

COMMENT ON COLUMN public.vacancy_applications.vacancy_id IS
  'References jobs.id where is_tradespeople_job = false.';

COMMENT ON COLUMN public.vacancy_applications.applicant_id IS
  'References professional_profiles.id — the job-seeker applying.';


-- ── Indexes ──────────────────────────────────────────────────
-- Employer view: all applications for a vacancy, newest first
CREATE INDEX IF NOT EXISTS idx_vacancy_apps_vacancy_id
  ON public.vacancy_applications (vacancy_id, created_at DESC);

-- Applicant view: all applications by a professional
CREATE INDEX IF NOT EXISTS idx_vacancy_apps_applicant_id
  ON public.vacancy_applications (applicant_id, created_at DESC);

-- Fast pipeline lookups
CREATE INDEX IF NOT EXISTS idx_vacancy_apps_status
  ON public.vacancy_applications (status, created_at DESC);


-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.vacancy_applications ENABLE ROW LEVEL SECURITY;

-- Applicant can read their own applications
CREATE POLICY "applicant can read own vacancy applications"
  ON public.vacancy_applications
  FOR SELECT
  TO authenticated
  USING (
    applicant_id IN (
      SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
  );

-- Employer (company) can read all applications for their vacancies
CREATE POLICY "employer can read applications for own vacancies"
  ON public.vacancy_applications
  FOR SELECT
  TO authenticated
  USING (
    vacancy_id IN (
      SELECT j.id
      FROM public.jobs j
      JOIN public.company_profiles cp ON cp.id = j.company_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Applicant can insert (apply)
CREATE POLICY "applicant can apply to vacancy"
  ON public.vacancy_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    applicant_id IN (
      SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
  );

-- Employer can update status (reviewed → interview → offered → accepted/rejected)
CREATE POLICY "employer can update application status"
  ON public.vacancy_applications
  FOR UPDATE
  TO authenticated
  USING (
    vacancy_id IN (
      SELECT j.id
      FROM public.jobs j
      JOIN public.company_profiles cp ON cp.id = j.company_id
      WHERE cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    vacancy_id IN (
      SELECT j.id
      FROM public.jobs j
      JOIN public.company_profiles cp ON cp.id = j.company_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Applicant can withdraw (delete) their own application
CREATE POLICY "applicant can withdraw vacancy application"
  ON public.vacancy_applications
  FOR DELETE
  TO authenticated
  USING (
    applicant_id IN (
      SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
  );


-- ── Verification ─────────────────────────────────────────────
DO $$
DECLARE
  v_table_exists   BOOLEAN;
  v_uq_exists      BOOLEAN;
  v_idx_vac        BOOLEAN;
  v_idx_app        BOOLEAN;
  v_rls_enabled    BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vacancy_applications'
  ) INTO v_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'vacancy_applications'
      AND constraint_name = 'uq_vacancy_applicant'
  ) INTO v_uq_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'vacancy_applications' AND indexname = 'idx_vacancy_apps_vacancy_id'
  ) INTO v_idx_vac;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'vacancy_applications' AND indexname = 'idx_vacancy_apps_applicant_id'
  ) INTO v_idx_app;

  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'vacancy_applications'
    AND relnamespace = 'public'::regnamespace;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'vacancy_applications table      : %', CASE WHEN v_table_exists THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'UNIQUE(vacancy_id, applicant_id): %', CASE WHEN v_uq_exists    THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'idx_vacancy_apps_vacancy_id     : %', CASE WHEN v_idx_vac      THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'idx_vacancy_apps_applicant_id   : %', CASE WHEN v_idx_app      THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE 'RLS enabled                     : %', CASE WHEN v_rls_enabled  THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_table_exists AND v_uq_exists AND v_idx_vac AND v_idx_app AND v_rls_enabled) THEN
    RAISE EXCEPTION 'Task 2 verification failed — see NOTICE output above';
  END IF;

  RAISE NOTICE '✅ Task 2 complete: vacancy_applications table ready';
END;
$$;
