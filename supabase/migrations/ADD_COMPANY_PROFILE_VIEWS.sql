-- Add company profile views tracking table
-- This allows companies to see how many times their profile has been viewed

-- Create company_profile_views table
CREATE TABLE IF NOT EXISTS public.company_profile_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewer_ip TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    referrer TEXT,
    user_agent TEXT
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_company_profile_views_company_id ON public.company_profile_views(company_id);
CREATE INDEX IF NOT EXISTS idx_company_profile_views_viewed_at ON public.company_profile_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_profile_views_viewer_id ON public.company_profile_views(viewer_id);

-- Add RLS policies
ALTER TABLE public.company_profile_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view the count of views (aggregate data)
CREATE POLICY "Anyone can view aggregate view counts" ON public.company_profile_views
    FOR SELECT
    USING (true);

-- Policy: System can insert view records
CREATE POLICY "System can insert view records" ON public.company_profile_views
    FOR INSERT
    WITH CHECK (true);

-- Policy: Company owners can see their profile views
CREATE POLICY "Company owners can see their profile views" ON public.company_profile_views
    FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM public.company_profiles
            WHERE user_id = auth.uid()
        )
    );

-- Add comments
COMMENT ON TABLE public.company_profile_views IS 'Tracks views of company profiles for analytics';
COMMENT ON COLUMN public.company_profile_views.company_id IS 'The company profile that was viewed';
COMMENT ON COLUMN public.company_profile_views.viewer_id IS 'The user who viewed the profile (null if anonymous)';
COMMENT ON COLUMN public.company_profile_views.viewer_ip IS 'IP address of the viewer';
COMMENT ON COLUMN public.company_profile_views.viewed_at IS 'When the profile was viewed';
COMMENT ON COLUMN public.company_profile_views.referrer IS 'HTTP referrer URL';
COMMENT ON COLUMN public.company_profile_views.user_agent IS 'Browser user agent string';
