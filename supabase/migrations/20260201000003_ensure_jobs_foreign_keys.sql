-- ============================================================================
-- Migration: Ensure jobs table has proper foreign key constraints
-- Date: 2026-02-01
-- Purpose: Add foreign key constraints for company_id and homeowner_id if missing
--          This enables Supabase PostgREST to properly join related tables
-- ============================================================================

-- Check and add company_id foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'jobs'
      AND constraint_name = 'jobs_company_id_fkey'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE SET NULL;

    RAISE NOTICE 'Created foreign key constraint jobs_company_id_fkey (jobs.company_id -> company_profiles.id)';
  ELSE
    RAISE NOTICE 'Foreign key constraint jobs_company_id_fkey already exists';
  END IF;
END $$;

-- Check and add homeowner_id foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'jobs'
      AND constraint_name = 'jobs_homeowner_id_fkey'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_homeowner_id_fkey
      FOREIGN KEY (homeowner_id) REFERENCES homeowner_profiles(id) ON DELETE SET NULL;

    RAISE NOTICE 'Created foreign key constraint jobs_homeowner_id_fkey (jobs.homeowner_id -> homeowner_profiles.id)';
  ELSE
    RAISE NOTICE 'Foreign key constraint jobs_homeowner_id_fkey already exists';
  END IF;
END $$;

-- Create indexes for better join performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_id ON jobs(homeowner_id);

-- Log the current foreign key status and check for data issues
DO $$
DECLARE
  v_company_fk_exists BOOLEAN;
  v_homeowner_fk_exists BOOLEAN;
  v_jobs_with_invalid_company_id INTEGER;
  v_jobs_with_invalid_homeowner_id INTEGER;
  v_jobs_with_no_poster INTEGER;
  v_vacancies_without_company INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'jobs' AND constraint_name = 'jobs_company_id_fkey'
  ) INTO v_company_fk_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'jobs' AND constraint_name = 'jobs_homeowner_id_fkey'
  ) INTO v_homeowner_fk_exists;

  -- Check for jobs with company_id that doesn't match any company_profile
  SELECT COUNT(*) INTO v_jobs_with_invalid_company_id
  FROM jobs j
  WHERE j.company_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM company_profiles cp WHERE cp.id = j.company_id);

  -- Check for jobs with homeowner_id that doesn't match any homeowner_profile
  SELECT COUNT(*) INTO v_jobs_with_invalid_homeowner_id
  FROM jobs j
  WHERE j.homeowner_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM homeowner_profiles hp WHERE hp.id = j.homeowner_id);

  -- Check for jobs with neither company_id nor homeowner_id
  SELECT COUNT(*) INTO v_jobs_with_no_poster
  FROM jobs
  WHERE company_id IS NULL AND homeowner_id IS NULL;

  -- Check for vacancies (is_tradespeople_job = false) without company_id
  SELECT COUNT(*) INTO v_vacancies_without_company
  FROM jobs
  WHERE is_tradespeople_job = false AND company_id IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Jobs Table Foreign Key Status:';
  RAISE NOTICE '  - jobs_company_id_fkey: %', CASE WHEN v_company_fk_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  - jobs_homeowner_id_fkey: %', CASE WHEN v_homeowner_fk_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Data Integrity Check:';
  RAISE NOTICE '  - Jobs with invalid company_id: %', v_jobs_with_invalid_company_id;
  RAISE NOTICE '  - Jobs with invalid homeowner_id: %', v_jobs_with_invalid_homeowner_id;
  RAISE NOTICE '  - Jobs with no poster (no company_id or homeowner_id): %', v_jobs_with_no_poster;
  RAISE NOTICE '  - Vacancies without company_id: %', v_vacancies_without_company;
  RAISE NOTICE '========================================';

  -- If there are vacancies without company_id, try to fix them by finding the company profile
  IF v_vacancies_without_company > 0 THEN
    RAISE NOTICE 'Attempting to fix vacancies without company_id...';
  END IF;
END $$;

-- Fix jobs where company_id might be set to user_id instead of company_profile.id
-- This checks if company_id matches a user_id and updates it to the corresponding company_profile.id
UPDATE jobs j
SET company_id = cp.id
FROM company_profiles cp
WHERE j.company_id = cp.user_id
  AND j.company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM company_profiles cp2 WHERE cp2.id = j.company_id);

-- Log how many were fixed
DO $$
DECLARE
  v_fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  IF v_fixed_count > 0 THEN
    RAISE NOTICE 'Fixed % jobs where company_id was set to user_id instead of company_profile.id', v_fixed_count;
  END IF;
END $$;
