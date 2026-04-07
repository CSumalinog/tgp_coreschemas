alter table public.notifications
add column if not exists target_path text;

alter table public.notifications
add column if not exists target_payload jsonb not null default '{}'::jsonb;

create index if not exists idx_notifications_target_path
  on public.notifications(target_path);