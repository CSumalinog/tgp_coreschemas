alter table public.coverage_assignments
drop constraint if exists coverage_assignments_status_check;

alter table public.coverage_assignments
add constraint coverage_assignments_status_check
check (
  status in (
    'Pending',
    'Assigned',
    'Approved',
    'On Going',
    'Completed',
    'Cancelled',
    'No Show'
  )
);