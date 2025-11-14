-- Create reviews table for the star rating and review system
-- This table stores reviews between all user types: homeowners, tradespeople, jobseekers, employers

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  interaction_verified BOOLEAN DEFAULT false,
  conversation_id UUID, -- Optional: link to the conversation that verified the interaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,

  -- Ensure users can't review themselves
  CONSTRAINT no_self_review CHECK (reviewer_id != reviewee_id),
  -- Ensure only one review per interaction (one user can review another only once per conversation)
  CONSTRAINT unique_review_per_conversation UNIQUE (reviewer_id, reviewee_id, conversation_id)
);

-- Create an index for faster queries by reviewee
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- Create a view for review statistics per user
CREATE OR REPLACE VIEW public.user_review_stats AS
SELECT
  reviewee_id as user_id,
  COUNT(*) as total_reviews,
  AVG(rating)::NUMERIC(3,2) as average_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
FROM public.reviews
WHERE is_flagged = false
GROUP BY reviewee_id;

-- Create review_interactions table to track verified interactions
-- This table records when two users have had a verified interaction (contact + reply)
CREATE TABLE IF NOT EXISTS public.review_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  interaction_type TEXT, -- 'job_application', 'message_reply', 'service_request', etc.
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure each interaction is recorded only once (bidirectional)
  CONSTRAINT unique_interaction CHECK (user_a_id < user_b_id),
  CONSTRAINT unique_user_interaction UNIQUE (user_a_id, user_b_id, conversation_id)
);

-- Create indexes for review interactions
CREATE INDEX IF NOT EXISTS idx_review_interactions_user_a ON public.review_interactions(user_a_id);
CREATE INDEX IF NOT EXISTS idx_review_interactions_user_b ON public.review_interactions(user_b_id);
CREATE INDEX IF NOT EXISTS idx_review_interactions_conversation ON public.review_interactions(conversation_id);

-- Function to check if a user can review another user
CREATE OR REPLACE FUNCTION public.can_user_review(
  p_reviewer_id UUID,
  p_reviewee_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  has_interaction BOOLEAN;
BEGIN
  -- Check if there's a verified interaction between the users
  SELECT EXISTS(
    SELECT 1 FROM public.review_interactions
    WHERE (user_a_id = LEAST(p_reviewer_id, p_reviewee_id)
      AND user_b_id = GREATEST(p_reviewer_id, p_reviewee_id))
  ) INTO has_interaction;

  RETURN has_interaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically verify interaction when users exchange messages
CREATE OR REPLACE FUNCTION public.verify_interaction_on_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user replies to a message, create a verified interaction if it doesn't exist
  INSERT INTO public.review_interactions (user_a_id, user_b_id, conversation_id, interaction_type)
  VALUES (
    LEAST(NEW.sender_id, NEW.receiver_id),
    GREATEST(NEW.sender_id, NEW.receiver_id),
    NEW.conversation_id,
    'message_reply'
  )
  ON CONFLICT (user_a_id, user_b_id, conversation_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-verify interactions (if messages table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    DROP TRIGGER IF EXISTS trigger_verify_interaction ON public.messages;
    CREATE TRIGGER trigger_verify_interaction
      AFTER INSERT ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.verify_interaction_on_reply();
  END IF;
END $$;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating reviews
DROP TRIGGER IF EXISTS trigger_update_review_timestamp ON public.reviews;
CREATE TRIGGER trigger_update_review_timestamp
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  WHEN (OLD.review_text IS DISTINCT FROM NEW.review_text OR OLD.rating IS DISTINCT FROM NEW.rating)
  EXECUTE FUNCTION public.update_review_updated_at();

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews table

-- Anyone can read reviews (public)
CREATE POLICY "Reviews are publicly readable"
  ON public.reviews FOR SELECT
  USING (true);

-- Users can insert their own reviews (but backend validation will check interaction)
CREATE POLICY "Users can create their own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Users can update their own reviews within 24 hours
CREATE POLICY "Users can update their own reviews within 24 hours"
  ON public.reviews FOR UPDATE
  USING (
    auth.uid() = reviewer_id
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- Users can delete their own reviews within 24 hours
CREATE POLICY "Users can delete their own reviews within 24 hours"
  ON public.reviews FOR DELETE
  USING (
    auth.uid() = reviewer_id
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- RLS Policies for review_interactions table

-- Users can read their own interactions
CREATE POLICY "Users can read their own interactions"
  ON public.review_interactions FOR SELECT
  USING (
    auth.uid() = user_a_id
    OR auth.uid() = user_b_id
  );

-- Only system can insert interactions (via triggers or server-side)
CREATE POLICY "System can create interactions"
  ON public.review_interactions FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.user_review_stats TO authenticated, anon;
GRANT SELECT, INSERT ON public.review_interactions TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.reviews IS 'Stores user reviews and ratings. Users can only review after verified interaction.';
COMMENT ON TABLE public.review_interactions IS 'Tracks verified interactions between users to enable reviews.';
COMMENT ON COLUMN public.reviews.interaction_verified IS 'Flag indicating if the interaction was verified before review submission.';
COMMENT ON COLUMN public.reviews.is_flagged IS 'Flag for reviews that contain inappropriate content or have been reported.';
