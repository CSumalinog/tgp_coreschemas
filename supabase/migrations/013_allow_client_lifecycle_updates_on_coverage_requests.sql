-- Allow authenticated clients to update their own coverage requests
-- so cancel/reschedule lifecycle updates pass RLS checks.

alter table public.coverage_requests enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'coverage_requests'
      and policyname = 'Clients can update own coverage requests lifecycle'
  ) then
    create policy "Clients can update own coverage requests lifecycle"
      on public.coverage_requests
      for update
      to authenticated
      using (auth.uid() = requester_id)
      with check (auth.uid() = requester_id);
  end if;
end $$;
