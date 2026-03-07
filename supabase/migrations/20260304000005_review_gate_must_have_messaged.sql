-- ============================================================
-- Migration: Review gate — tradesperson must have messaged
-- ============================================================
-- Adds one extra guard to leave_review():
--   The tradesperson being reviewed must have sent at least one
--   message linked to the job (messages.job_id = p_job_id AND
--   messages.sender_id = p_reviewed_id).
--
-- This prevents homeowners from leaving fake reviews on
-- tradespeople who never interacted with the job.
--
-- All other rules unchanged:
--   • Caller must be homeowner of the job
--   • job.status must be COMPLETED
--   • One review per (job, reviewer, reviewed) — unique index
--   • Reviews are immutable (no UPDATE policy)
-- ============================================================

CREATE OR REPLACE FUNCTION public.leave_review(
  p_job_id      UUID,
  p_reviewed_id UUID,
  p_rating      INTEGER,
  p_comment     TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status        TEXT;
  v_reviewed_type TEXT;
  v_review_id     UUID;
BEGIN
  -- ── 1. Validate rating ────────────────────────────────────
  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 (got: %)', p_rating
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── 2. Caller must be homeowner; job must be COMPLETED ────
  SELECT j.status::TEXT
    INTO v_status
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id     = p_job_id
    AND hp.user_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status <> 'COMPLETED' THEN
    RAISE EXCEPTION
      'Reviews can only be left for COMPLETED jobs (current: %)', v_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── 3. Reviewed tradesperson must have messaged on this job ──
  IF NOT EXISTS (
    SELECT 1 FROM messages
    WHERE job_id    = p_job_id
      AND sender_id = p_reviewed_id
  ) THEN
    RAISE EXCEPTION
      'Cannot review a tradesperson who did not send a message for this job'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── 4. No duplicate reviews ───────────────────────────────
  IF EXISTS (
    SELECT 1 FROM reviews
    WHERE job_id      = p_job_id
      AND reviewer_id = auth.uid()
      AND reviewed_id = p_reviewed_id
  ) THEN
    RAISE EXCEPTION 'You have already left a review for this job'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- ── 5. Resolve reviewed_type for the rating trigger ───────
  SELECT user_type INTO v_reviewed_type
  FROM public.users
  WHERE id = p_reviewed_id;

  v_reviewed_type := CASE v_reviewed_type
    WHEN 'contractor'   THEN 'contractor'
    WHEN 'professional' THEN 'professional'
    WHEN 'company'      THEN 'company'
    WHEN 'homeowner'    THEN 'homeowner'
    ELSE                     'contractor'
  END;

  -- ── 6. Insert ─────────────────────────────────────────────
  INSERT INTO public.reviews (
    job_id, reviewer_id, reviewed_id,
    rating, comment, reviewer_type, reviewed_type
  )
  VALUES (
    p_job_id, auth.uid(), p_reviewed_id,
    p_rating, p_comment, 'homeowner', v_reviewed_type
  )
  RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$$;

COMMENT ON FUNCTION public.leave_review(UUID, UUID, INTEGER, TEXT) IS
  'Homeowner leaves a star rating (1–5) with optional text for a COMPLETED job. '
  'Guards: caller = homeowner, status = COMPLETED, '
  'reviewed tradesperson must have messaged on the job, '
  'one review per job (immutable).';

GRANT EXECUTE ON FUNCTION public.leave_review(UUID, UUID, INTEGER, TEXT)
  TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ leave_review() updated — tradesperson must have messaged to be reviewed';
END; $$;
