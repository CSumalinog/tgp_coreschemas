-- Provision storage for staff time-in selfie proofs.

insert into storage.buckets (id, name, public)
values ('login-proof', 'login-proof', true)
on conflict (id) do nothing;

update storage.buckets
set public = true
where id = 'login-proof';

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload login proof images'
  ) then
    create policy "Authenticated users can upload login proof images"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'login-proof');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can update login proof images'
  ) then
    create policy "Authenticated users can update login proof images"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'login-proof')
      with check (bucket_id = 'login-proof');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can delete login proof images'
  ) then
    create policy "Authenticated users can delete login proof images"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'login-proof');
  end if;
end $$;