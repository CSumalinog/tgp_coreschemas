-- Fix: sync_request_status_from_assignments was counting Cancelled and No Show
-- assignments in v_total, causing the "completed === total" condition to never
-- fire after a reassignment (No Show + replacement = total 2, completed 1).
-- Exclude terminal/replaced rows from the aggregate so only active assignments
-- drive the request lifecycle.

create or replace function public.sync_request_status_from_assignments(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_has_assignment boolean;
  v_total int;
  v_completed int;
  v_ongoing int;
  v_next_status text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1
    from public.coverage_assignments ca
    where ca.request_id = p_request_id
      and ca.assigned_to = v_user_id
  )
  into v_has_assignment;

  if not v_has_assignment then
    raise exception 'Forbidden: no assignment for current user';
  end if;

  -- Only count active (non-terminal) assignments.
  -- Cancelled = emergency announced (replaced), No Show = unannounced no-show (replaced).
  -- Including them would permanently inflate v_total and block the Completed transition.
  select
    count(*)::int,
    count(*) filter (where coalesce(status, '') = 'Completed')::int,
    count(*) filter (
      where coalesce(status, '') = 'On Going'
         or timed_in_at is not null
    )::int
  into v_total, v_completed, v_ongoing
  from public.coverage_assignments
  where request_id = p_request_id
    and coalesce(status, '') not in ('Cancelled', 'No Show');

  if v_total = 0 then
    return null;
  end if;

  if v_completed = v_total then
    update public.coverage_requests
    set status = 'Completed',
        completed_at = coalesce(completed_at, now())
    where id = p_request_id
      and status is distinct from 'Completed';

    v_next_status := 'Completed';
  elsif v_ongoing > 0 then
    update public.coverage_requests
    set status = 'On Going',
        completed_at = null
    where id = p_request_id
      and status in ('Pending', 'Forwarded', 'For Approval', 'Assigned', 'Approved', 'On Going');

    v_next_status := 'On Going';
  else
    v_next_status := null;
  end if;

  return v_next_status;
end;
$$;

revoke all on function public.sync_request_status_from_assignments(uuid) from public;
grant execute on function public.sync_request_status_from_assignments(uuid) to authenticated;
