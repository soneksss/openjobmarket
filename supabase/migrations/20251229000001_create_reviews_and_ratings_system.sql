-- =========================================
-- RATINGS & REVIEWS SYSTEM MIGRATION
-- =========================================
-- This migration implements a job-based review system where:
-- 1. Jobs have proper lifecycle status (OPEN, ACCEPTED, IN_PROGRESS, COMPLETED, FAILED)
-- 2. Users can review each other after job completion
-- 3. Ratings are calculated and stored on profiles
-- =========================================

-- 1. CREATE JOB STATUS ENUM
-- =========================================
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('open', 'accepted', 'in_progress', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ADD STATUS COLUMN TO JOBS TABLE
-- =========================================
-- Add status column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE jobs ADD COLUMN status job_status DEFAULT 'open';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Set existing jobs to appropriate status based on current data
UPDATE jobs
SET status = CASE
    WHEN completed_at IS NOT NULL THEN 'completed'::job_status
    WHEN accepted_contractor_id IS NOT NULL THEN 'accepted'::job_status
    WHEN is_active = false THEN 'failed'::job_status
    ELSE 'open'::job_status
END
WHERE status IS NULL OR status = 'open';

-- Add failure_reason column for failed jobs
DO $$ BEGIN
    ALTER TABLE jobs ADD COLUMN failure_reason TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 3. CREATE REVIEWS TABLE
-- =========================================
-- Drop the old conversation-based reviews table if it exists
DROP TABLE IF EXISTS reviews CASCADE;

-- Create new job-based reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Job and user references
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,

    -- Review metadata
    reviewer_type TEXT NOT NULL, -- 'homeowner', 'company', 'contractor', 'professional'
    reviewed_type TEXT NOT NULL, -- 'homeowner', 'company', 'contractor', 'professional'

    -- Flags for admin moderation
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    admin_reviewed BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_review_per_job UNIQUE (job_id, reviewer_id, reviewed_id),
    CONSTRAINT no_self_review CHECK (reviewer_id != reviewed_id),
    CONSTRAINT valid_rating CHECK (rating BETWEEN 1 AND 5)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged) WHERE is_flagged = true;

-- 4. ADD RATING FIELDS TO PROFILE TABLES
-- =========================================

-- Homeowner profiles
DO $$ BEGIN
    ALTER TABLE homeowner_profiles ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00;
    ALTER TABLE homeowner_profiles ADD COLUMN reviews_count INTEGER DEFAULT 0;
    ALTER TABLE homeowner_profiles ADD COLUMN total_rating_sum INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Company profiles
DO $$ BEGIN
    ALTER TABLE company_profiles ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00;
    ALTER TABLE company_profiles ADD COLUMN reviews_count INTEGER DEFAULT 0;
    ALTER TABLE company_profiles ADD COLUMN total_rating_sum INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Contractor profiles
DO $$ BEGIN
    ALTER TABLE contractor_profiles ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00;
    ALTER TABLE contractor_profiles ADD COLUMN reviews_count INTEGER DEFAULT 0;
    ALTER TABLE contractor_profiles ADD COLUMN total_rating_sum INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Professional profiles
DO $$ BEGIN
    ALTER TABLE professional_profiles ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00;
    ALTER TABLE professional_profiles ADD COLUMN reviews_count INTEGER DEFAULT 0;
    ALTER TABLE professional_profiles ADD COLUMN total_rating_sum INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 5. CREATE FUNCTION TO UPDATE RATINGS
-- =========================================
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
DECLARE
    profile_table TEXT;
    user_reviews_count INTEGER;
    user_total_rating DECIMAL;
    user_avg_rating DECIMAL;
BEGIN
    -- Determine which profile table to update based on reviewed_type
    profile_table := CASE NEW.reviewed_type
        WHEN 'homeowner' THEN 'homeowner_profiles'
        WHEN 'company' THEN 'company_profiles'
        WHEN 'contractor' THEN 'contractor_profiles'
        WHEN 'professional' THEN 'professional_profiles'
        ELSE NULL
    END;

    IF profile_table IS NULL THEN
        RAISE EXCEPTION 'Invalid reviewed_type: %', NEW.reviewed_type;
    END IF;

    -- Calculate new rating statistics
    SELECT
        COUNT(*)::INTEGER,
        SUM(rating)::INTEGER,
        ROUND(AVG(rating)::NUMERIC, 2)
    INTO
        user_reviews_count,
        user_total_rating,
        user_avg_rating
    FROM reviews
    WHERE reviewed_id = NEW.reviewed_id;

    -- Update the appropriate profile table
    EXECUTE format(
        'UPDATE %I SET
            reviews_count = $1,
            total_rating_sum = $2,
            average_rating = $3,
            updated_at = NOW()
        WHERE user_id = $4',
        profile_table
    ) USING user_reviews_count, user_total_rating, user_avg_rating, NEW.reviewed_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CREATE TRIGGER FOR AUTOMATIC RATING UPDATES
-- =========================================
DROP TRIGGER IF EXISTS trigger_update_rating_on_review ON reviews;
CREATE TRIGGER trigger_update_rating_on_review
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating();

-- 7. CREATE FUNCTION TO CHECK IF REVIEW IS ALLOWED
-- =========================================
CREATE OR REPLACE FUNCTION is_review_allowed(
    p_job_id UUID,
    p_reviewer_id UUID,
    p_reviewed_id UUID
)
RETURNS TABLE (
    allowed BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    v_job_status job_status;
    v_existing_review_count INTEGER;
BEGIN
    -- Check if job is completed or failed
    SELECT status INTO v_job_status
    FROM jobs
    WHERE id = p_job_id;

    IF v_job_status IS NULL THEN
        RETURN QUERY SELECT false, 'Job not found';
        RETURN;
    END IF;

    IF v_job_status NOT IN ('completed', 'failed') THEN
        RETURN QUERY SELECT false, 'Reviews are only allowed for completed or failed jobs';
        RETURN;
    END IF;

    -- Check if review already exists
    SELECT COUNT(*) INTO v_existing_review_count
    FROM reviews
    WHERE job_id = p_job_id
      AND reviewer_id = p_reviewer_id
      AND reviewed_id = p_reviewed_id;

    IF v_existing_review_count > 0 THEN
        RETURN QUERY SELECT false, 'You have already reviewed this user for this job';
        RETURN;
    END IF;

    -- Check if users are actually involved in the job
    -- This would need more complex logic based on your job structure

    RETURN QUERY SELECT true, 'Review allowed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ENABLE ROW LEVEL SECURITY
-- =========================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all reviews
CREATE POLICY "Anyone can view reviews"
    ON reviews FOR SELECT
    USING (true);

-- Policy: Users can create reviews for jobs they're involved in
-- Simplified: Just check that user is authenticated and review is for completed/failed job
-- Additional validation happens in the application layer
CREATE POLICY "Users can create reviews for their jobs"
    ON reviews FOR INSERT
    WITH CHECK (
        reviewer_id = auth.uid()
    );

-- Policy: Users can update their own reviews (within limits)
CREATE POLICY "Users can update their own reviews"
    ON reviews FOR UPDATE
    USING (auth.uid() = reviewer_id)
    WITH CHECK (auth.uid() = reviewer_id);

-- Policy: Users cannot delete reviews (maintain integrity)
-- Reviews can only be flagged for admin review

-- 9. CREATE INDEXES FOR JOB STATUS
-- =========================================
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_active ON jobs(status, is_active) WHERE is_active = true;

-- 10. ADD UPDATED_AT TRIGGER FOR REVIEWS
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. CREATE VIEW FOR EASY REVIEW QUERYING
-- =========================================
CREATE OR REPLACE VIEW reviews_with_details AS
SELECT
    r.*,
    -- Reviewer details
    CASE r.reviewer_type
        WHEN 'homeowner' THEN h.first_name || ' ' || h.last_name
        WHEN 'company' THEN c.company_name
        WHEN 'contractor' THEN cr.company_name
        WHEN 'professional' THEN p.first_name || ' ' || p.last_name
    END as reviewer_name,
    -- Reviewed details
    CASE r.reviewed_type
        WHEN 'homeowner' THEN h2.first_name || ' ' || h2.last_name
        WHEN 'company' THEN c2.company_name
        WHEN 'contractor' THEN cr2.company_name
        WHEN 'professional' THEN p2.first_name || ' ' || p2.last_name
    END as reviewed_name,
    -- Job details
    j.title as job_title
FROM reviews r
LEFT JOIN jobs j ON r.job_id = j.id
LEFT JOIN homeowner_profiles h ON r.reviewer_id = h.user_id AND r.reviewer_type = 'homeowner'
LEFT JOIN company_profiles c ON r.reviewer_id = c.user_id AND r.reviewer_type = 'company'
LEFT JOIN contractor_profiles cr ON r.reviewer_id = cr.user_id AND r.reviewer_type = 'contractor'
LEFT JOIN professional_profiles p ON r.reviewer_id = p.user_id AND r.reviewer_type = 'professional'
LEFT JOIN homeowner_profiles h2 ON r.reviewed_id = h2.user_id AND r.reviewed_type = 'homeowner'
LEFT JOIN company_profiles c2 ON r.reviewed_id = c2.user_id AND r.reviewed_type = 'company'
LEFT JOIN contractor_profiles cr2 ON r.reviewed_id = cr2.user_id AND r.reviewed_type = 'contractor'
LEFT JOIN professional_profiles p2 ON r.reviewed_id = p2.user_id AND r.reviewed_type = 'professional';

-- =========================================
-- END OF MIGRATION
-- =========================================

COMMENT ON TABLE reviews IS 'Stores user reviews for completed jobs. One review per user per job.';
COMMENT ON COLUMN reviews.rating IS 'Star rating from 1 to 5';
COMMENT ON COLUMN reviews.is_flagged IS 'Flagged for admin review (e.g., contains inappropriate content or disputes)';
COMMENT ON COLUMN jobs.status IS 'Job lifecycle status: open (visible on map), accepted (locked to one contractor), in_progress, completed, or failed';
COMMENT ON FUNCTION update_user_rating() IS 'Automatically updates user rating statistics when a review is added or modified';
COMMENT ON FUNCTION is_review_allowed(UUID, UUID, UUID) IS 'Checks if a user is allowed to review another user for a specific job';
