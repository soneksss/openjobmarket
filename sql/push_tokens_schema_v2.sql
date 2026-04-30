-- Push token schema improvements
-- Run this in Supabase SQL editor (Project → SQL Editor → New query)
--
-- 1. Add `role` column so dispatch queries can filter by user type without extra joins
-- 2. Add `last_seen` column so stale tokens (90+ days) can be pruned by a cron job
-- 3. Replace UNIQUE(user_id, token) with UNIQUE(token) so a device token can only
--    ever belong to one user — prevents cross-user notification leakage on shared devices

-- Step 1: Add new columns (idempotent)
ALTER TABLE user_push_tokens
  ADD COLUMN IF NOT EXISTS role       text,
  ADD COLUMN IF NOT EXISTS last_seen  timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS platform   text;  -- 'android' | 'ios' | 'web'

-- Step 2: Deduplicate — keep the newest row per token, delete the rest.
-- This is necessary because UNIQUE(user_id, token) allowed the same token to be
-- stored for multiple users. We keep the most recently created row (most likely
-- the current owner) and discard older duplicates.
DELETE FROM user_push_tokens
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY token ORDER BY created_at DESC) AS rn
    FROM user_push_tokens
  ) ranked
  WHERE rn > 1
);

-- Step 3: Drop old constraint and add new one
--   Common auto-generated name: user_push_tokens_user_id_token_key
DO $$
BEGIN
  -- Drop old composite unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_push_tokens_user_id_token_key'
      AND conrelid = 'user_push_tokens'::regclass
  ) THEN
    ALTER TABLE user_push_tokens DROP CONSTRAINT user_push_tokens_user_id_token_key;
  END IF;

  -- Add new token-only unique constraint if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_push_tokens_token_key'
      AND conrelid = 'user_push_tokens'::regclass
  ) THEN
    ALTER TABLE user_push_tokens ADD CONSTRAINT user_push_tokens_token_key UNIQUE (token);
  END IF;
END $$;

-- Step 4: Normalize NULL last_seen — set to created_at so stale pre-migration tokens
-- are not treated as permanently active and will age out after 90 days normally.
UPDATE user_push_tokens
SET last_seen = created_at
WHERE last_seen IS NULL;

-- Step 5: Backfill role using EXISTS (safe: no duplicate rows if user has multiple profiles)
UPDATE user_push_tokens t
SET role = 'tradesperson'
WHERE t.role IS NULL
  AND EXISTS (SELECT 1 FROM company_profiles cp WHERE cp.user_id = t.user_id);

UPDATE user_push_tokens t
SET role = 'homeowner'
WHERE t.role IS NULL
  AND EXISTS (SELECT 1 FROM homeowner_profiles hp WHERE hp.user_id = t.user_id);

-- Step 6: Add platform constraint (reject invalid values at DB level)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_push_tokens_platform_check'
      AND conrelid = 'user_push_tokens'::regclass
  ) THEN
    ALTER TABLE user_push_tokens
      ADD CONSTRAINT user_push_tokens_platform_check
      CHECK (platform IN ('android', 'ios', 'web'));
  END IF;
END $$;

-- Step 7: Indexes for dispatch and lookup performance
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id
  ON user_push_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_role
  ON user_push_tokens (role);

-- Composite index for dispatch queries that filter role + platform + recency
CREATE INDEX IF NOT EXISTS idx_push_tokens_role_platform_last_seen
  ON user_push_tokens (role, platform, last_seen);
