-- Durable tenant ownership and deny-by-default RLS for the sync engine.
--
-- A sync job can legitimately include multiple venues, so ownership is stored
-- in sync_job_venues rather than a single lossy venue_id on sync_jobs.
-- Ambiguous legacy rows remain nullable/unowned and therefore invisible.

create table if not exists public.sync_job_venues (
  sync_job_id uuid not null references public.sync_jobs(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (sync_job_id, venue_id)
);

alter table public.sync_queue
  add column if not exists venue_id uuid references public.venues(id) on delete restrict;

create index if not exists sync_job_venues_venue_id_idx
  on public.sync_job_venues(venue_id, sync_job_id);
create index if not exists sync_queue_venue_id_idx
  on public.sync_queue(venue_id, created_at desc);

-- Backfill only from canonical relationships. Do not cast untrusted JSON to
-- UUID: invalid, missing, or deleted field ids stay NULL and fail closed.
update public.sync_queue as queue
set venue_id = fields.venue_id
from public.fields as fields
where queue.venue_id is null
  and queue.source_data #>> '{session,field_id}' = fields.id::text;

insert into public.sync_job_venues (sync_job_id, venue_id)
select queue.sync_job_id, queue.venue_id
from public.sync_queue as queue
where queue.venue_id is not null
union
select jobs.id, sources.venue_id
from public.sync_jobs as jobs
join public.external_sources as sources on sources.id = jobs.source_id
on conflict (sync_job_id, venue_id) do nothing;

create or replace function public.sync_queue_set_canonical_venue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  canonical_venue_id uuid;
begin
  if tg_op = 'UPDATE' and (
    new.sync_job_id is distinct from old.sync_job_id
    or new.source_data is distinct from old.source_data
    or new.venue_id is distinct from old.venue_id
  ) then
    raise exception 'Sync queue ownership and source target are immutable.';
  end if;

  select fields.venue_id
  into canonical_venue_id
  from public.fields as fields
  where fields.id::text = new.source_data #>> '{session,field_id}';

  if canonical_venue_id is null then
    raise exception 'Sync queue row requires a canonical field target.';
  end if;
  if new.venue_id is not null and new.venue_id <> canonical_venue_id then
    raise exception 'Sync queue venue does not match its canonical field.';
  end if;

  new.venue_id := canonical_venue_id;
  return new;
end;
$$;

create or replace function public.sync_queue_register_job_venue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.sync_job_venues (sync_job_id, venue_id)
  values (new.sync_job_id, new.venue_id)
  on conflict (sync_job_id, venue_id) do nothing;
  return new;
end;
$$;

create or replace function public.sync_job_register_source_venue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_id is not null then
    insert into public.sync_job_venues (sync_job_id, venue_id)
    select new.id, sources.venue_id
    from public.external_sources as sources
    where sources.id = new.source_id
    on conflict (sync_job_id, venue_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_queue_set_canonical_venue_trigger on public.sync_queue;
create trigger sync_queue_set_canonical_venue_trigger
before insert or update of sync_job_id, source_data, venue_id
on public.sync_queue
for each row execute function public.sync_queue_set_canonical_venue();

drop trigger if exists sync_queue_register_job_venue_trigger on public.sync_queue;
create trigger sync_queue_register_job_venue_trigger
after insert on public.sync_queue
for each row execute function public.sync_queue_register_job_venue();

drop trigger if exists sync_job_register_source_venue_trigger on public.sync_jobs;
create trigger sync_job_register_source_venue_trigger
after insert or update of source_id on public.sync_jobs
for each row execute function public.sync_job_register_source_venue();

revoke all on function public.sync_queue_set_canonical_venue() from public;
revoke all on function public.sync_queue_register_job_venue() from public;
revoke all on function public.sync_job_register_source_venue() from public;

create or replace function public.can_access_sync_venue(
  target_venue_id uuid,
  required_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users as app_users
    join public.user_role_assignments as assignments
      on assignments.user_id = app_users.id
    join public.role_permissions as role_permissions
      on role_permissions.role_id = assignments.role_id
    join public.permissions as permissions
      on permissions.id = role_permissions.permission_id
    left join public.venues as venues
      on venues.id = target_venue_id
    where app_users.auth_user_id = auth.uid()
      and app_users.user_status = 'active'
      and assignments.assignment_status = 'approved'
      and assignments.revoked_at is null
      and (assignments.starts_at is null or assignments.starts_at <= now())
      and (assignments.ends_at is null or assignments.ends_at > now())
      and permissions.key = required_permission_key
      and (
        assignments.scope_type = 'platform'
        or (assignments.scope_type = 'venue' and assignments.scope_id = target_venue_id)
        or (
          assignments.scope_type = 'organization'
          and assignments.scope_id = venues.organization_id
        )
      )
  );
$$;

create or replace function public.can_access_sync_job(
  target_sync_job_id uuid,
  required_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.sync_job_venues as ownership
      where ownership.sync_job_id = target_sync_job_id
    )
    and not exists (
      select 1
      from public.sync_queue as queue
      where queue.sync_job_id = target_sync_job_id
        and queue.venue_id is null
    )
    and not exists (
      select 1
      from public.sync_job_venues as ownership
      where ownership.sync_job_id = target_sync_job_id
        and not public.can_access_sync_venue(ownership.venue_id, required_permission_key)
    );
$$;

revoke all on function public.can_access_sync_venue(uuid, text) from public;
revoke all on function public.can_access_sync_job(uuid, text) from public;
grant execute on function public.can_access_sync_venue(uuid, text) to authenticated, service_role;
grant execute on function public.can_access_sync_job(uuid, text) to authenticated, service_role;

alter table public.sync_jobs enable row level security;
alter table public.sync_queue enable row level security;
alter table public.sync_job_venues enable row level security;

drop policy if exists "Public can read sync jobs" on public.sync_jobs;
drop policy if exists "Public can create sync jobs" on public.sync_jobs;
drop policy if exists "Public can update sync jobs" on public.sync_jobs;
drop policy if exists "Public can read sync queue" on public.sync_queue;
drop policy if exists "Public can create sync queue" on public.sync_queue;
drop policy if exists "Public can update sync queue" on public.sync_queue;

drop policy if exists sync_jobs_authenticated_select on public.sync_jobs;
create policy sync_jobs_authenticated_select
on public.sync_jobs for select to authenticated
using (public.can_access_sync_job(id, 'integrations.view'));

drop policy if exists sync_queue_authenticated_select on public.sync_queue;
create policy sync_queue_authenticated_select
on public.sync_queue for select to authenticated
using (
  venue_id is not null
  and public.can_access_sync_venue(venue_id, 'integrations.view')
  and public.can_access_sync_job(sync_job_id, 'integrations.view')
);

drop policy if exists sync_job_venues_authenticated_select on public.sync_job_venues;
create policy sync_job_venues_authenticated_select
on public.sync_job_venues for select to authenticated
using (public.can_access_sync_job(sync_job_id, 'integrations.view'));

drop policy if exists sync_jobs_service_role_all on public.sync_jobs;
create policy sync_jobs_service_role_all
on public.sync_jobs for all to service_role
using (true) with check (true);

drop policy if exists sync_queue_service_role_all on public.sync_queue;
create policy sync_queue_service_role_all
on public.sync_queue for all to service_role
using (true) with check (true);

drop policy if exists sync_job_venues_service_role_all on public.sync_job_venues;
create policy sync_job_venues_service_role_all
on public.sync_job_venues for all to service_role
using (true) with check (true);

revoke all on public.sync_jobs from public, anon, authenticated;
revoke all on public.sync_queue from public, anon, authenticated;
revoke all on public.sync_job_venues from public, anon, authenticated;
grant select on public.sync_jobs to authenticated;
grant select on public.sync_queue to authenticated;
grant select on public.sync_job_venues to authenticated;
grant all on public.sync_jobs to service_role;
grant all on public.sync_queue to service_role;
grant all on public.sync_job_venues to service_role;

create or replace view public.sync_tenant_backfill_issues
with (security_invoker = true)
as
select
  'queue_missing_canonical_venue'::text as issue_type,
  queue.id as record_id,
  queue.sync_job_id
from public.sync_queue as queue
where queue.venue_id is null
union all
select
  'job_missing_owner'::text,
  jobs.id,
  jobs.id
from public.sync_jobs as jobs
where not exists (
  select 1
  from public.sync_job_venues as ownership
  where ownership.sync_job_id = jobs.id
)
union all
select
  'source_queue_venue_mismatch'::text,
  queue.id,
  queue.sync_job_id
from public.sync_queue as queue
join public.sync_jobs as jobs on jobs.id = queue.sync_job_id
join public.external_sources as sources on sources.id = jobs.source_id
where queue.venue_id is distinct from sources.venue_id;

revoke all on public.sync_tenant_backfill_issues from public, anon, authenticated;
grant select on public.sync_tenant_backfill_issues to service_role;
