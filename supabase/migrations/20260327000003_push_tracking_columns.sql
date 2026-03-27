-- Add push delivery tracking columns to urgent_job_dispatch_alerts.
-- push_attempted: set to true the moment we start a push attempt
-- push_sent:      set to true only when the push service confirms delivery
-- push_sent_at:   timestamp of confirmed delivery
-- push_error:     error message when push_attempted=true but push_sent=false
-- (push_sent and push_sent_at may already exist from the previous migration — use ADD COLUMN IF NOT EXISTS)

alter table urgent_job_dispatch_alerts
  add column if not exists push_attempted boolean   default false,
  add column if not exists push_sent      boolean   default false,
  add column if not exists push_sent_at   timestamp,
  add column if not exists push_error     text;

-- Partial index to efficiently find failed push attempts (for retry / debugging)
create index if not exists idx_dispatch_push_failed
  on urgent_job_dispatch_alerts(job_id)
  where push_attempted = true and push_sent = false;
