-- ============================================================
-- Self-guard fixes for trade job flow
--
-- 1. apply_to_job: prevent a tradesperson from applying to their own job
-- 2. get_or_create_conversation: clean error when user1_id = user2_id
-- ============================================================


-- ── 1. apply_to_job — block self-application ────────────────────────────────
--
-- When a tradesperson posts a trade job (jobs.company_id = their profile id)
-- they must not be able to apply to it.  Previously, apply_to_job had no such
-- check and would happily insert a self-application.

CREATE OR REPLACE FUNCTION public.apply_to_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tradesperson_id UUID;
BEGIN
  -- Resolve calling user's company_profile
  SELECT id INTO v_tradesperson_id
  FROM company_profiles
  WHERE user_id = auth.uid();

  IF v_tradesperson_id IS NULL THEN
    RAISE EXCEPTION 'Only tradesperson accounts can apply to jobs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Guard: cannot apply to your own job
  IF EXISTS (
    SELECT 1 FROM jobs
    WHERE id = p_job_id
      AND company_id = v_tradesperson_id
  ) THEN
    RAISE EXCEPTION 'You cannot apply to your own job'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Job must be in POSTED state
  IF NOT EXISTS (
    SELECT 1 FROM jobs
    WHERE id = p_job_id
      AND status = 'POSTED'
  ) THEN
    RAISE EXCEPTION 'Job % is not available for applications', p_job_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Insert — sets BOTH company_id and tradesperson_id (required columns)
  BEGIN
    INSERT INTO job_applications (job_id, company_id, tradesperson_id, status)
    VALUES (p_job_id, v_tradesperson_id, v_tradesperson_id, 'PENDING');
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'You have already applied to this job'
        USING ERRCODE = 'unique_violation';
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_to_job(UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ apply_to_job: self-application guard added';
END; $$;


-- ── 2. get_or_create_conversation — clean self-conversation guard ────────────
--
-- Previously, passing user1_id = user2_id would fall through to an INSERT that
-- violated the CHECK (participant_1 < participant_2) constraint, surfacing as a
-- 500 error rather than a meaningful validation message.

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
  -- Guard: a user cannot start a conversation with themselves
  IF user1_id = user2_id THEN
    RAISE EXCEPTION 'Cannot create a conversation with yourself'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

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

DO $$ BEGIN
  RAISE NOTICE '✓ get_or_create_conversation: self-conversation guard added';
END; $$;
