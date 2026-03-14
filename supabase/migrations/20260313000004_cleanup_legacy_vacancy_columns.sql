-- ============================================================
-- Migration: Clean up legacy vacancy/employment columns
-- ============================================================
-- The jobs table was originally designed for employee vacancies.
-- Trade jobs (is_tradespeople_job = TRUE) use budget_min/budget_max.
-- Vacancy jobs (is_tradespeople_job = FALSE) previously used salary_min/max.
--
-- After this migration BOTH job types use budget_min / budget_max /
-- budget_period.  The is_tradespeople_job flag still distinguishes them.
--
-- Steps:
--   1. Add budget_period column
--   2. Temporarily drop the budget_check constraint (to safely migrate)
--   3. Migrate salary → budget in a single atomic UPDATE
--   4. Re-apply the budget_check constraint
--   5. Drop all vacancy-era columns
-- ============================================================


-- ── 1. Add budget_period ─────────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS budget_period TEXT;

COMMENT ON COLUMN public.jobs.budget_period IS
  'Pay / budget frequency for both trade and vacancy jobs (e.g. hourly, daily, fixed_price, yearly)';


-- ── 2. Drop constraint so we can migrate safely ───────────────
-- The jobs_budget_check constraint enforces (NULL,NULL) or (both NOT NULL).
-- We need to relax it while we copy data, then re-add it afterwards.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_budget_check;


-- ── 3. Migrate salary data → budget columns ───────────────────
-- Only runs if salary_min still exists (idempotent — safe to re-run).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'jobs'
       AND column_name  = 'salary_min'
  ) THEN
    -- Copy both min+max together so no row is left inconsistent
    UPDATE public.jobs
       SET budget_min    = salary_min,
           budget_max    = salary_max,
           budget_period = COALESCE(budget_period, salary_period, salary_frequency)
     WHERE salary_min IS NOT NULL
       AND salary_max IS NOT NULL
       AND budget_min IS NULL;

    -- Edge case: salary_min set but salary_max NULL → set both to min
    UPDATE public.jobs
       SET budget_min    = salary_min,
           budget_max    = salary_min,
           budget_period = COALESCE(budget_period, salary_period, salary_frequency)
     WHERE salary_min IS NOT NULL
       AND salary_max IS NULL
       AND budget_min IS NULL;

    -- Migrate period for rows that already had budget_min/max
    UPDATE public.jobs
       SET budget_period = COALESCE(salary_period, salary_frequency)
     WHERE budget_period IS NULL
       AND COALESCE(salary_period, salary_frequency) IS NOT NULL;

    RAISE NOTICE 'Salary data migrated to budget columns';
  ELSE
    RAISE NOTICE 'salary_min already gone — skipping data migration';
  END IF;
END $$;


-- ── 4. Re-apply budget constraint ────────────────────────────
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_budget_check CHECK (
    (budget_min IS NULL AND budget_max IS NULL) OR
    (budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_max >= budget_min)
  );


-- ── 5. Drop vacancy-era columns ──────────────────────────────
-- job_status_view uses j.* so it depends on every column.
-- Drop it first; we recreate it below after the columns are gone.
DROP VIEW IF EXISTS public.job_status_view CASCADE;

-- Remove old urgency column (replaced by urgency_type in 20260213000001)
ALTER TABLE public.jobs DROP COLUMN IF EXISTS urgency;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS urgency_check;

-- Remove salary columns (data already in budget_min/max/period above)
ALTER TABLE public.jobs DROP COLUMN IF EXISTS salary_min;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS salary_max;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS salary_period;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS salary_frequency;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS salary_min_annual;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS salary_max_annual;

-- Remove vacancy-specific metadata columns no longer in use
ALTER TABLE public.jobs DROP COLUMN IF EXISTS job_type;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS experience_level;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS requirements;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS responsibilities;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS benefits;

-- Remove full-text search vector (unmaintained, causes write bloat)
ALTER TABLE public.jobs DROP COLUMN IF EXISTS search_vector;
DROP INDEX IF EXISTS public.idx_jobs_search_vector;

-- Drop old urgency check constraint if it still lingers
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_urgency_check;


-- ── 6. Recreate job_status_view (now without dropped columns) ─
CREATE OR REPLACE VIEW public.job_status_view AS
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
  'All job fields with expiration status calculations and company info';


DO $$ BEGIN
  RAISE NOTICE '✓ Legacy vacancy columns removed; salary data preserved in budget_min/max/period';
END; $$;
