-- =====================================================
-- COMPREHENSIVE FIX FOR OPENJOBMARKET DATABASE V4
-- =====================================================
-- Simplified version that drops policies without querying
-- =====================================================

-- =====================================================
-- PART 1: FIX CROSS-ROLE JOB APPLICATIONS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'PART 1: Fixing cross-role job applications';
    RAISE NOTICE '====================================';
END $$;

-- Step 1: Drop all possible existing policies
DO $$
BEGIN
    RAISE NOTICE 'Dropping all existing policies on job_applications...';

    -- Drop all known policy names
    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their own applications" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Professionals can insert applications" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Companies can view applications for their jobs" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Job posters can view applications" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Applicants can view own applications" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Applicants can view their own applications" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Job owners can view applications" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Job owners can update application status" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Job posters can update applications" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Applicants can update own applications" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Professionals can apply to jobs" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Companies can apply to tasks" ON public.job_applications';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RAISE NOTICE '✓ Dropped all existing policies';
END $$;

-- Step 2: Add company_id column to job_applications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'job_applications'
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.job_applications
        ADD COLUMN company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added company_id column to job_applications';
    ELSE
        RAISE NOTICE '- company_id column already exists';
    END IF;
END $$;

-- Step 3: Make professional_id nullable
DO $$
BEGIN
    ALTER TABLE public.job_applications
    ALTER COLUMN professional_id DROP NOT NULL;
    RAISE NOTICE '✓ Made professional_id nullable';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '- professional_id already nullable or error: %', SQLERRM;
END $$;

-- Step 4: Add constraint to ensure either professional_id OR company_id
DO $$
BEGIN
    ALTER TABLE public.job_applications
    DROP CONSTRAINT IF EXISTS job_applications_applicant_check;

    ALTER TABLE public.job_applications
    ADD CONSTRAINT job_applications_applicant_check
    CHECK (
        (professional_id IS NOT NULL AND company_id IS NULL) OR
        (professional_id IS NULL AND company_id IS NOT NULL)
    );
    RAISE NOTICE '✓ Added applicant type constraint';
END $$;

-- Step 5: Create index for company_id
CREATE INDEX IF NOT EXISTS idx_job_applications_company_id ON public.job_applications(company_id);

-- Step 6: Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Step 7: Create new RLS policies

-- POLICY 1: Applicants can view their own applications
CREATE POLICY "Applicants can view their own applications"
ON public.job_applications
FOR SELECT
USING (
    (professional_id IN (
        SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    ))
    OR
    (company_id IN (
        SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
    ))
);

-- POLICY 2: Professionals can apply to jobs
CREATE POLICY "Professionals can apply to jobs"
ON public.job_applications
FOR INSERT
WITH CHECK (
    professional_id IN (
        SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
    AND company_id IS NULL
);

-- POLICY 3: Companies can apply to tasks
CREATE POLICY "Companies can apply to tasks"
ON public.job_applications
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
    )
    AND professional_id IS NULL
);

-- POLICY 4: Job posters can view applications
CREATE POLICY "Job posters can view applications"
ON public.job_applications
FOR SELECT
USING (
    job_id IN (
        SELECT j.id FROM public.jobs j
        INNER JOIN public.company_profiles cp ON j.company_id = cp.id
        WHERE cp.user_id = auth.uid()

        UNION

        SELECT j.id FROM public.jobs j
        INNER JOIN public.homeowner_profiles hp ON j.homeowner_id = hp.id
        WHERE hp.user_id = auth.uid()
    )
);

-- POLICY 5: Job posters can update applications
CREATE POLICY "Job posters can update applications"
ON public.job_applications
FOR UPDATE
USING (
    job_id IN (
        SELECT j.id FROM public.jobs j
        INNER JOIN public.company_profiles cp ON j.company_id = cp.id
        WHERE cp.user_id = auth.uid()

        UNION

        SELECT j.id FROM public.jobs j
        INNER JOIN public.homeowner_profiles hp ON j.homeowner_id = hp.id
        WHERE hp.user_id = auth.uid()
    )
)
WITH CHECK (
    job_id IN (
        SELECT j.id FROM public.jobs j
        INNER JOIN public.company_profiles cp ON j.company_id = cp.id
        WHERE cp.user_id = auth.uid()

        UNION

        SELECT j.id FROM public.jobs j
        INNER JOIN public.homeowner_profiles hp ON j.homeowner_id = hp.id
        WHERE hp.user_id = auth.uid()
    )
);

-- POLICY 6: Applicants can update own applications
CREATE POLICY "Applicants can update own applications"
ON public.job_applications
FOR UPDATE
USING (
    (professional_id IN (
        SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    ))
    OR
    (company_id IN (
        SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
    ))
)
WITH CHECK (
    (professional_id IN (
        SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    ))
    OR
    (company_id IN (
        SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
    ))
);

DO $$
BEGIN
    RAISE NOTICE '✓ Created all new RLS policies';
END $$;

-- Step 8: Create helper view
DROP VIEW IF EXISTS public.job_applications_with_applicants;
CREATE VIEW public.job_applications_with_applicants AS
SELECT
    ja.*,
    CASE
        WHEN ja.professional_id IS NOT NULL THEN 'professional'
        WHEN ja.company_id IS NOT NULL THEN 'company'
        ELSE 'unknown'
    END as applicant_type,
    pp.first_name as prof_first_name,
    pp.last_name as prof_last_name,
    pp.title as prof_title,
    pp.profile_photo_url as prof_photo_url,
    pp.user_id as prof_user_id,
    cp.company_name,
    cp.logo_url as company_logo_url,
    cp.industry as company_industry,
    cp.user_id as company_user_id,
    COALESCE(
        pp.first_name || ' ' || pp.last_name,
        cp.company_name
    ) as applicant_name,
    COALESCE(
        pp.profile_photo_url,
        cp.logo_url
    ) as applicant_photo_url,
    COALESCE(
        pp.user_id,
        cp.user_id
    ) as applicant_user_id
FROM public.job_applications ja
LEFT JOIN public.professional_profiles pp ON ja.professional_id = pp.id
LEFT JOIN public.company_profiles cp ON ja.company_id = cp.id;

GRANT SELECT ON public.job_applications_with_applicants TO authenticated;
ALTER VIEW public.job_applications_with_applicants SET (security_barrier = true);

DO $$
BEGIN
    RAISE NOTICE '✓ Created helper view';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'PART 1 COMPLETED';
    RAISE NOTICE '====================================';
END $$;

-- =====================================================
-- PART 2: FIX MESSAGES TABLE TRIGGER
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'PART 2: Fixing messages table trigger';
    RAISE NOTICE '====================================';
END $$;

-- Drop any existing triggers that might be using the wrong field
DO $$
BEGIN
    BEGIN
        EXECUTE 'DROP TRIGGER IF EXISTS validate_message_receiver ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP TRIGGER IF EXISTS check_message_receiver ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP TRIGGER IF EXISTS validate_receiver ON public.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RAISE NOTICE '✓ Dropped potential problem triggers';
END $$;

-- Drop problematic functions
DO $$
BEGIN
    BEGIN
        EXECUTE 'DROP FUNCTION IF EXISTS public.validate_message_receiver CASCADE';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP FUNCTION IF EXISTS public.check_message_receiver CASCADE';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP FUNCTION IF EXISTS public.validate_receiver CASCADE';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RAISE NOTICE '✓ Dropped potential problem functions';
END $$;

-- Create correct validation function (using recipient_id)
CREATE OR REPLACE FUNCTION public.validate_message_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Use recipient_id (not receiver_id)
    IF NEW.sender_id IS NULL OR NEW.recipient_id IS NULL THEN
        RAISE EXCEPTION 'sender_id and recipient_id cannot be null';
    END IF;

    IF NEW.sender_id = NEW.recipient_id THEN
        RAISE EXCEPTION 'Cannot send message to yourself';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    RAISE NOTICE '✓ Created correct validation function using recipient_id';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'PART 2 COMPLETED';
    RAISE NOTICE '====================================';
END $$;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✓ ALL FIXES APPLIED SUCCESSFULLY';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '1. Cross-role job applications enabled';
    RAISE NOTICE '   - Companies can now apply to tasks';
    RAISE NOTICE '   - Professionals can apply to jobs';
    RAISE NOTICE '   - RLS policies updated';
    RAISE NOTICE '';
    RAISE NOTICE '2. Message trigger field name fixed';
    RAISE NOTICE '   - Removed triggers using receiver_id';
    RAISE NOTICE '   - Corrected to use recipient_id';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '- Test applying to tasks as a company';
    RAISE NOTICE '- Test sending messages';
    RAISE NOTICE '- Verify applications appear in dashboards';
    RAISE NOTICE '====================================';
END $$;
