-- Push token storage for web push notifications
create table if not exists user_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,              -- full PushSubscription JSON
  device_type text default 'web',
  created_at  timestamp default now(),
  unique(user_id, token)
);

create index if not exists idx_push_tokens_user
  on user_push_tokens(user_id);

-- Enforce non-null on notifications (guards against silent failures)
alter table notifications
  alter column user_id set not null;

alter table notifications
  alter column type set not null;

-- Track push delivery on dispatch alerts
alter table urgent_job_dispatch_alerts
  add column if not exists push_sent        boolean   default false,
  add column if not exists push_sent_at     timestamp,
  add column if not exists debug_created_at timestamp default now();

-- Helper view: join users → tokens (used by dispatch route)
create or replace view user_push_targets as
  select u.id as user_id, t.token
  from   auth.users u
  join   user_push_tokens t on t.user_id = u.id;

-- RPC: get all push tokens for a given user
create or replace function get_user_push_tokens(p_user_id uuid)
returns table(token text)
language sql security definer
as $$
  select token
  from   user_push_tokens
  where  user_id = p_user_id;
$$;

grant select   on user_push_targets              to service_role;
grant execute  on function get_user_push_tokens  to service_role;
