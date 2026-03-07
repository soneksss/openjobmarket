-- Add urgent job tracking fields to homeowner_jobs table
-- This migration adds support for ASAP and Today urgent job posting modes

-- Add urgency tracking columns to homeowner_jobs
ALTER TABLE homeowner_jobs
ADD COLUMN IF NOT EXISTS urgency_type TEXT CHECK (urgency_type IN ('asap', 'today')),
ADD COLUMN IF NOT EXISTS search_radius_miles INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS search_state TEXT CHECK (search_state IN ('active_search', 'extended_search', 'fallback', 'completed')),
ADD COLUMN IF NOT EXISTS search_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS search_extended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS background_search_until TIMESTAMPTZ;

-- Add index for finding active urgent searches
CREATE INDEX IF NOT EXISTS idx_homeowner_jobs_urgent_search
ON homeowner_jobs (urgency_type, search_state, created_at DESC)
WHERE urgency_type IS NOT NULL;

-- Create table for tracking urgent job DISPATCH ALERTS sent to tradespeople
-- This is SEPARATE from user notifications - these are system dispatch records
CREATE TABLE IF NOT EXISTS urgent_job_dispatch_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES homeowner_jobs(id) ON DELETE CASCADE,
    -- Recipient tradesperson (one of these must be set)
    professional_id UUID REFERENCES professional_profiles(id) ON DELETE SET NULL,
    contractor_id UUID REFERENCES contractor_profiles(id) ON DELETE SET NULL,
    company_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    -- Dispatch metadata
    dispatched_at TIMESTAMPTZ DEFAULT NOW(),
    dispatch_type TEXT DEFAULT 'push' CHECK (dispatch_type IN ('push', 'sms', 'email')),
    distance_miles DECIMAL(6,2),
    -- Response tracking
    viewed BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMPTZ,
    responded BOOLEAN DEFAULT FALSE,
    responded_at TIMESTAMPTZ,
    response_type TEXT CHECK (response_type IN ('applied', 'skipped', 'ignored')),
    CONSTRAINT dispatch_alert_has_recipient CHECK (
        professional_id IS NOT NULL OR contractor_id IS NOT NULL OR company_id IS NOT NULL
    )
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_dispatch_alerts_job_id
ON urgent_job_dispatch_alerts (job_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_alerts_professional
ON urgent_job_dispatch_alerts (professional_id)
WHERE professional_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dispatch_alerts_contractor
ON urgent_job_dispatch_alerts (contractor_id)
WHERE contractor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dispatch_alerts_company
ON urgent_job_dispatch_alerts (company_id)
WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dispatch_alerts_pending
ON urgent_job_dispatch_alerts (job_id, responded)
WHERE responded = FALSE;

-- Enable RLS on urgent_job_dispatch_alerts
ALTER TABLE urgent_job_dispatch_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (clean slate)
DROP POLICY IF EXISTS "Tradespeople can view their dispatch alerts" ON urgent_job_dispatch_alerts;
DROP POLICY IF EXISTS "Tradespeople can update their dispatch alerts" ON urgent_job_dispatch_alerts;
DROP POLICY IF EXISTS "Service role can manage dispatch alerts" ON urgent_job_dispatch_alerts;

-- Policy: Tradespeople can ONLY view alerts sent TO THEM (not homeowners)
CREATE POLICY "Tradespeople can view their dispatch alerts"
ON urgent_job_dispatch_alerts FOR SELECT
USING (
    (professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid()))
    OR (contractor_id IN (SELECT id FROM contractor_profiles WHERE user_id = auth.uid()))
    OR (company_id IN (SELECT id FROM company_profiles WHERE user_id = auth.uid()))
);

-- Policy: Tradespeople can update their own alerts (mark as viewed/responded)
CREATE POLICY "Tradespeople can update their dispatch alerts"
ON urgent_job_dispatch_alerts FOR UPDATE
USING (
    (professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid()))
    OR (contractor_id IN (SELECT id FROM contractor_profiles WHERE user_id = auth.uid()))
    OR (company_id IN (SELECT id FROM company_profiles WHERE user_id = auth.uid()))
);

-- Policy: Service role can insert/manage alerts
CREATE POLICY "Service role can manage dispatch alerts"
ON urgent_job_dispatch_alerts FOR ALL
USING (auth.role() = 'service_role');

-- IMPORTANT: Homeowners CANNOT see dispatch alerts - they only see user notifications
-- The existing notifications table handles: applications, messages, acceptance
-- No additional policy needed - homeowners simply have no access to this table

-- Drop the old urgent_job_notifications table if it exists (cleanup)
DROP TABLE IF EXISTS urgent_job_notifications CASCADE;

-- Add same columns to jobs table for consistency (company jobs)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS urgency_type TEXT CHECK (urgency_type IN ('asap', 'today')),
ADD COLUMN IF NOT EXISTS search_radius_miles INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS search_state TEXT CHECK (search_state IN ('active_search', 'extended_search', 'fallback', 'completed')),
ADD COLUMN IF NOT EXISTS search_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS search_extended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS background_search_until TIMESTAMPTZ;

-- Add index for jobs table urgent search
CREATE INDEX IF NOT EXISTS idx_jobs_urgent_search
ON jobs (urgency_type, search_state, created_at DESC)
WHERE urgency_type IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE urgent_job_dispatch_alerts IS 'System dispatch records for urgent job alerts sent to tradespeople. NOT visible to homeowners.';
COMMENT ON COLUMN urgent_job_dispatch_alerts.dispatch_type IS 'How the alert was sent: push, sms, or email';
COMMENT ON COLUMN urgent_job_dispatch_alerts.response_type IS 'How tradesperson responded: applied, skipped, or ignored (timeout)';

COMMENT ON COLUMN homeowner_jobs.urgency_type IS 'Type of urgent job: asap or today';
COMMENT ON COLUMN homeowner_jobs.search_radius_miles IS 'Current search radius in miles';
COMMENT ON COLUMN homeowner_jobs.search_state IS 'Current state of the urgent search: active_search, extended_search, fallback, completed';
COMMENT ON COLUMN homeowner_jobs.search_started_at IS 'When the urgent search was initiated';
COMMENT ON COLUMN homeowner_jobs.search_extended_at IS 'When the search was expanded to a wider radius';
COMMENT ON COLUMN homeowner_jobs.background_search_until IS 'Until when the background search should continue';
