-- Add RLS policy to allow job posters (companies/homeowners) to delete applications for their jobs

-- First, let's check if the policy already exists and drop it if needed
DROP POLICY IF EXISTS "Job posters can delete applications" ON public.job_applications;

-- Allow companies to delete applications for jobs they posted
CREATE POLICY "Companies can delete applications for their jobs"
ON public.job_applications
FOR DELETE
USING (
  -- The application is for a job posted by this company
  job_id IN (
    SELECT id FROM public.jobs
    WHERE company_id IN (
      SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Allow homeowners to delete applications for jobs they posted
DROP POLICY IF EXISTS "Homeowners can delete applications for their jobs" ON public.job_applications;

CREATE POLICY "Homeowners can delete applications for their jobs"
ON public.job_applications
FOR DELETE
USING (
  -- The application is for a job posted by this homeowner
  job_id IN (
    SELECT id FROM public.jobs
    WHERE homeowner_id IN (
      SELECT id FROM public.homeowner_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Also allow applicants to delete their own applications
DROP POLICY IF EXISTS "Professionals can delete their own applications" ON public.job_applications;

CREATE POLICY "Professionals can delete their own applications"
ON public.job_applications
FOR DELETE
USING (
  professional_id IN (
    SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Companies can delete their own applications" ON public.job_applications;

CREATE POLICY "Companies can delete their own applications"
ON public.job_applications
FOR DELETE
USING (
  company_id IN (
    SELECT id FROM public.company_profiles WHERE user_id = auth.uid()
  )
);
