-- ── Dispatch lifecycle on jobs ───────────────────────────────────────────────
alter table jobs
  add column if not exists dispatch_started_at   timestamp,
  add column if not exists dispatch_expires_at   timestamp,
  add column if not exists dispatch_radius_miles int  default 3,
  add column if not exists dispatch_state        text default 'searching';
  -- dispatch_state: searching | expanding | completed | expired

-- ── Response tracking on dispatch alerts ─────────────────────────────────────
alter table urgent_job_dispatch_alerts
  add column if not exists responded    boolean   default false,
  add column if not exists responded_at timestamp;

-- ── View: responder count per job ────────────────────────────────────────────
create or replace view job_response_counts as
  select   job_id, count(*) as responses
  from     urgent_job_dispatch_alerts
  where    responded = true
  group by job_id;

-- ── Indexes for cron query performance ───────────────────────────────────────
create index if not exists idx_jobs_dispatch_active
  on jobs(dispatch_started_at, dispatch_radius_miles)
  where dispatch_state in ('searching', 'expanding');

create index if not exists idx_dispatch_responded
  on urgent_job_dispatch_alerts(job_id)
  where responded = true;

grant select on job_response_counts to service_role;
