-- Venue Service Requests 1.0 foundation.
--
-- Canonical request truth lives here. Maintenance execution continues to use
-- field_work_orders; trainer requests remain dispatch-only and deliberately do
-- not collect diagnosis, treatment, or medical narrative fields.

create table public.venue_service_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  request_type text not null check (request_type in (
    'TRAINER_ASSISTANCE',
    'MAINTENANCE_FIELD_ISSUE',
    'SECURITY_ASSISTANCE',
    'TOURNAMENT_VENUE_DIRECTOR_ASSISTANCE',
    'OFFICIALS_ASSISTANCE',
    'TECHNOLOGY_AV_SUPPORT',
    'CUSTODIAL_FACILITY_SERVICE',
    'GAME_OPERATIONS_ASSISTANCE'
  )),
  status text not null default 'REQUESTED' check (status in (
    'REQUESTED',
    'ACKNOWLEDGED',
    'EN_ROUTE',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED'
  )),
  severity text check (severity in ('SAFETY', 'GAME_BLOCKING', 'NEEDS_ATTENTION', 'ROUTINE')),
  priority text not null default 'NORMAL' check (priority in ('URGENT', 'HIGH', 'NORMAL', 'LOW')),
  operational_impact text check (operational_impact is null or operational_impact = 'GAME_CANNOT_START_CONTINUE'),
  requester_user_id uuid references public.users(id) on delete set null,
  requester_name text check (requester_name is null or char_length(requester_name) <= 120),
  note text check (note is null or char_length(note) <= 1000),
  -- Storage object path only. Public URLs and arbitrary remote URLs are not
  -- accepted as evidence of an authorized upload.
  photo_path text check (photo_path is null or (char_length(photo_path) <= 500 and photo_path !~ '^[a-z]+://')),
  source text not null default 'FIELD_PAGE' check (source in ('FIELD_PAGE', 'GAME_PAGE', 'FIELD_QR', 'OPS_DASHBOARD', 'API')),
  field_work_order_id uuid unique references public.field_work_orders(id) on delete set null,
  assigned_role text check (assigned_role is null or char_length(assigned_role) <= 80),
  assigned_to_user_id uuid references public.users(id) on delete set null,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  requested_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  assigned_at timestamptz,
  en_route_at timestamptz,
  in_progress_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (request_type = 'MAINTENANCE_FIELD_ISSUE' and severity is not null)
    or (request_type <> 'MAINTENANCE_FIELD_ISSUE' and severity is null)
  ),
  check (request_type = 'MAINTENANCE_FIELD_ISSUE' or field_work_order_id is null)
);

create table public.venue_service_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.venue_service_requests(id) on delete cascade,
  from_status text check (from_status is null or from_status in (
    'REQUESTED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'
  )),
  to_status text not null check (to_status in (
    'REQUESTED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'
  )),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_label text check (actor_label is null or char_length(actor_label) <= 120),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index venue_service_requests_venue_status_idx
  on public.venue_service_requests (venue_id, status, requested_at desc);
create index venue_service_requests_field_status_idx
  on public.venue_service_requests (field_id, status, requested_at desc)
  where field_id is not null;
create index venue_service_requests_session_idx
  on public.venue_service_requests (session_id)
  where session_id is not null;
create index venue_service_request_events_request_idx
  on public.venue_service_request_events (request_id, created_at asc);

alter table public.venue_service_requests enable row level security;
alter table public.venue_service_request_events enable row level security;

-- All access goes through bounded server-side services in this first slice.
-- Anonymous callers can create via the validated Server Action but cannot use
-- the Data API to enumerate or mutate requests.
revoke all on table public.venue_service_requests from public, anon, authenticated;
revoke all on table public.venue_service_request_events from public, anon, authenticated;
grant select, insert, update, delete on table public.venue_service_requests to service_role;
grant select, insert on table public.venue_service_request_events to service_role;

create or replace function public.validate_venue_service_request_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  venue_org_id uuid;
  field_venue_id uuid;
  field_org_id uuid;
  session_field_id uuid;
  session_org_id uuid;
begin
  select organization_id into venue_org_id
  from public.venues
  where id = new.venue_id;

  if venue_org_id is distinct from new.organization_id then
    raise exception 'Venue service request organization does not match venue';
  end if;

  if new.field_id is not null then
    select venue_id, organization_id into field_venue_id, field_org_id
    from public.fields
    where id = new.field_id;

    if field_venue_id is distinct from new.venue_id
       or field_org_id is distinct from new.organization_id then
      raise exception 'Venue service request field scope does not match venue and organization';
    end if;
  end if;

  if new.session_id is not null then
    select field_id, organization_id into session_field_id, session_org_id
    from public.sessions
    where id = new.session_id;

    if new.field_id is null
       or session_field_id is distinct from new.field_id
       or session_org_id is distinct from new.organization_id then
      raise exception 'Venue service request session scope does not match field and organization';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.validate_venue_service_request_scope() from public, anon, authenticated;

create trigger validate_venue_service_request_scope_trigger
before insert or update on public.venue_service_requests
for each row execute function public.validate_venue_service_request_scope();

create or replace function public.prevent_venue_service_request_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Venue service request events are append-only';
end;
$$;

revoke all on function public.prevent_venue_service_request_event_mutation() from public, anon, authenticated;

create trigger prevent_venue_service_request_event_mutation_trigger
before update or delete on public.venue_service_request_events
for each row execute function public.prevent_venue_service_request_event_mutation();
