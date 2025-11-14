-- Add views tracking for jobs and companies
-- This migration adds views_count column to jobs table and creates job_views tracking table

-- Add views_count column to jobs table if it doesn't exist
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0 NOT NULL;

-- Create job_views tracking table
CREATE TABLE IF NOT EXISTS public.job_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewer_ip TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    referrer TEXT,
    user_agent TEXT
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON public.job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON public.job_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_views_viewer_id ON public.job_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_views_count ON public.jobs(views_count DESC);

-- Add RLS policies for job_views
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view aggregate view counts
CREATE POLICY "Anyone can view job view counts" ON public.job_views
    FOR SELECT
    USING (true);

-- Policy: System can insert view records
CREATE POLICY "System can insert job view records" ON public.job_views
    FOR INSERT
    WITH CHECK (true);

-- Policy: Company owners can see their job views
CREATE POLICY "Company owners can see their job views" ON public.job_views
    FOR SELECT
    USING (
        job_id IN (
            SELECT j.id FROM public.jobs j
            INNER JOIN public.company_profiles cp ON j.company_id = cp.id
            WHERE cp.user_id = auth.uid()
        )
    );

-- Create function to increment views_count
CREATE OR REPLACE FUNCTION public.increment_job_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.jobs
    SET views_count = views_count + 1
    WHERE id = NEW.job_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-increment views_count when a view is recorded
DROP TRIGGER IF EXISTS trigger_increment_job_views ON public.job_views;
CREATE TRIGGER trigger_increment_job_views
    AFTER INSERT ON public.job_views
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_job_views();

-- Add comments
COMMENT ON TABLE public.job_views IS 'Tracks individual views of job postings for analytics';
COMMENT ON COLUMN public.job_views.job_id IS 'The job that was viewed';
COMMENT ON COLUMN public.job_views.viewer_id IS 'The user who viewed the job (null if anonymous)';
COMMENT ON COLUMN public.job_views.viewer_ip IS 'IP address of the viewer';
COMMENT ON COLUMN public.job_views.viewed_at IS 'When the job was viewed';
COMMENT ON COLUMN public.jobs.views_count IS 'Total number of times this job has been viewed';

-- Create a view for company analytics that aggregates view data
CREATE OR REPLACE VIEW public.company_analytics AS
SELECT
    cp.id as company_id,
    cp.company_name,
    COUNT(DISTINCT j.id) as total_jobs,
    COUNT(DISTINCT CASE WHEN j.is_active = true THEN j.id END) as active_jobs,
    COALESCE(SUM(j.views_count), 0) as total_job_views,
    COUNT(DISTINCT ja.id) as total_applications,
    COUNT(DISTINCT CASE WHEN ja.status = 'pending' THEN ja.id END) as pending_applications,
    COUNT(DISTINCT CASE WHEN ja.status = 'accepted' THEN ja.id END) as accepted_applications,
    COALESCE(
        (SELECT COUNT(*) FROM public.company_profile_views cpv WHERE cpv.company_id = cp.id),
        0
    ) as profile_views
FROM public.company_profiles cp
LEFT JOIN public.jobs j ON j.company_id = cp.id
LEFT JOIN public.job_applications ja ON ja.job_id = j.id
GROUP BY cp.id, cp.company_name;

-- Add RLS for the view
ALTER VIEW public.company_analytics SET (security_barrier = true);

COMMENT ON VIEW public.company_analytics IS 'Aggregated analytics data for companies';
