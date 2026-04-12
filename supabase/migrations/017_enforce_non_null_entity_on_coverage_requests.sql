-- Enforce required entity on all coverage requests.
-- Backfill existing null entity_id rows using a fallback client entity so
-- the NOT NULL alteration can succeed in environments with legacy rows.

do $$
declare
  v_null_count bigint;
  v_fallback_entity_id uuid;
begin
  select count(*)
    into v_null_count
  from public.coverage_requests
  where entity_id is null;

  if v_null_count > 0 then
    select id
      into v_fallback_entity_id
    from public.client_entities
    order by id
    limit 1;

    if v_fallback_entity_id is null then
      raise exception 'Cannot backfill coverage_requests.entity_id: no rows exist in public.client_entities.';
    end if;

    update public.coverage_requests
    set entity_id = v_fallback_entity_id
    where entity_id is null;
  end if;
end
$$;

alter table public.coverage_requests
  alter column entity_id set not null;
