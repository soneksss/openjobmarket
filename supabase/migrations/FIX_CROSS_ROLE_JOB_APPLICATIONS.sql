-- Fix job_applications table to support cross-role applications
-- This allows:
-- - Professionals to apply to regular jobs (vacancies)
-- - Companies to apply to tasks posted by homeowners
-- - Both poster types to view applications in their dashboards

-- Step 1: Add company_id column to job_applications
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE;

-- Step 2: Make professional_id nullable (since companies won't have professional_id)
ALTER TABLE public.job_applications
ALTER COLUMN professional_id DROP NOT NULL;

-- Step 3: Add constraint to ensure either professional_id OR company_id is set (but not both)
ALTER TABLE public.job_applications
DROP CONSTRAINT IF EXISTS job_applications_applicant_check;

ALTER TABLE public.job_applications
ADD CONSTRAINT job_applications_applicant_check
CHECK (
  (professional_id IS NOT NULL AND company_id IS NULL) OR
  (professional_id IS NULL AND company_id IS NOT NULL)
);

-- Step 4: Create index for company_id lookups
CREATE INDEX IF NOT EXISTS idx_job_applications_company_id ON public.job_applications(company_id);

-- Step 5: Drop existing RLS policies (we'll recreate them with new logic)
DROP POLICY IF EXISTS "Users can view their own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Professionals can insert applications" ON public.job_applications;
DROP POLICY IF EXISTS "Companies can view applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Job posters can view applications" ON public.job_applications;
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Job owners can view applications" ON public.job_applications;
DROP POLICY IF EXISTS "Job owners can update application status" ON public.job_applications;

-- Step 6: Enable RLS (in case it wasn't enabled)
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Step 7: Create new comprehensive RLS policies

-- POLICY 1: Applicants can view their own applications
-- (Works for both professionals and companies)
CREATE POLICY "Applicants can view their own applications"
ON public.job_applications
FOR SELECT
USING (
  -- Professional applicants can see their applications
  (professional_id IN (
    SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
  ))
  OR
  -- Company applicants can see their applications
  (company_id IN (
    SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
  ))
);

-- POLICY 2: Professionals can apply to jobs (insert applications)
CREATE POLICY "Professionals can apply to jobs"
ON public.job_applications
FOR INSERT
WITH CHECK (
  -- User must have a professional profile
  professional_id IN (
    SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
  )
  AND
  -- Ensure company_id is null when professional applies
  company_id IS NULL
);

-- POLICY 3: Companies can apply to tasks (insert applications)
CREATE POLICY "Companies can apply to tasks"
ON public.job_applications
FOR INSERT
WITH CHECK (
  -- User must have a company profile
  company_id IN (
    SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
  )
  AND
  -- Ensure professional_id is null when company applies
  professional_id IS NULL
);

-- POLICY 4: Job posters can view applications for their jobs
-- (Works for both company-posted jobs and homeowner-posted tasks)
CREATE POLICY "Job posters can view applications"
ON public.job_applications
FOR SELECT
USING (
  job_id IN (
    -- Jobs posted by companies
    SELECT j.id FROM public.jobs j
    INNER JOIN public.company_profiles cp ON j.company_id = cp.id
    WHERE cp.user_id = auth.uid()

    UNION

    -- Tasks posted by homeowners
    SELECT j.id FROM public.jobs j
    INNER JOIN public.homeowner_profiles hp ON j.homeowner_id = hp.id
    WHERE hp.user_id = auth.uid()
  )
);

-- POLICY 5: Job posters can update application status
CREATE POLICY "Job posters can update applications"
ON public.job_applications
FOR UPDATE
USING (
  job_id IN (
    -- Jobs posted by companies
    SELECT j.id FROM public.jobs j
    INNER JOIN public.company_profiles cp ON j.company_id = cp.id
    WHERE cp.user_id = auth.uid()

    UNION

    -- Tasks posted by homeowners
    SELECT j.id FROM public.jobs j
    INNER JOIN public.homeowner_profiles hp ON j.homeowner_id = hp.id
    WHERE hp.user_id = auth.uid()
  )
)
WITH CHECK (
  job_id IN (
    -- Jobs posted by companies
    SELECT j.id FROM public.jobs j
    INNER JOIN public.company_profiles cp ON j.company_id = cp.id
    WHERE cp.user_id = auth.uid()

    UNION

    -- Tasks posted by homeowners
    SELECT j.id FROM public.jobs j
    INNER JOIN public.homeowner_profiles hp ON j.homeowner_id = hp.id
    WHERE hp.user_id = auth.uid()
  )
);

-- POLICY 6: Applicants can update their own applications (e.g., withdraw)
CREATE POLICY "Applicants can update own applications"
ON public.job_applications
FOR UPDATE
USING (
  -- Professional applicants
  (professional_id IN (
    SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
  ))
  OR
  -- Company applicants
  (company_id IN (
    SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
  ))
)
WITH CHECK (
  -- Professional applicants
  (professional_id IN (
    SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
  ))
  OR
  -- Company applicants
  (company_id IN (
    SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
  ))
);

-- Step 8: Add comments for documentation
COMMENT ON COLUMN public.job_applications.professional_id IS 'Professional profile ID (for professionals applying to vacancies). Mutually exclusive with company_id.';
COMMENT ON COLUMN public.job_applications.company_id IS 'Company profile ID (for companies applying to tasks). Mutually exclusive with professional_id.';
COMMENT ON CONSTRAINT job_applications_applicant_check ON public.job_applications IS 'Ensures exactly one applicant type (professional OR company) per application';

-- Step 9: Create helper view for unified application queries
CREATE OR REPLACE VIEW public.job_applications_with_applicants AS
SELECT
  ja.*,
  -- Unified applicant information
  CASE
    WHEN ja.professional_id IS NOT NULL THEN 'professional'
    WHEN ja.company_id IS NOT NULL THEN 'company'
    ELSE 'unknown'
  END as applicant_type,

  -- Professional applicant details
  pp.first_name as prof_first_name,
  pp.last_name as prof_last_name,
  pp.title as prof_title,
  pp.profile_photo_url as prof_photo_url,
  pp.user_id as prof_user_id,

  -- Company applicant details
  cp.company_name,
  cp.logo_url as company_logo_url,
  cp.industry as company_industry,
  cp.user_id as company_user_id,

  -- Unified fields (combines both types)
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

COMMENT ON VIEW public.job_applications_with_applicants IS 'Unified view of job applications with both professional and company applicant details';

-- Step 10: Grant permissions on the view
GRANT SELECT ON public.job_applications_with_applicants TO authenticated;

-- Apply RLS to the view
ALTER VIEW public.job_applications_with_applicants SET (security_barrier = true);
