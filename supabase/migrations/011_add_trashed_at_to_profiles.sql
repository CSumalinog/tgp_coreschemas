-- Add soft-delete support for staff profile records.
alter table if exists public.profiles
  add column if not exists trashed_at timestamptz;

create index if not exists idx_profiles_trashed_at on public.profiles (trashed_at);
