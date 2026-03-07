-- Create app_feedback table for storing user likes/dislikes and feedback messages
CREATE TABLE IF NOT EXISTS app_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('like', 'dislike')),
    message TEXT,
    page_url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_app_feedback_created_at ON app_feedback(created_at DESC);
CREATE INDEX idx_app_feedback_type ON app_feedback(feedback_type);

-- Enable RLS
ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (even anonymous users)
CREATE POLICY "Anyone can submit feedback" ON app_feedback
    FOR INSERT WITH CHECK (true);

-- Only admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON app_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.user_type = 'admin'
        )
    );

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON app_feedback
    FOR SELECT USING (user_id = auth.uid());

-- Comment for documentation
COMMENT ON TABLE app_feedback IS 'Stores user feedback including likes/dislikes and improvement suggestions';
