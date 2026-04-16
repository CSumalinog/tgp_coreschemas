-- Backfill historical staff assignment notifications so actor/avatar reflects
-- the section head who assigned the staffer (coverage_assignments.assigned_by),
-- not the admin approver.

with assignment_actor as (
  select
    ca.request_id,
    ca.assigned_to,
    (array_agg(ca.assigned_by order by ca.assigned_by::text))[1] as assigned_by
  from public.coverage_assignments ca
  where ca.assigned_by is not null
  group by ca.request_id, ca.assigned_to
)
update public.notifications n
set created_by = aa.assigned_by
from assignment_actor aa
where n.request_id = aa.request_id
  and coalesce(n.recipient_id, n.user_id) = aa.assigned_to
  and n.title = 'Coverage Assignment Finalized'
  and n.type in ('assigned', 'for_approval')
  and n.recipient_role in ('staff', 'regular_staff')
  and aa.assigned_by is not null
  and n.created_by is distinct from aa.assigned_by;
