-- Add data JSONB column to notifications table.
-- Used to store enriched payload for job_accepted notifications
-- (job_id, budget, location, conversation_id, application_id, message_url)
-- so the AcceptedToast can render full context without extra DB fetches.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT NULL;
