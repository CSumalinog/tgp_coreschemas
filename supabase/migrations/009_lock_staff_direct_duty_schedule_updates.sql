-- 009: Enforce schedule-change approval at DB level
-- Staff can only set first-time duty schedule directly.
-- Any subsequent day changes must go through duty_schedule_change_requests.

alter table public.duty_schedules enable row level security;

-- Reset existing policies to avoid permissive leftovers bypassing this workflow.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'duty_schedules'
  loop
    execute format('drop policy if exists %I on public.duty_schedules', policy_row.policyname);
  end loop;
end $$;

create policy "Duty schedules readable by authenticated users"
  on public.duty_schedules
  for select
  using (auth.role() = 'authenticated');

create policy "Staff can insert first duty schedule only"
  on public.duty_schedules
  for insert
  with check (
    auth.uid() = staffer_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'staff'
    )
    and not exists (
      select 1
      from public.duty_schedules ds
      where ds.staffer_id = auth.uid()
        and ds.semester_id = duty_schedules.semester_id
    )
  );

create policy "Admins can insert duty schedules"
  on public.duty_schedules
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Admins can update duty schedules"
  on public.duty_schedules
  for update
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

create policy "Admins can delete duty schedules"
  on public.duty_schedules
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
