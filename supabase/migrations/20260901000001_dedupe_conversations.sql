-- ============================================================
-- Dedupe conversations + stop creating duplicate empty threads
--
-- Bug: clicking "Message" on a profile / search result calls
-- get_or_create_conversation() with p_job_id = NULL, which ALWAYS
-- ran an INSERT. Repeated clicks produced hundreds of empty
-- "No messages yet — say hello!" threads with the same person.
--
-- This migration:
--   1. Merges duplicate conversations (same participant pair +
--      same job bucket) into one keeper, repointing messages and
--      reviews, then deletes the emptied duplicates.
--   2. Rewrites get_or_create_conversation() so the general
--      (non-job) thread is REUSED per participant pair instead of
--      recreated on every call.
--   3. Adds a partial unique index so non-job duplicates can't
--      come back, and makes the function race-safe against it.
--
-- Written to run statement-by-statement in the Supabase SQL
-- Editor (pooled connection — no temp tables). The dup->keeper
-- map is recomputed inline in each statement; it is stable
-- because the keeper is always the row with the most messages.
-- ============================================================


-- ── 1a. Repoint messages off duplicate threads onto the keeper ──

WITH ranked AS (
  SELECT
    c.id,
    c.participant_1,
    c.participant_2,
    COALESCE(c.job_id::text, 'none') AS job_bucket,
    row_number() OVER (
      PARTITION BY c.participant_1, c.participant_2, COALESCE(c.job_id::text, 'none')
      ORDER BY
        (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) DESC,
        c.created_at ASC,
        c.id ASC
    ) AS rn
  FROM conversations c
),
merge_map AS (
  SELECT d.id AS dup_id, k.id AS keep_id
  FROM ranked d
  JOIN ranked k
    ON  k.participant_1 = d.participant_1
    AND k.participant_2 = d.participant_2
    AND k.job_bucket    = d.job_bucket
    AND k.rn = 1
  WHERE d.rn > 1
)
UPDATE messages m
SET    conversation_id = merge_map.keep_id
FROM   merge_map
WHERE  m.conversation_id = merge_map.dup_id;


-- ── 1b. Repoint reviews too (column exists since 20251230132030) ──

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'conversation_id'
  ) THEN
    EXECUTE $q$
      WITH ranked AS (
        SELECT
          c.id, c.participant_1, c.participant_2,
          COALESCE(c.job_id::text, 'none') AS job_bucket,
          row_number() OVER (
            PARTITION BY c.participant_1, c.participant_2, COALESCE(c.job_id::text, 'none')
            ORDER BY
              (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) DESC,
              c.created_at ASC, c.id ASC
          ) AS rn
        FROM conversations c
      ),
      merge_map AS (
        SELECT d.id AS dup_id, k.id AS keep_id
        FROM ranked d
        JOIN ranked k
          ON  k.participant_1 = d.participant_1
          AND k.participant_2 = d.participant_2
          AND k.job_bucket    = d.job_bucket
          AND k.rn = 1
        WHERE d.rn > 1
      )
      UPDATE reviews r
      SET    conversation_id = merge_map.keep_id
      FROM   merge_map
      WHERE  r.conversation_id = merge_map.dup_id
    $q$;
  END IF;
END $$;


-- ── 1c. Delete the now-empty duplicate threads ──

WITH ranked AS (
  SELECT
    c.id,
    c.participant_1,
    c.participant_2,
    COALESCE(c.job_id::text, 'none') AS job_bucket,
    row_number() OVER (
      PARTITION BY c.participant_1, c.participant_2, COALESCE(c.job_id::text, 'none')
      ORDER BY
        (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) DESC,
        c.created_at ASC,
        c.id ASC
    ) AS rn
  FROM conversations c
),
merge_map AS (
  SELECT d.id AS dup_id
  FROM ranked d
  JOIN ranked k
    ON  k.participant_1 = d.participant_1
    AND k.participant_2 = d.participant_2
    AND k.job_bucket    = d.job_bucket
    AND k.rn = 1
  WHERE d.rn > 1
)
DELETE FROM conversations c
USING  merge_map
WHERE  c.id = merge_map.dup_id;


-- ── 1d. Refresh each surviving thread's updated_at ──

UPDATE conversations c
SET    updated_at = GREATEST(c.updated_at, lm.max_created)
FROM (
  SELECT conversation_id, max(created_at) AS max_created
  FROM   messages
  WHERE  conversation_id IS NOT NULL
  GROUP  BY conversation_id
) lm
WHERE c.id = lm.conversation_id;


-- ── 2. Guard index: at most one non-job thread per pair ─────
--     (job threads already covered by idx_conversations_per_job)

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_no_job
  ON conversations (participant_1, participant_2)
  WHERE job_id IS NULL;


-- ── 3. Rebuild get_or_create_conversation() ─────────────────
--     Non-job calls now REUSE the pair's general thread.

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

  -- Look for an existing thread to reuse
  IF p_job_id IS NOT NULL THEN
    -- One thread per (pair + job)
    SELECT id INTO conv_id
    FROM conversations
    WHERE participant_1 = p1 AND participant_2 = p2 AND job_id = p_job_id
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    -- One general (non-job) thread per pair — reuse, don't recreate
    SELECT id INTO conv_id
    FROM conversations
    WHERE participant_1 = p1 AND participant_2 = p2 AND job_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF conv_id IS NOT NULL THEN
    -- Backfill a subject if the thread doesn't have one yet
    IF p_subject IS NOT NULL AND p_subject <> '' THEN
      UPDATE conversations
      SET    subject = p_subject
      WHERE  id = conv_id AND (subject IS NULL OR subject = '');
    END IF;
    RETURN conv_id;
  END IF;

  -- None found — create it, tolerating a concurrent creator
  BEGIN
    INSERT INTO conversations (participant_1, participant_2, job_id, subject)
    VALUES (p1, p2, p_job_id, p_subject)
    RETURNING id INTO conv_id;
  EXCEPTION WHEN unique_violation THEN
    IF p_job_id IS NOT NULL THEN
      SELECT id INTO conv_id
      FROM conversations
      WHERE participant_1 = p1 AND participant_2 = p2 AND job_id = p_job_id
      ORDER BY created_at ASC
      LIMIT 1;
    ELSE
      SELECT id INTO conv_id
      FROM conversations
      WHERE participant_1 = p1 AND participant_2 = p2 AND job_id IS NULL
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END;

  RETURN conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID, TEXT)
  TO authenticated, anon;

DO $$ BEGIN
  RAISE NOTICE 'conversations de-duplicated; general threads now reused per pair';
END $$;
