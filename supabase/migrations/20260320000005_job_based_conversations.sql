-- ============================================================
-- Job-based conversations
-- Each job gets its own conversation thread.
-- Non-job conversations (e.g. from modal map) are new each time
-- and carry a subject line instead.
-- ============================================================

-- 1. Add job_id + subject to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject TEXT;

-- 2. Drop the old one-per-user-pair unique constraint
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_participant_1_participant_2_key;

-- 3. Partial unique index: one conversation per (user pair + job)
--    Non-job conversations (job_id IS NULL) are allowed to be multiple.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_per_job
  ON conversations(participant_1, participant_2, job_id)
  WHERE job_id IS NOT NULL;

-- 4. Index for job_id lookups
CREATE INDEX IF NOT EXISTS idx_conversations_job_id
  ON conversations(job_id);

-- 5. Rebuild get_or_create_conversation to support job_id + subject
--    - For job-based: find existing conversation for that job, or create one.
--    - For non-job (p_job_id IS NULL): always create a new conversation.
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user1_id  UUID,
  user2_id  UUID,
  p_job_id  UUID    DEFAULT NULL,
  p_subject TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p1      UUID;
  p2      UUID;
  conv_id UUID;
BEGIN
  -- Enforce ordering so (A,B) and (B,A) map to the same row
  IF user1_id < user2_id THEN
    p1 := user1_id; p2 := user2_id;
  ELSE
    p1 := user2_id; p2 := user1_id;
  END IF;

  -- For job-based: reuse existing thread for that job
  IF p_job_id IS NOT NULL THEN
    SELECT id INTO conv_id
    FROM conversations
    WHERE participant_1 = p1
      AND participant_2 = p2
      AND job_id = p_job_id
    LIMIT 1;
    IF FOUND THEN
      RETURN conv_id;
    END IF;
  END IF;

  -- Create new conversation (always new for non-job; new if job thread doesn't exist)
  INSERT INTO conversations (participant_1, participant_2, job_id, subject)
  VALUES (p1, p2, p_job_id, p_subject)
  RETURNING id INTO conv_id;

  RETURN conv_id;
END;
$$;
