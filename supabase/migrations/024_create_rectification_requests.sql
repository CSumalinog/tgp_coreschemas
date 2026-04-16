-- Creates the rectification_requests table for staff to dispute no-show marks.
-- Sec heads review and approve/reject per their section.

create table if not exists public.rectification_requests (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.coverage_assignments(id) on delete cascade,
  request_id      uuid not null references public.coverage_requests(id) on delete cascade,
  staff_id        uuid not null references public.profiles(id) on delete cascade,
  section         text not null,
  reason          text not null,
  proof_path      text,
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  reviewer_note   text,
  created_at      timestamptz not null default now()
);

-- One open rectification per assignment at a time
create unique index if not exists rectification_requests_pending_unique
  on public.rectification_requests(assignment_id)
  where status = 'pending';

-- Indexes for common query patterns
create index if not exists idx_rectification_requests_staff
  on public.rectification_requests(staff_id);

create index if not exists idx_rectification_requests_section_status
  on public.rectification_requests(section, status);

create index if not exists idx_rectification_requests_request_id
  on public.rectification_requests(request_id);

-- RLS
alter table public.rectification_requests enable row level security;

-- Staff: can insert their own, read their own
create or replace policy "staff_insert_own_rectification"
  on public.rectification_requests
  for insert
  to authenticated
  with check (staff_id = auth.uid());

create or replace policy "staff_read_own_rectification"
  on public.rectification_requests
  for select
  to authenticated
  using (staff_id = auth.uid());

-- Sec heads: can read rectifications for their section, can update (review)
create or replace policy "sec_head_read_section_rectification"
  on public.rectification_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'sec_head'
        and p.section = rectification_requests.section
        and p.is_active = true
    )
  );

create or replace policy "sec_head_review_rectification"
  on public.rectification_requests
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'sec_head'
        and p.section = rectification_requests.section
        and p.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'sec_head'
        and p.section = rectification_requests.section
        and p.is_active = true
    )
  );

-- Admins: full read access
create or replace policy "admin_read_all_rectifications"
  on public.rectification_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );
