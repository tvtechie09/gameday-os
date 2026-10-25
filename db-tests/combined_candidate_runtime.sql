\set ON_ERROR_STOP on

-- Runs after the complete migration chain on an empty isolated database.
-- All IDs and records are synthetic and remain inside the disposable container.

do $$
begin
  if (select count(*) from public.users where email like 'nlsa.%@gamedayos.test') <> 4 then
    raise exception 'NLSA role shells were not seeded exactly once';
  end if;
  if exists (
    select 1 from public.users
    where email like 'nlsa.%@gamedayos.test'
      and auth_user_id is not null
  ) then
    raise exception 'NLSA seed unexpectedly created a login binding';
  end if;
  if (select count(*) from public.fields where organization_id = '6e1a0000-0000-4000-8000-000000000001') <> 6 then
    raise exception 'NLSA field seed is incomplete';
  end if;
  if (select count(*) from public.user_role_assignments where id::text like '6e1a0000-0000-4000-8000-00000000005_') <> 4 then
    raise exception 'NLSA least-privilege assignments are incomplete';
  end if;
end;
$$;

insert into public.organizations (id, name, slug)
values ('70000000-0000-4000-8000-000000000002', 'Synthetic Boundary Org', 'synthetic-boundary-org');
insert into public.venues (id, organization_id, name)
values ('70000000-0000-4000-8000-000000000012', '70000000-0000-4000-8000-000000000002', 'Synthetic Boundary Venue');
insert into public.fields (id, organization_id, venue_id, name, sport_type)
values ('70000000-0000-4000-8000-000000000022', '70000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000012', 'Synthetic Boundary Field', 'soccer');

insert into public.field_work_orders (id, field_id, title)
values
  ('70000000-0000-4000-8000-000000000041', '6e1a0000-0000-4000-8000-000000000031', 'Synthetic matching work order'),
  ('70000000-0000-4000-8000-000000000042', '70000000-0000-4000-8000-000000000022', 'Synthetic mismatched work order');

insert into public.venue_service_requests (
  id, organization_id, venue_id, field_id, request_type, status,
  severity, field_work_order_id, source
) values (
  '70000000-0000-4000-8000-000000000051',
  '6e1a0000-0000-4000-8000-000000000001',
  '6e1a0000-0000-4000-8000-000000000021',
  '6e1a0000-0000-4000-8000-000000000031',
  'MAINTENANCE_FIELD_ISSUE', 'REQUESTED', 'NEEDS_ATTENTION',
  '70000000-0000-4000-8000-000000000041', 'FIELD_PAGE'
);

update public.venue_service_requests
set status = 'ACKNOWLEDGED', assigned_role = 'grounds',
    assigned_to_user_id = '6e1a0000-0000-4000-8000-000000000012'
where id = '70000000-0000-4000-8000-000000000051';

update public.venue_service_requests
set status = 'RESOLVED', resolution_note = 'Synthetic repair complete'
where id = '70000000-0000-4000-8000-000000000051';

do $$
declare before_count bigint;
begin
  if not exists (
    select 1 from public.field_work_orders
    where id = '70000000-0000-4000-8000-000000000041'
      and status = 'done' and closed_at is not null
      and resolution_notes = 'Synthetic repair complete'
  ) then
    raise exception 'combined maintenance lifecycle projection failed';
  end if;

  select count(*) into before_count from public.venue_service_requests;
  begin
    insert into public.venue_service_requests (
      organization_id, venue_id, field_id, request_type, status,
      severity, field_work_order_id, source
    ) values (
      '6e1a0000-0000-4000-8000-000000000001',
      '6e1a0000-0000-4000-8000-000000000021',
      '6e1a0000-0000-4000-8000-000000000031',
      'MAINTENANCE_FIELD_ISSUE', 'REQUESTED', 'NEEDS_ATTENTION',
      '70000000-0000-4000-8000-000000000042', 'FIELD_PAGE'
    );
    raise exception 'cross-tenant work order unexpectedly accepted';
  exception when others then
    if sqlerrm = 'cross-tenant work order unexpectedly accepted' then raise; end if;
  end;
  if (select count(*) from public.venue_service_requests) <> before_count then
    raise exception 'rejected cross-tenant request left a durable write';
  end if;
end;
$$;

insert into public.weather_safety_incidents (
  id, organization_id, venue_id, incident_type, status, source,
  provider_health, declare_operation_id, declared_by_user_id, prior_field_states
) values (
  '70000000-0000-4000-8000-000000000061',
  '6e1a0000-0000-4000-8000-000000000001',
  '6e1a0000-0000-4000-8000-000000000021',
  'LIGHTNING_HOLD', 'active', 'manual', 'offline', 'combined-declare-op-1',
  '6e1a0000-0000-4000-8000-000000000012',
  '{"6e1a0000-0000-4000-8000-000000000031":"open"}'::jsonb
);

do $$
declare before_count bigint;
begin
  select count(*) into before_count from public.weather_safety_incidents;
  begin
    insert into public.weather_safety_incidents (
      organization_id, venue_id, incident_type, status, source,
      provider_health, declare_operation_id, declared_by_user_id, prior_field_states
    ) values (
      '6e1a0000-0000-4000-8000-000000000001',
      '6e1a0000-0000-4000-8000-000000000021',
      'LIGHTNING_HOLD', 'active', 'automatic', 'online', 'combined-declare-op-2',
      '6e1a0000-0000-4000-8000-000000000012', '{}'::jsonb
    );
    raise exception 'second active combined incident unexpectedly accepted';
  exception when unique_violation then null;
  end;
  if (select count(*) from public.weather_safety_incidents) <> before_count then
    raise exception 'rejected combined weather operation left a durable write';
  end if;

  begin
    update public.weather_safety_incidents
    set status = 'cleared'
    where id = '70000000-0000-4000-8000-000000000061';
    raise exception 'incomplete combined all-clear unexpectedly accepted';
  exception when check_violation then null;
  end;
  if (select status from public.weather_safety_incidents where id = '70000000-0000-4000-8000-000000000061') <> 'active' then
    raise exception 'rejected combined all-clear did not roll back';
  end if;

  if has_table_privilege('anon', 'public.venue_service_requests', 'select')
     or has_table_privilege('authenticated', 'public.venue_service_requests', 'insert') then
    raise exception 'service request privileges widened in combined schema';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'weather_safety_incidents') then
    raise exception 'weather incident table acquired a direct policy in combined schema';
  end if;
end;
$$;

select 'combined_candidate_runtime_ok' as result;
