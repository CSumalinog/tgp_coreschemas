-- Fix the approve_duty_schedule_change_request function type mismatch
-- The v_schedule_id variable was incorrectly declared as bigint instead of uuid
-- This caused: "invalid input syntax for type bigint: [uuid]"

create or replace function public.approve_duty_schedule_change_request(
  p_request_id uuid,
  p_reviewer_id uuid default auth.uid()
)
returns table (
  request_id uuid,
  staffer_id uuid,
  semester_id uuid,
  from_day integer,
  to_day integer,
  reviewed_by uuid,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.duty_schedule_change_requests%rowtype;
  v_schedule_id uuid;
  v_current_day integer;
  v_requested_count integer;
  v_capacity integer;
  v_actor_division text;
  v_source_scribes integer;
  v_source_creatives integer;
  v_source_total integer;
  v_target_scribes integer;
  v_target_creatives integer;
  v_target_total integer;
  v_reviewer_id uuid;
  v_now timestamptz := now();
  v_scheduling_open boolean;
begin
  v_reviewer_id := coalesce(p_reviewer_id, auth.uid());

  if v_reviewer_id is null then
    raise exception 'Reviewer identity is required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_reviewer_id
      and p.role = 'admin'
  ) then
    raise exception 'Only admins can approve duty schedule change requests';
  end if;

  select *
    into v_request
  from public.duty_schedule_change_requests r
  where r.id = p_request_id
  for update;

  if not found then
    raise exception 'Duty schedule change request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending requests can be approved';
  end if;

  if v_request.current_duty_day = v_request.requested_duty_day then
    raise exception 'Requested day is the same as current duty day';
  end if;

  select s.scheduling_open,
         case v_request.requested_duty_day
           when 0 then coalesce(s.monday_slots, 10)
           when 1 then coalesce(s.tuesday_slots, 10)
           when 2 then coalesce(s.wednesday_slots, 10)
           when 3 then coalesce(s.thursday_slots, 10)
           when 4 then coalesce(s.friday_slots, 10)
           else 10
         end
    into v_scheduling_open, v_capacity
  from public.semesters s
  where s.id = v_request.semester_id;

  if coalesce(v_scheduling_open, false) = false then
    raise exception 'Scheduling is closed for this semester';
  end if;

  select ds.id, ds.duty_day
    into v_schedule_id, v_current_day
  from public.duty_schedules ds
  where ds.semester_id = v_request.semester_id
    and ds.staffer_id = v_request.staffer_id
  for update;

  if v_schedule_id is null then
    raise exception 'Staff member does not have an existing duty schedule';
  end if;

  if v_current_day <> v_request.current_duty_day then
    raise exception 'Request is stale because the current duty day already changed';
  end if;

  select count(*)
    into v_requested_count
  from public.duty_schedules ds
  where ds.semester_id = v_request.semester_id
    and ds.duty_day = v_request.requested_duty_day
    and ds.staffer_id <> v_request.staffer_id;

  if v_requested_count + 1 > coalesce(v_capacity, 10) then
    raise exception 'Requested day is already full (%/%).', v_requested_count, coalesce(v_capacity, 10);
  end if;

  select case
           when lower(trim(coalesce(p.division, ''))) in ('scribe', 'scribes') then 'Scribes'
           when lower(trim(coalesce(p.division, ''))) in ('creative', 'creatives') then 'Creatives'
           else null
         end
    into v_actor_division
  from public.profiles p
  where p.id = v_request.staffer_id;

  if v_actor_division in ('Scribes', 'Creatives') then
    select
      count(*) filter (where lower(trim(coalesce(p.division, ''))) in ('scribe', 'scribes')),
      count(*) filter (where lower(trim(coalesce(p.division, ''))) in ('creative', 'creatives')),
      count(*)
      into v_source_scribes, v_source_creatives, v_source_total
    from public.duty_schedules ds
    join public.profiles p on p.id = ds.staffer_id
    where ds.semester_id = v_request.semester_id
      and ds.duty_day = v_request.current_duty_day
      and ds.staffer_id <> v_request.staffer_id;

    select
      count(*) filter (where lower(trim(coalesce(p.division, ''))) in ('scribe', 'scribes')),
      count(*) filter (where lower(trim(coalesce(p.division, ''))) in ('creative', 'creatives')),
      count(*)
      into v_target_scribes, v_target_creatives, v_target_total
    from public.duty_schedules ds
    join public.profiles p on p.id = ds.staffer_id
    where ds.semester_id = v_request.semester_id
      and ds.duty_day = v_request.requested_duty_day
      and ds.staffer_id <> v_request.staffer_id;

    if v_actor_division = 'Scribes' then
      v_target_scribes := coalesce(v_target_scribes, 0) + 1;
    elsif v_actor_division = 'Creatives' then
      v_target_creatives := coalesce(v_target_creatives, 0) + 1;
    end if;
    v_target_total := coalesce(v_target_total, 0) + 1;

    if coalesce(v_source_total, 0) > 0
      and (coalesce(v_source_scribes, 0) = 0 or coalesce(v_source_creatives, 0) = 0) then
      raise exception 'Balance policy violation: source day must keep both Scribes and Creatives';
    end if;

    if coalesce(v_target_total, 0) > 0
      and (coalesce(v_target_scribes, 0) = 0 or coalesce(v_target_creatives, 0) = 0) then
      raise exception 'Balance policy violation: target day must keep both Scribes and Creatives';
    end if;
  end if;

  update public.duty_schedules ds
    set duty_day = v_request.requested_duty_day
  where ds.id = v_schedule_id;

  update public.duty_schedule_change_requests r
    set status = 'approved',
        reviewed_at = v_now,
        reviewed_by = v_reviewer_id,
        review_notes = null
  where r.id = v_request.id;

  insert into public.duty_schedule_audit_logs (
    semester_id,
    actor_id,
    target_staffer_id,
    request_id,
    action_type,
    metadata
  ) values (
    v_request.semester_id,
    v_reviewer_id,
    v_request.staffer_id,
    v_request.id,
    'duty_change_approved',
    jsonb_build_object(
      'from_day', v_request.current_duty_day,
      'to_day', v_request.requested_duty_day,
      'enforced_by', 'approve_duty_schedule_change_request'
    )
  );

  return query
  select
    v_request.id,
    v_request.staffer_id,
    v_request.semester_id,
    v_request.current_duty_day,
    v_request.requested_duty_day,
    v_reviewer_id,
    v_now;
end;
$$;

grant execute on function public.approve_duty_schedule_change_request(uuid, uuid) to authenticated;
