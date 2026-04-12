-- Admin-configurable slot capacity for client calendar availability.

create table if not exists public.calendar_slot_settings (
  id integer primary key default 1,
  default_slots integer not null default 2 check (default_slots >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint calendar_slot_settings_singleton check (id = 1)
);

insert into public.calendar_slot_settings (id, default_slots)
values (1, 2)
on conflict (id) do nothing;

create table if not exists public.calendar_slot_overrides (
  slot_date date primary key,
  slot_capacity integer not null check (slot_capacity >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.calendar_slot_settings enable row level security;
alter table public.calendar_slot_overrides enable row level security;

drop policy if exists "Calendar slot settings readable by authenticated users" on public.calendar_slot_settings;
create policy "Calendar slot settings readable by authenticated users"
  on public.calendar_slot_settings
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Calendar slot settings writable by admins" on public.calendar_slot_settings;
create policy "Calendar slot settings writable by admins"
  on public.calendar_slot_settings
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists "Calendar slot overrides readable by authenticated users" on public.calendar_slot_overrides;
create policy "Calendar slot overrides readable by authenticated users"
  on public.calendar_slot_overrides
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Calendar slot overrides writable by admins" on public.calendar_slot_overrides;
create policy "Calendar slot overrides writable by admins"
  on public.calendar_slot_overrides
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
