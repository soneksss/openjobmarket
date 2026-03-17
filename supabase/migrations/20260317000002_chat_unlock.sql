-- ============================================================
-- Migration: Chat unlock + first-message tracking
-- ============================================================
-- Goal:
--   • Tradesperson sends ONE message (cover letter) to apply.
--   • Homeowner must reply before tradesperson can send more.
--   • chat_unlocked = TRUE when homeowner replies.
--   • first_message_at tracks when the tradesperson first contacted.
--
-- Enforcement is in POST /api/messages (app layer).
-- This migration only adds the columns.
-- ============================================================

-- 1. Add chat_unlocked flag
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS chat_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.job_applications.chat_unlocked IS
  'Set TRUE when the homeowner sends the first reply. '
  'Tradesperson is blocked from sending further messages until this is TRUE.';

-- 2. Add first_message_at timestamp
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS first_message_at TIMESTAMPTZ;

COMMENT ON COLUMN public.job_applications.first_message_at IS
  'Timestamp of the tradesperson''s first message / application. '
  'NULL = tradesperson has not yet messaged. '
  'Set on their first POST /api/messages call.';

-- 3. Verify
DO $$ BEGIN
  RAISE NOTICE '─────────────────────────────────────────────────';
  RAISE NOTICE 'job_applications.chat_unlocked  : added (DEFAULT FALSE)';
  RAISE NOTICE 'job_applications.first_message_at: added (NULLABLE)';
  RAISE NOTICE '─────────────────────────────────────────────────';
END $$;
