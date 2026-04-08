alter table public.semesters
add column if not exists monday_slots integer not null default 10,
add column if not exists tuesday_slots integer not null default 10,
add column if not exists wednesday_slots integer not null default 10,
add column if not exists thursday_slots integer not null default 10,
add column if not exists friday_slots integer not null default 10;

do $$
begin
	if not exists (
		select 1 from pg_constraint
		where conname = 'semesters_monday_slots_nonnegative'
			and conrelid = 'public.semesters'::regclass
	) then
		alter table public.semesters
			add constraint semesters_monday_slots_nonnegative check (monday_slots >= 0);
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'semesters_tuesday_slots_nonnegative'
			and conrelid = 'public.semesters'::regclass
	) then
		alter table public.semesters
			add constraint semesters_tuesday_slots_nonnegative check (tuesday_slots >= 0);
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'semesters_wednesday_slots_nonnegative'
			and conrelid = 'public.semesters'::regclass
	) then
		alter table public.semesters
			add constraint semesters_wednesday_slots_nonnegative check (wednesday_slots >= 0);
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'semesters_thursday_slots_nonnegative'
			and conrelid = 'public.semesters'::regclass
	) then
		alter table public.semesters
			add constraint semesters_thursday_slots_nonnegative check (thursday_slots >= 0);
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'semesters_friday_slots_nonnegative'
			and conrelid = 'public.semesters'::regclass
	) then
		alter table public.semesters
			add constraint semesters_friday_slots_nonnegative check (friday_slots >= 0);
	end if;
end $$;