-- ============================================================================
-- Migration: Consolidate from 4-Role Model to 2-Role Model
-- Date: 2026-03-11
--
-- OLD roles → NEW roles:
--   professional, jobseeker, talent  →  homeowner   (account_type = individual)
--   business, employer, contractor   →  company     (account_type = business)
--   company                          →  unchanged   (account_type = business)
--   admin                            →  unchanged
--
-- Profile tables:
--   New homeowners  → homeowner_profiles  (created from professional_profiles if exists)
--   New company     → company_profiles    (created from contractor_profiles if exists)
--   professional_profiles for migrated homeowners → DELETED (no longer tradespeople)
-- ============================================================================

-- Add 'withdrawn' to application_status enum before the transaction.
-- IF NOT EXISTS prevents an error if it was already added by a previous migration.
-- This must run before BEGIN so the cascade from step 4 doesn't fail.
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'withdrawn';

BEGIN;

-- ============================================================================
-- PRE-STEP: Fix trigger functions to use status::text comparison
-- This prevents "invalid input value for enum" errors when cascade-deleting
-- job_applications during profile cleanup. All three trigger functions that
-- compare status to 'withdrawn'/'rejected' must be patched before step 4.
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_job_application_delete()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  current_count INTEGER;
BEGIN
  SELECT id, is_tradespeople_job, matching_status, max_applications
  INTO job_record FROM jobs WHERE id = OLD.job_id;

  IF NOT FOUND THEN RETURN OLD; END IF;

  UPDATE jobs
  SET applications_count = (
    SELECT COUNT(*) FROM job_applications
    WHERE job_id = OLD.job_id
      AND status::text NOT IN ('withdrawn', 'rejected')
  )
  WHERE id = OLD.job_id;

  IF COALESCE(job_record.is_tradespeople_job, FALSE) AND job_record.matching_status = 'reviewing' THEN
    SELECT COUNT(*) INTO current_count
    FROM job_applications
    WHERE job_id = OLD.job_id
      AND status::text NOT IN ('withdrawn', 'rejected');

    IF current_count < job_record.max_applications THEN
      UPDATE jobs SET matching_status = 'searching' WHERE id = OLD.job_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_job_application_insert()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  current_count INTEGER;
  is_trade_job BOOLEAN;
BEGIN
  SELECT id, is_tradespeople_job, matching_status, max_applications, homeowner_id, deadline_at
  INTO job_record FROM jobs WHERE id = NEW.job_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  is_trade_job := COALESCE(job_record.is_tradespeople_job, FALSE);

  IF is_trade_job THEN
    IF job_record.matching_status != 'searching' THEN
      RAISE EXCEPTION 'This job is no longer accepting applications (status: %)', job_record.matching_status;
    END IF;

    IF job_record.deadline_at IS NOT NULL AND job_record.deadline_at < NOW() THEN
      UPDATE jobs SET matching_status = 'expired' WHERE id = NEW.job_id;
      RAISE EXCEPTION 'This job has expired and is no longer accepting applications';
    END IF;

    SELECT COUNT(*) INTO current_count
    FROM job_applications
    WHERE job_id = NEW.job_id
      AND status::text NOT IN ('withdrawn', 'rejected')
      AND id != NEW.id;

    IF current_count >= job_record.max_applications THEN
      RAISE EXCEPTION 'This job has reached its maximum number of applications (%)', job_record.max_applications;
    END IF;

    IF current_count + 1 >= job_record.max_applications THEN
      UPDATE jobs SET matching_status = 'reviewing', homeowner_notified = FALSE WHERE id = NEW.job_id;
      INSERT INTO notifications (user_id, type, title, message, data, created_at)
      VALUES (
        job_record.homeowner_id, 'job_applications_full',
        'Your job has received maximum applications',
        'You have received ' || job_record.max_applications || ' applications. Review them now to find your tradesperson!',
        json_build_object('job_id', NEW.job_id, 'applications_count', job_record.max_applications),
        NOW()
      );
    END IF;
  END IF;

  UPDATE jobs
  SET applications_count = (
    SELECT COUNT(*) FROM job_applications
    WHERE job_id = NEW.job_id
      AND status::text NOT IN ('withdrawn', 'rejected')
  )
  WHERE id = NEW.job_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_job_application_update()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  current_count INTEGER;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT id, is_tradespeople_job, matching_status, max_applications
  INTO job_record FROM jobs WHERE id = NEW.job_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  UPDATE jobs
  SET applications_count = (
    SELECT COUNT(*) FROM job_applications
    WHERE job_id = NEW.job_id
      AND status::text NOT IN ('withdrawn', 'rejected')
  )
  WHERE id = NEW.job_id;

  IF COALESCE(job_record.is_tradespeople_job, FALSE) THEN
    SELECT COUNT(*) INTO current_count
    FROM job_applications
    WHERE job_id = NEW.job_id
      AND status::text NOT IN ('withdrawn', 'rejected');

    IF NEW.status::text IN ('withdrawn', 'rejected') AND job_record.matching_status = 'reviewing' THEN
      IF current_count < job_record.max_applications THEN
        UPDATE jobs SET matching_status = 'searching' WHERE id = NEW.job_id;
      END IF;
    END IF;

    IF NEW.status::text = 'accepted' THEN
      UPDATE jobs SET matching_status = 'closed' WHERE id = NEW.job_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 0: Backup current state before any changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_migration_2role_backup (
  user_id       UUID PRIMARY KEY,
  old_user_type VARCHAR(50),
  old_account_type VARCHAR(20),
  old_is_homeowner  BOOLEAN,
  old_is_jobseeker  BOOLEAN,
  old_is_employer   BOOLEAN,
  old_is_tradespeople BOOLEAN,
  backed_up_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO role_migration_2role_backup
  (user_id, old_user_type, old_account_type,
   old_is_homeowner, old_is_jobseeker, old_is_employer, old_is_tradespeople)
SELECT
  id, user_type, account_type,
  is_homeowner, is_jobseeker, is_employer, is_tradespeople
FROM public.users
WHERE user_type IN ('professional', 'jobseeker', 'talent', 'business', 'employer', 'contractor')
ON CONFLICT (user_id) DO UPDATE SET
  old_user_type       = EXCLUDED.old_user_type,
  old_account_type    = EXCLUDED.old_account_type,
  old_is_homeowner    = EXCLUDED.old_is_homeowner,
  old_is_jobseeker    = EXCLUDED.old_is_jobseeker,
  old_is_employer     = EXCLUDED.old_is_employer,
  old_is_tradespeople = EXCLUDED.old_is_tradespeople,
  backed_up_at        = NOW();

DO $$
DECLARE v_backed_up INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_backed_up FROM role_migration_2role_backup;
  RAISE NOTICE '✓ Backed up % user records before migration', v_backed_up;
END $$;

-- ============================================================================
-- STEP 1: Migrate professional / jobseeker / talent  →  homeowner
-- ============================================================================

UPDATE public.users
SET
  user_type       = 'homeowner',
  account_type    = 'individual',
  is_homeowner    = true,
  is_jobseeker    = false,
  is_tradespeople = false,
  is_employer     = false,
  updated_at      = NOW()
WHERE user_type IN ('professional', 'jobseeker', 'talent');

DO $$
DECLARE v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✓ Migrated % users → homeowner', v_count;
END $$;

-- ============================================================================
-- STEP 2: Migrate business / employer / contractor  →  company
-- ============================================================================

UPDATE public.users
SET
  user_type       = 'company',
  account_type    = 'business',
  is_homeowner    = false,
  is_jobseeker    = false,
  is_tradespeople = true,
  is_employer     = true,
  updated_at      = NOW()
WHERE user_type IN ('business', 'employer', 'contractor');

DO $$
DECLARE v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✓ Migrated % users → company (tradesperson)', v_count;
END $$;

-- Ensure existing 'company' type is also clean
UPDATE public.users
SET
  account_type    = 'business',
  is_homeowner    = false,
  is_jobseeker    = false,
  is_tradespeople = true,
  is_employer     = true,
  updated_at      = NOW()
WHERE user_type = 'company'
  AND (account_type IS DISTINCT FROM 'business'
    OR is_tradespeople IS DISTINCT FROM true);

-- ============================================================================
-- STEP 3: Create homeowner_profiles for new homeowners
--         Copy first_name, last_name, location etc. from professional_profiles
-- ============================================================================

INSERT INTO public.homeowner_profiles (
  user_id,
  first_name,
  last_name,
  phone,
  location,
  bio,
  created_at,
  updated_at
)
SELECT
  pp.user_id,
  COALESCE(NULLIF(pp.first_name, ''), 'User'),
  COALESCE(NULLIF(pp.last_name,  ''), split_part(u.email, '@', 1)),
  pp.phone,
  pp.location,
  pp.bio,
  NOW(),
  NOW()
FROM public.professional_profiles pp
JOIN public.users u ON u.id = pp.user_id
WHERE u.user_type = 'homeowner'
  AND NOT EXISTS (
    SELECT 1 FROM public.homeowner_profiles hp WHERE hp.user_id = pp.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✓ Created % homeowner_profiles from professional_profiles', v_count;
END $$;

-- Create minimal homeowner_profile for any new homeowner who had no professional_profile
INSERT INTO public.homeowner_profiles (
  user_id,
  first_name,
  last_name,
  created_at,
  updated_at
)
SELECT
  u.id,
  'User',
  split_part(u.email, '@', 1),
  NOW(),
  NOW()
FROM public.users u
WHERE u.user_type = 'homeowner'
  AND NOT EXISTS (
    SELECT 1 FROM public.homeowner_profiles hp WHERE hp.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✓ Created % minimal homeowner_profiles for users without professional_profiles', v_count;
END $$;

-- ============================================================================
-- STEP 4: Delete professional_profiles for new homeowners
--         They are no longer tradespeople — must not appear in tradesperson search
-- ============================================================================

DELETE FROM public.professional_profiles
WHERE user_id IN (
  SELECT id FROM public.users WHERE user_type = 'homeowner'
);

DO $$
DECLARE v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✓ Removed % professional_profiles for users now classified as homeowners', v_count;
END $$;

-- ============================================================================
-- STEP 5: Ensure company_profiles for users from contractor role
--         Create from contractor_profiles where no company_profile exists
-- ============================================================================

INSERT INTO public.company_profiles (
  user_id,
  company_name,
  description,
  location,
  created_at,
  updated_at
)
SELECT
  cp.user_id,
  COALESCE(
    NULLIF(cp.company_name, ''),
    NULLIF(split_part(u.email, '@', 1), ''),
    'Tradesperson'
  ),
  NULL,
  cp.location,
  NOW(),
  NOW()
FROM public.contractor_profiles cp
JOIN public.users u ON u.id = cp.user_id
WHERE u.user_type = 'company'
  AND NOT EXISTS (
    SELECT 1 FROM public.company_profiles WHERE user_id = cp.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✓ Created % company_profiles from contractor_profiles', v_count;
END $$;

-- ============================================================================
-- STEP 6: Sync auth.users metadata so JWT tokens reflect new roles
-- ============================================================================

UPDATE auth.users au
SET raw_user_meta_data = raw_user_meta_data
  || jsonb_build_object(
    'user_type',       u.user_type,
    'account_type',    u.account_type,
    'is_homeowner',    u.is_homeowner,
    'is_tradespeople', u.is_tradespeople,
    'is_employer',     u.is_employer,
    'is_jobseeker',    false
  )
FROM public.users u
WHERE au.id = u.id
  AND u.user_type IN ('homeowner', 'company');

DO $$
DECLARE v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✓ Updated auth metadata for % users', v_count;
END $$;

-- ============================================================================
-- STEP 7: Final summary report
-- ============================================================================

DO $$
DECLARE
  v_homeowners    INTEGER;
  v_companies     INTEGER;
  v_admins        INTEGER;
  v_other         INTEGER;
  v_hw_profiles   INTEGER;
  v_co_profiles   INTEGER;
  v_pr_profiles   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_homeowners FROM public.users WHERE user_type = 'homeowner';
  SELECT COUNT(*) INTO v_companies  FROM public.users WHERE user_type = 'company';
  SELECT COUNT(*) INTO v_admins     FROM public.users WHERE user_type = 'admin';
  SELECT COUNT(*) INTO v_other      FROM public.users
    WHERE user_type NOT IN ('homeowner', 'company', 'admin');
  SELECT COUNT(*) INTO v_hw_profiles FROM public.homeowner_profiles;
  SELECT COUNT(*) INTO v_co_profiles FROM public.company_profiles;
  SELECT COUNT(*) INTO v_pr_profiles FROM public.professional_profiles;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE — 2-Role Model';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Homeowners  : %', v_homeowners;
  RAISE NOTICE 'Tradespeople: %', v_companies;
  RAISE NOTICE 'Admins      : %', v_admins;
  RAISE NOTICE 'Other       : % (investigate if > 0)', v_other;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'homeowner_profiles : %', v_hw_profiles;
  RAISE NOTICE 'company_profiles   : %', v_co_profiles;
  RAISE NOTICE 'professional_profiles (tradespeople only): %', v_pr_profiles;
  RAISE NOTICE '========================================';
END $$;

COMMIT;
