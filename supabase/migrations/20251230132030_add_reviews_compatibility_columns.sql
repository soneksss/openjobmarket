-- Add compatibility columns to reviews table
-- The code expects review_text, reviewee_id, is_edited, updated_at
-- But the migration created comment, reviewed_id

-- Add missing columns
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS review_text TEXT,
  ADD COLUMN IF NOT EXISTS reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interaction_verified BOOLEAN DEFAULT false;

-- Sync existing data from comment to review_text
UPDATE reviews SET review_text = comment WHERE review_text IS NULL;

-- Sync existing data from reviewed_id to reviewee_id
UPDATE reviews SET reviewee_id = reviewed_id WHERE reviewee_id IS NULL;

-- Create index on reviewee_id for performance
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);

-- Create trigger to keep comment and review_text in sync
CREATE OR REPLACE FUNCTION sync_review_text()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Sync review_text to comment
    IF NEW.review_text IS NOT NULL THEN
      NEW.comment = NEW.review_text;
    END IF;

    -- Sync comment to review_text
    IF NEW.comment IS NOT NULL THEN
      NEW.review_text = NEW.comment;
    END IF;

    -- Sync reviewee_id to reviewed_id
    IF NEW.reviewee_id IS NOT NULL THEN
      NEW.reviewed_id = NEW.reviewee_id;
    END IF;

    -- Sync reviewed_id to reviewee_id
    IF NEW.reviewed_id IS NOT NULL THEN
      NEW.reviewee_id = NEW.reviewed_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_review_text_trigger ON reviews;
CREATE TRIGGER sync_review_text_trigger
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION sync_review_text();

-- Add comments
COMMENT ON COLUMN reviews.review_text IS 'Legacy column name for comment - kept for backwards compatibility';
COMMENT ON COLUMN reviews.reviewee_id IS 'Legacy column name for reviewed_id - kept for backwards compatibility';
