-- Add "Rectified" as a valid coverage_assignment status.
-- A rectified assignment was initially marked No Show but the staffer
-- successfully proved their attendance and the sec head approved.

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
    'No Show',
    'Rectified'
  )
);
