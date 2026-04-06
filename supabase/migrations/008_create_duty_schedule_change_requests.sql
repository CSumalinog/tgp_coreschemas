create table if not exists public.duty_schedule_change_requests (
  id uuid primary key default gen_random_uuid(),
  staffer_id uuid not null references public.profiles(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  current_duty_day integer not null check (current_duty_day between 0 and 4),
  requested_duty_day integer not null check (requested_duty_day between 0 and 4),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists duty_schedule_change_requests_one_pending_per_staffer
  on public.duty_schedule_change_requests (staffer_id, semester_id)
  where status = 'pending';

create index if not exists duty_schedule_change_requests_semester_status_idx
  on public.duty_schedule_change_requests (semester_id, status, created_at desc);

create or replace function public.set_duty_schedule_change_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_duty_schedule_change_requests_updated_at on public.duty_schedule_change_requests;

create trigger trg_duty_schedule_change_requests_updated_at
before update on public.duty_schedule_change_requests
for each row
execute function public.set_duty_schedule_change_request_updated_at();

alter table public.duty_schedule_change_requests enable row level security;

drop policy if exists "Staff and admins can read duty schedule change requests" on public.duty_schedule_change_requests;
create policy "Staff and admins can read duty schedule change requests"
  on public.duty_schedule_change_requests
  for select
  using (
    auth.uid() = staffer_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Staff can insert own duty schedule change requests" on public.duty_schedule_change_requests;
create policy "Staff can insert own duty schedule change requests"
  on public.duty_schedule_change_requests
  for insert
  with check (
    auth.uid() = staffer_id
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

drop policy if exists "Admins can update duty schedule change requests" on public.duty_schedule_change_requests;
create policy "Admins can update duty schedule change requests"
  on public.duty_schedule_change_requests
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );