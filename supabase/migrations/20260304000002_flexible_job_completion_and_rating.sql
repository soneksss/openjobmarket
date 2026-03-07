-- ============================================================
-- Migration: Flexible job completion + rating system hardening
-- ============================================================
--
-- PART A  State machine — extra transitions for flexible jobs
--   Flexible jobs (is_urgent = false) bypass the 15-min window
--   and allow homeowner to jump directly to COMPLETED or first
--   mark a hired tradesperson as IN_PROGRESS (= ACTIVE).
--
--   New allowed transitions (flexible only):
--     POSTED → ACTIVE     homeowner: "hired someone via chat, starting"
--     POSTED → COMPLETED  homeowner: "done, skipping in-progress"
--     ACTIVE → CANCELLED  homeowner cancels after marking in-progress
--   (ACTIVE → COMPLETED was already allowed for urgent jobs ✅)
--
-- PART B  RPCs
--   mark_flexible_in_progress(p_job_id)  POSTED → ACTIVE  (homeowner)
--   complete_job() updated to accept POSTED state for flexible jobs
--
-- PART C  Rating system hardening
--   • reviews.comment: NOT NULL → nullable  (optional text)
--   • DROP UPDATE policy  (no editing reviews)
--   • Fix is_review_allowed() to use uppercase 'COMPLETED' enum
--   • New leave_review() SECURITY DEFINER RPC:
--       – only homeowner of the job can call it
--       – only when status = 'COMPLETED'
--       – one review per (job, reviewer, reviewed) pair
--       – no edits possible (INSERT only, no UPDATE granted)
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  PART A: Extend enforce_job_state_machine for flexible jobs
-- ════════════════════════════════════════════════════════════
--
-- Rewrite the enforcement trigger to allow additional transitions
-- when the job is NOT urgent (is_urgent = false → flexible).

CREATE OR REPLACE FUNCTION public.enforce_job_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- No change in status — nothing to validate.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- ── Flexible jobs (is_urgent = false) ─────────────────────
  -- Classic marketplace: homeowner drives the lifecycle freely.
  -- Allowed transitions beyond the urgent state machine:
  --   POSTED → ACTIVE      mark in-progress (someone hired via chat)
  --   POSTED → COMPLETED   direct completion (skipping in-progress)
  --   ACTIVE → CANCELLED   cancel after marking in-progress
  -- (ACTIVE → COMPLETED is already in is_valid_job_transition ✅)
  IF NOT COALESCE(NEW.is_urgent, FALSE) THEN
    IF (OLD.status::TEXT, NEW.status::TEXT) IN (
      ('POSTED',    'ACTIVE'    ),
      ('POSTED',    'COMPLETED' ),
      ('POSTED',    'CANCELLED' ),
      ('ACTIVE',    'COMPLETED' ),
      ('ACTIVE',    'CANCELLED' )
    ) THEN
      RETURN NEW;
    END IF;

    -- Any other transition for flexible jobs is also blocked.
    RAISE EXCEPTION
      'Invalid flexible-job state transition: % → %. '
      'Allowed from %: %',
      OLD.status, NEW.status, OLD.status,
      CASE OLD.status::TEXT
        WHEN 'POSTED'    THEN 'ACTIVE (in-progress), COMPLETED, CANCELLED'
        WHEN 'ACTIVE'    THEN 'COMPLETED, CANCELLED'
        ELSE 'none (terminal state)'
      END
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Urgent jobs — existing machine ────────────────────────
  IF NOT public.is_valid_job_transition(OLD.status, NEW.status) THEN
    RAISE EXCEPTION
      'Invalid job state transition: % → %. '
      'Allowed transitions from %: %',
      OLD.status,
      NEW.status,
      OLD.status,
      CASE OLD.status
        WHEN 'POSTED'    THEN 'CONFIRMED, CANCELLED'
        WHEN 'CONFIRMED' THEN 'ACTIVE, POSTED (timeout), CANCELLED'
        WHEN 'ACTIVE'    THEN 'COMPLETED'
        ELSE 'none (terminal state)'
      END
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_job_state_machine() IS
  'BEFORE UPDATE trigger: enforces allowed status transitions. '
  'Urgent jobs: POSTED→CONFIRMED→ACTIVE→COMPLETED (15-min window). '
  'Flexible jobs: POSTED→ACTIVE (optional), POSTED→COMPLETED, ACTIVE→COMPLETED.';

DO $$ BEGIN
  RAISE NOTICE '✓ enforce_job_state_machine updated with flexible-job transitions';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART B-1: mark_flexible_in_progress(p_job_id)
-- ════════════════════════════════════════════════════════════
-- Called by: homeowner who owns the job
-- Effect: POSTED → ACTIVE  (signals "hired someone via chat")
-- Flexible jobs only — urgent jobs use confirm_tradesperson().

CREATE OR REPLACE FUNCTION public.mark_flexible_in_progress(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status  TEXT;
  v_urgent  BOOLEAN;
BEGIN
  -- Lock row, verify caller is homeowner of a flexible job
  SELECT j.status::TEXT, COALESCE(j.is_urgent, FALSE)
    INTO v_status, v_urgent
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id = p_job_id
    AND hp.user_id = auth.uid()
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_urgent THEN
    RAISE EXCEPTION
      'mark_flexible_in_progress() is only for flexible jobs. '
      'Use confirm_tradesperson() for urgent jobs.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_status <> 'POSTED' THEN
    RAISE EXCEPTION
      'Job must be POSTED to mark in-progress (current: %)', v_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Transition guard (enforce_job_state_machine) validates POSTED→ACTIVE
  UPDATE jobs SET status = 'ACTIVE' WHERE id = p_job_id;
END;
$$;

COMMENT ON FUNCTION public.mark_flexible_in_progress(UUID) IS
  'Homeowner marks a flexible (non-urgent) job as IN_PROGRESS (ACTIVE). '
  'Call this when a tradesperson has been hired informally via chat '
  'and work is about to start. Optional step — can jump to complete_job() directly.';

GRANT EXECUTE ON FUNCTION public.mark_flexible_in_progress(UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ mark_flexible_in_progress() created';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART B-2: Update complete_job() for flexible jobs
-- ════════════════════════════════════════════════════════════
-- Before: status must be ACTIVE (urgent-only assumption)
-- After:  urgent → still requires ACTIVE
--         flexible → accepts POSTED or ACTIVE (both valid endpoints)

CREATE OR REPLACE FUNCTION public.complete_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
BEGIN
  -- Lock row and verify caller is the homeowner
  SELECT j.status::TEXT AS status, COALESCE(j.is_urgent, FALSE) AS is_urgent
    INTO v_job
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id = p_job_id
    AND hp.user_id = auth.uid()
  FOR UPDATE;

  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_job.is_urgent THEN
    -- Urgent jobs: must be ACTIVE (tradesperson already accepted)
    IF v_job.status <> 'ACTIVE' THEN
      RAISE EXCEPTION
        'Urgent job must be ACTIVE to complete (current: %)', v_job.status
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  ELSE
    -- Flexible jobs: POSTED (direct) or ACTIVE (after in-progress) → COMPLETED
    IF v_job.status NOT IN ('POSTED', 'ACTIVE') THEN
      RAISE EXCEPTION
        'Flexible job must be POSTED or IN_PROGRESS to complete (current: %)', v_job.status
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;

  -- Transition guard enforces the move (POSTED→COMPLETED or ACTIVE→COMPLETED)
  UPDATE jobs SET status = 'COMPLETED' WHERE id = p_job_id;
END;
$$;

COMMENT ON FUNCTION public.complete_job(UUID) IS
  'Homeowner marks a job COMPLETED. '
  'Urgent jobs: must be in ACTIVE state (tradesperson has accepted). '
  'Flexible jobs: can be POSTED (direct) or ACTIVE (after in-progress). '
  'Only the homeowner can call this — prevents fake completion.';

-- GRANT already exists from migration 000006; re-assert to be safe
GRANT EXECUTE ON FUNCTION public.complete_job(UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ complete_job() updated — flexible jobs can complete from POSTED or ACTIVE';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART C-1: Make reviews.comment nullable (optional text)
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.reviews
  ALTER COLUMN comment DROP NOT NULL;

ALTER TABLE public.reviews
  ALTER COLUMN comment SET DEFAULT NULL;

COMMENT ON COLUMN public.reviews.comment IS
  'Optional short text review (1–500 chars recommended). NULL = stars only.';

DO $$ BEGIN
  RAISE NOTICE '✓ reviews.comment is now nullable (optional)';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART C-2: Remove UPDATE policy — no review edits allowed
-- ════════════════════════════════════════════════════════════
-- The existing policy "Users can update their own reviews" allowed
-- callers to modify rating and comment after submission.
-- Per spec: no edits (disputes handled separately by admin flag).

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;

DO $$ BEGIN
  RAISE NOTICE '✓ Review UPDATE policy dropped — reviews are immutable';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART C-3: Fix is_review_allowed() — uppercase enum values
-- ════════════════════════════════════════════════════════════
-- The original function compared against lowercase 'completed'/'failed'
-- which no longer matches after the state machine enum migration
-- (values are now 'COMPLETED', 'CANCELLED', etc.).

CREATE OR REPLACE FUNCTION public.is_review_allowed(
  p_job_id      UUID,
  p_reviewer_id UUID,
  p_reviewed_id UUID
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_status TEXT;
BEGIN
  SELECT status::TEXT INTO v_job_status
  FROM jobs
  WHERE id = p_job_id;

  IF v_job_status IS NULL THEN
    RETURN QUERY SELECT false, 'Job not found';
    RETURN;
  END IF;

  -- Accept both new enum ('COMPLETED') and legacy text ('completed')
  IF v_job_status NOT IN ('COMPLETED', 'completed') THEN
    RETURN QUERY SELECT false,
      format('Reviews are only allowed for COMPLETED jobs (current: %s)', v_job_status);
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM reviews
    WHERE job_id     = p_job_id
      AND reviewer_id = p_reviewer_id
      AND reviewed_id = p_reviewed_id
  ) THEN
    RETURN QUERY SELECT false, 'You have already reviewed this person for this job';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Review allowed';
END;
$$;

DO $$ BEGIN
  RAISE NOTICE '✓ is_review_allowed() fixed for uppercase COMPLETED enum';
END; $$;


-- ════════════════════════════════════════════════════════════
--  PART C-4: leave_review() — enforced SECURITY DEFINER RPC
-- ════════════════════════════════════════════════════════════
-- Hard rules enforced at DB level:
--   • Caller must be homeowner of the job (prevents tradespeople reviewing themselves)
--   • Job must be status = 'COMPLETED'
--   • One review per (job_id, reviewer_id, reviewed_id) — unique index catches dupes
--   • No UPDATE granted — reviews are insert-only

CREATE OR REPLACE FUNCTION public.leave_review(
  p_job_id      UUID,
  p_reviewed_id UUID,
  p_rating      INTEGER,
  p_comment     TEXT DEFAULT NULL
)
RETURNS UUID   -- the new review id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status        TEXT;
  v_reviewed_type TEXT;
  v_review_id     UUID;
BEGIN
  -- ── Validate rating ───────────────────────────────────────
  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 (got: %)', p_rating
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Verify caller is the homeowner and job is COMPLETED ───
  SELECT j.status::TEXT
    INTO v_status
  FROM jobs j
  JOIN homeowner_profiles hp ON hp.id = j.homeowner_id
  WHERE j.id = p_job_id
    AND hp.user_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job not found or you are not the homeowner'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status <> 'COMPLETED' THEN
    RAISE EXCEPTION
      'Reviews can only be left for COMPLETED jobs (current status: %)', v_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── No duplicate reviews ──────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM reviews
    WHERE job_id      = p_job_id
      AND reviewer_id = auth.uid()
      AND reviewed_id = p_reviewed_id
  ) THEN
    RAISE EXCEPTION 'You have already left a review for this job'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- ── Resolve the tradesperson profile type ─────────────────
  -- Needed so the update_user_rating() trigger updates the right profile table.
  SELECT user_type
    INTO v_reviewed_type
  FROM public.users
  WHERE id = p_reviewed_id;

  -- Normalise to the reviewed_type values the trigger expects.
  v_reviewed_type := CASE v_reviewed_type
    WHEN 'contractor'   THEN 'contractor'
    WHEN 'professional' THEN 'professional'
    WHEN 'company'      THEN 'company'
    WHEN 'homeowner'    THEN 'homeowner'
    ELSE                     'contractor'   -- safe default
  END;

  -- ── Insert the review ─────────────────────────────────────
  INSERT INTO public.reviews (
    job_id,
    reviewer_id,
    reviewed_id,
    rating,
    comment,
    reviewer_type,
    reviewed_type
  )
  VALUES (
    p_job_id,
    auth.uid(),
    p_reviewed_id,
    p_rating,
    p_comment,          -- NULL is fine (nullable after PART C-1)
    'homeowner',
    v_reviewed_type
  )
  RETURNING id INTO v_review_id;

  -- The update_user_rating() trigger fires here and updates
  -- contractor_profiles.average_rating / reviews_count automatically.

  RETURN v_review_id;
END;
$$;

COMMENT ON FUNCTION public.leave_review(UUID, UUID, INTEGER, TEXT) IS
  'Homeowner leaves a star rating (1–5) with optional text for a COMPLETED job. '
  'Enforces: caller = homeowner, status = COMPLETED, one review per job. '
  'Reviews are immutable — no UPDATE is granted. '
  'The update_user_rating() trigger automatically updates the tradesperson''s '
  'average_rating and reviews_count on their profile table.';

GRANT EXECUTE ON FUNCTION public.leave_review(UUID, UUID, INTEGER, TEXT)
  TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ leave_review() RPC created';
END; $$;


-- ════════════════════════════════════════════════════════════
--  Verification
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_comment_nullable  BOOLEAN;
  v_update_policy     BOOLEAN;
  v_fn_in_progress    BOOLEAN;
  v_fn_complete       BOOLEAN;
  v_fn_leave_review   BOOLEAN;
  v_fn_is_allowed     BOOLEAN;
BEGIN
  -- Check comment is nullable
  SELECT is_nullable = 'YES'
    INTO v_comment_nullable
  FROM information_schema.columns
  WHERE table_name = 'reviews' AND column_name = 'comment';

  -- Check UPDATE policy is gone
  SELECT NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reviews'
      AND cmd = 'UPDATE'
  ) INTO v_update_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'mark_flexible_in_progress' AND n.nspname = 'public'
  ) INTO v_fn_in_progress;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'complete_job' AND n.nspname = 'public'
  ) INTO v_fn_complete;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'leave_review' AND n.nspname = 'public'
  ) INTO v_fn_leave_review;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_review_allowed' AND n.nspname = 'public'
  ) INTO v_fn_is_allowed;

  RAISE NOTICE '─────────────────────────────────────────────────────';
  RAISE NOTICE 'Migration — Flexible Completion + Rating Hardening';
  RAISE NOTICE '';
  RAISE NOTICE '  State machine:';
  RAISE NOTICE '    enforce_job_state_machine (flexible transitions) : ✓ (rewritten above)';
  RAISE NOTICE '    mark_flexible_in_progress()                      : %', CASE WHEN v_fn_in_progress THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '    complete_job() (updated)                         : %', CASE WHEN v_fn_complete    THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '  Rating system:';
  RAISE NOTICE '    reviews.comment nullable                         : %', CASE WHEN v_comment_nullable THEN '✓' ELSE '✗ STILL NOT NULL' END;
  RAISE NOTICE '    UPDATE policy removed (no edits)                 : %', CASE WHEN v_update_policy   THEN '✓' ELSE '✗ POLICY STILL EXISTS' END;
  RAISE NOTICE '    is_review_allowed() fixed (uppercase enum)       : %', CASE WHEN v_fn_is_allowed   THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '    leave_review() RPC                               : %', CASE WHEN v_fn_leave_review THEN '✓' ELSE '✗ MISSING' END;
  RAISE NOTICE '─────────────────────────────────────────────────────';

  IF NOT (v_comment_nullable AND v_update_policy AND v_fn_in_progress
       AND v_fn_complete AND v_fn_leave_review AND v_fn_is_allowed) THEN
    RAISE EXCEPTION 'Migration verification failed — check NOTICE output above';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Flexible completion + rating hardening applied.';
  RAISE NOTICE '';
  RAISE NOTICE 'Flexible job lifecycle:';
  RAISE NOTICE '  POSTED → ACTIVE      mark_flexible_in_progress()  (optional)';
  RAISE NOTICE '  POSTED → COMPLETED   complete_job()               (direct)';
  RAISE NOTICE '  ACTIVE → COMPLETED   complete_job()               (after in-progress)';
  RAISE NOTICE '';
  RAISE NOTICE 'Rating rules:';
  RAISE NOTICE '  leave_review(job_id, reviewed_id, rating, comment?)';
  RAISE NOTICE '  Only homeowner, only COMPLETED, one per job, immutable.';
  RAISE NOTICE '─────────────────────────────────────────────────────';
END;
$$;
