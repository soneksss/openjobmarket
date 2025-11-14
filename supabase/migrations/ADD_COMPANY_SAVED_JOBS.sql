-- =====================================================
-- ADD COMPANY SUPPORT TO SAVED_JOBS
-- =====================================================
-- Allows companies to save jobs, not just professionals
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Adding company support to saved_jobs';
    RAISE NOTICE '====================================';
END $$;

-- Step 1: Add company_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'saved_jobs'
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.saved_jobs
        ADD COLUMN company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added company_id column to saved_jobs';
    ELSE
        RAISE NOTICE '- company_id column already exists';
    END IF;
END $$;

-- Step 2: Make professional_id nullable
DO $$
BEGIN
    ALTER TABLE public.saved_jobs
    ALTER COLUMN professional_id DROP NOT NULL;
    RAISE NOTICE '✓ Made professional_id nullable';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '- professional_id already nullable or error: %', SQLERRM;
END $$;

-- Step 3: Add constraint to ensure either professional_id OR company_id
DO $$
BEGIN
    ALTER TABLE public.saved_jobs
    DROP CONSTRAINT IF EXISTS saved_jobs_saver_check;

    ALTER TABLE public.saved_jobs
    ADD CONSTRAINT saved_jobs_saver_check
    CHECK (
        (professional_id IS NOT NULL AND company_id IS NULL) OR
        (professional_id IS NULL AND company_id IS NOT NULL)
    );
    RAISE NOTICE '✓ Added saver type constraint';
END $$;

-- Step 4: Create index for company_id
CREATE INDEX IF NOT EXISTS idx_saved_jobs_company_id ON public.saved_jobs(company_id);

-- Step 5: Drop old RLS policies
DO $$
BEGIN
    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their saved jobs" ON public.saved_jobs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can save jobs" ON public.saved_jobs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can delete their saved jobs" ON public.saved_jobs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Professionals can view their saved jobs" ON public.saved_jobs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Professionals can save jobs" ON public.saved_jobs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Professionals can delete saved jobs" ON public.saved_jobs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can insert saved jobs" ON public.saved_jobs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage saved jobs" ON public.saved_jobs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RAISE NOTICE '✓ Dropped old RLS policies';
END $$;

-- Step 6: Enable RLS
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- Step 7: Create new RLS policies

-- POLICY 1: Users can view their own saved jobs
CREATE POLICY "Users can view their saved jobs"
ON public.saved_jobs
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

-- POLICY 2: Professionals can save jobs
CREATE POLICY "Professionals can save jobs"
ON public.saved_jobs
FOR INSERT
WITH CHECK (
    professional_id IN (
        SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
    AND company_id IS NULL
);

-- POLICY 3: Companies can save jobs
CREATE POLICY "Companies can save jobs"
ON public.saved_jobs
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
    )
    AND professional_id IS NULL
);

-- POLICY 4: Users can delete their saved jobs
CREATE POLICY "Users can delete their saved jobs"
ON public.saved_jobs
FOR DELETE
USING (
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
    RAISE NOTICE '✓ Created new RLS policies for saved_jobs';
END $$;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✓ SAVED_JOBS TABLE UPDATED';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '1. Added company_id column';
    RAISE NOTICE '2. Made professional_id nullable';
    RAISE NOTICE '3. Added constraint for saver type';
    RAISE NOTICE '4. Created RLS policies for both professionals and companies';
    RAISE NOTICE '';
    RAISE NOTICE 'Next step: Update frontend code to use correct ID field';
    RAISE NOTICE '====================================';
END $$;
