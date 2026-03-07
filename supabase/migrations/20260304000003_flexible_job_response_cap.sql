-- ============================================================
-- Migration: Flexible job response cap
-- ============================================================
-- Adds:
--   jobs.max_responses  INTEGER NULL  — cap on how many distinct
--                                       tradespeople can message about a job.
--                                       NULL = no cap (vacancy/urgent jobs).
--                                       Flexible jobs default to 10.
--
--   messages.sender_role TEXT NULL    — 'tradesperson' | 'homeowner' | etc.
--                                       Used to COUNT(DISTINCT sender_id)
--                                       without a separate table.
-- ============================================================

-- 1. Add max_responses to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS max_responses INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.jobs.max_responses IS
  'Max distinct tradespeople allowed to respond (message) about this job. '
  'NULL = unlimited. Flexible jobs default to 10.';

-- 2. Add sender_role to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT NULL;

COMMENT ON COLUMN public.messages.sender_role IS
  'Role of the sender at send time. '
  'Values: ''tradesperson'', ''homeowner'', ''company'', ''professional''. '
  'Used to count distinct tradesperson responders per job without a separate table.';

DO $$ BEGIN
  RAISE NOTICE '✓ jobs.max_responses and messages.sender_role columns added';
END; $$;
