-- Run only against a disposable local database after all migrations:
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/sync_tenant_rls_role_tests.sql
-- The transaction rolls back every fixture.

begin;

insert into public.organizations (id, name, slug)
values
  ('71000000-0000-4000-8000-000000000001', 'Sync RLS Org A', 'sync-rls-org-a'),
  ('71000000-0000-4000-8000-000000000002', 'Sync RLS Org B', 'sync-rls-org-b');

insert into public.venues (id, organization_id, name)
values
  ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'Sync RLS Venue A'),
  ('72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000002', 'Sync RLS Venue B');

insert into public.fields (id, organization_id, venue_id, name, sport_type)
values
  ('73000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'Sync RLS Field A', 'baseball'),
  ('73000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002', 'Sync RLS Field B', 'baseball');

insert into public.users (id, auth_user_id, email, display_name)
values
  ('74000000-0000-4000-8000-000000000001', '75000000-0000-4000-8000-000000000001', 'sync-platform@example.invalid', 'Sync Platform'),
  ('74000000-0000-4000-8000-000000000002', '75000000-0000-4000-8000-000000000002', 'sync-org@example.invalid', 'Sync Org A'),
  ('74000000-0000-4000-8000-000000000003', '75000000-0000-4000-8000-000000000003', 'sync-venue-a@example.invalid', 'Sync Venue A'),
  ('74000000-0000-4000-8000-000000000004', '75000000-0000-4000-8000-000000000004', 'sync-venue-b@example.invalid', 'Sync Venue B'),
  ('74000000-0000-4000-8000-000000000005', '75000000-0000-4000-8000-000000000005', 'sync-expired@example.invalid', 'Sync Expired'),
  ('74000000-0000-4000-8000-000000000006', '75000000-0000-4000-8000-000000000006', 'sync-disabled@example.invalid', 'Sync Disabled');

update public.users
set user_status = 'disabled'
where id = '74000000-0000-4000-8000-000000000006';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, assignment_status)
select '74000000-0000-4000-8000-000000000001', id, 'platform', '76000000-0000-4000-8000-000000000001', 'approved'
from public.roles where key = 'platform_admin';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, assignment_status)
select '74000000-0000-4000-8000-000000000002', id, 'organization', '71000000-0000-4000-8000-000000000001', 'approved'
from public.roles where key = 'organization_admin';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, assignment_status)
select fixture.user_id::uuid, roles.id, 'venue', fixture.venue_id::uuid, 'approved'
from (
  values
    ('74000000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000001'),
    ('74000000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000002')
) as fixture(user_id, venue_id)
join public.roles on roles.key = 'venue_director';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, assignment_status, ends_at)
select '74000000-0000-4000-8000-000000000005', id, 'venue', '72000000-0000-4000-8000-000000000001', 'approved', now() - interval '1 minute'
from public.roles where key = 'venue_director';

insert into public.user_role_assignments (user_id, role_id, scope_type, scope_id, assignment_status)
select '74000000-0000-4000-8000-000000000006', id, 'venue', '72000000-0000-4000-8000-000000000001', 'approved'
from public.roles where key = 'venue_director';

insert into public.sync_jobs (id, source_type, status)
values
  ('77000000-0000-4000-8000-000000000001', 'csv', 'completed'),
  ('77000000-0000-4000-8000-000000000002', 'csv', 'completed'),
  ('77000000-0000-4000-8000-000000000003', 'csv', 'completed'),
  ('77000000-0000-4000-8000-000000000004', 'csv', 'completed');

insert into public.sync_queue (id, sync_job_id, source_record_id, source_data)
values
  (
    '78000000-0000-4000-8000-000000000001',
    '77000000-0000-4000-8000-000000000001',
    'venue-a',
    '{"kind":"session","session":{"field_id":"73000000-0000-4000-8000-000000000001"}}'
  ),
  (
    '78000000-0000-4000-8000-000000000002',
    '77000000-0000-4000-8000-000000000002',
    'venue-b',
    '{"kind":"session","session":{"field_id":"73000000-0000-4000-8000-000000000002"}}'
  ),
  (
    '78000000-0000-4000-8000-000000000003',
    '77000000-0000-4000-8000-000000000003',
    'mixed-a',
    '{"kind":"session","session":{"field_id":"73000000-0000-4000-8000-000000000001"}}'
  ),
  (
    '78000000-0000-4000-8000-000000000004',
    '77000000-0000-4000-8000-000000000003',
    'mixed-b',
    '{"kind":"session","session":{"field_id":"73000000-0000-4000-8000-000000000002"}}'
  );

set local role authenticated;

select set_config('request.jwt.claim.sub', '75000000-0000-4000-8000-000000000001', true);
do $$
declare actual integer;
begin
  select count(*) into actual from public.sync_jobs;
  if actual <> 3 then raise exception 'platform role expected 3 owned jobs, got %', actual; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '75000000-0000-4000-8000-000000000002', true);
do $$
declare actual integer;
begin
  select count(*) into actual from public.sync_jobs;
  if actual <> 1 then raise exception 'organization role expected 1 job, got %', actual; end if;
  select count(*) into actual from public.sync_queue;
  if actual <> 1 then raise exception 'organization role expected 1 queue row, got %', actual; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '75000000-0000-4000-8000-000000000003', true);
do $$
declare actual integer;
begin
  select count(*) into actual from public.sync_jobs;
  if actual <> 1 then raise exception 'venue A role expected 1 job, got %', actual; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '75000000-0000-4000-8000-000000000004', true);
do $$
declare actual integer;
begin
  select count(*) into actual from public.sync_jobs;
  if actual <> 1 then raise exception 'venue B role expected 1 job, got %', actual; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '75000000-0000-4000-8000-000000000005', true);
do $$
declare actual integer;
begin
  select count(*) into actual from public.sync_jobs;
  if actual <> 0 then raise exception 'expired role expected 0 jobs, got %', actual; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '75000000-0000-4000-8000-000000000006', true);
do $$
declare actual integer;
begin
  select count(*) into actual from public.sync_jobs;
  if actual <> 0 then raise exception 'disabled role expected 0 jobs, got %', actual; end if;
end;
$$;

do $$
begin
  begin
    insert into public.sync_jobs (source_type) values ('csv');
    raise exception 'authenticated insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.sync_jobs;
    raise exception 'anon select unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role service_role;
do $$
declare actual integer;
begin
  select count(*) into actual from public.sync_jobs;
  if actual <> 4 then raise exception 'service role expected all 4 jobs, got %', actual; end if;
end;
$$;

reset role;
rollback;
