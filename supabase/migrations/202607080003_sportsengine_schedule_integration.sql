-- GameDay OS SportsEngine Venue Schedule Integration v1
-- Provider-ready schedule ingestion. SportsEngine is treated as an external
-- source; GameDay OS remains the live venue operations system of record.

create extension if not exists pgcrypto;

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  provider_key text not null,
  provider_name text not null,
  external_org_id text,
  connection_status text not null default 'mock_connected' check (connection_status in ('not_configured', 'mock_connected', 'connected', 'paused', 'error')),
  auth_status text not null default 'mock' check (auth_status in ('mock', 'pending', 'authorized', 'expired', 'error')),
  source_url text,
  last_sync_at timestamptz,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_external_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  provider_key text not null,
  external_account_id text not null,
  external_account_name text not null,
  account_type text not null default 'organization',
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (connection_id, external_account_id)
);

create table if not exists public.integration_field_mappings (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  provider_key text not null,
  external_venue_id text,
  external_field_id text not null,
  external_field_name text not null,
  mapping_status text not null default 'active' check (mapping_status in ('active', 'ignored', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, external_field_id)
);

create table if not exists public.integration_event_mappings (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  provider_key text not null,
  external_event_id text not null,
  external_org_id text,
  external_venue_id text,
  external_field_id text,
  normalized_event jsonb not null default '{}'::jsonb,
  mapping_status text not null default 'pending' check (mapping_status in ('pending', 'mapped', 'missing_field', 'duplicate', 'imported', 'error')),
  admin_override jsonb not null default '{}'::jsonb,
  has_admin_override boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, external_event_id)
);

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  provider_key text not null,
  run_status text not null default 'running' check (run_status in ('pending', 'running', 'completed', 'failed')),
  records_found integer not null default 0,
  records_imported integer not null default 0,
  records_skipped integer not null default 0,
  records_missing_mapping integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  created_by uuid references public.users(id)
);

create table if not exists public.integration_sync_logs (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references public.integration_sync_runs(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  provider_key text not null,
  log_level text not null default 'info' check (log_level in ('debug', 'info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists integration_connections_provider_idx on public.integration_connections(provider_key);
create index if not exists integration_connections_org_idx on public.integration_connections(organization_id);
create index if not exists integration_connections_venue_idx on public.integration_connections(venue_id);
create index if not exists integration_field_mappings_connection_idx on public.integration_field_mappings(connection_id);
create index if not exists integration_field_mappings_external_field_idx on public.integration_field_mappings(provider_key, external_field_id);
create index if not exists integration_event_mappings_connection_idx on public.integration_event_mappings(connection_id);
create index if not exists integration_event_mappings_external_event_idx on public.integration_event_mappings(provider_key, external_event_id);
create index if not exists integration_event_mappings_status_idx on public.integration_event_mappings(mapping_status);
create index if not exists integration_sync_runs_connection_idx on public.integration_sync_runs(connection_id);
create index if not exists integration_sync_logs_run_idx on public.integration_sync_logs(sync_run_id);

alter table public.integration_connections enable row level security;
alter table public.integration_external_accounts enable row level security;
alter table public.integration_event_mappings enable row level security;
alter table public.integration_field_mappings enable row level security;
alter table public.integration_sync_runs enable row level security;
alter table public.integration_sync_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_connections' and policyname = 'integration_connections_service_role_all') then
    create policy integration_connections_service_role_all on public.integration_connections for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_external_accounts' and policyname = 'integration_external_accounts_service_role_all') then
    create policy integration_external_accounts_service_role_all on public.integration_external_accounts for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_event_mappings' and policyname = 'integration_event_mappings_service_role_all') then
    create policy integration_event_mappings_service_role_all on public.integration_event_mappings for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_field_mappings' and policyname = 'integration_field_mappings_service_role_all') then
    create policy integration_field_mappings_service_role_all on public.integration_field_mappings for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_sync_runs' and policyname = 'integration_sync_runs_service_role_all') then
    create policy integration_sync_runs_service_role_all on public.integration_sync_runs for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_sync_logs' and policyname = 'integration_sync_logs_service_role_all') then
    create policy integration_sync_logs_service_role_all on public.integration_sync_logs for all to service_role using (true) with check (true);
  end if;
end $$;

insert into public.permissions (key, name, description)
values
  ('integration.sportsengine.view', 'View SportsEngine Integration', 'View SportsEngine connections, mappings, events, and sync logs.'),
  ('integration.sportsengine.manage', 'Manage SportsEngine Integration', 'Create SportsEngine connections and field mappings.'),
  ('integration.sportsengine.sync', 'Sync SportsEngine Schedule', 'Run SportsEngine schedule syncs into GameDay OS.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

with permission_map(role_key, permission_key) as (
  values
    ('platform_admin', 'integration.sportsengine.view'),
    ('platform_admin', 'integration.sportsengine.manage'),
    ('platform_admin', 'integration.sportsengine.sync'),
    ('organization_admin', 'integration.sportsengine.view'),
    ('organization_admin', 'integration.sportsengine.manage'),
    ('organization_admin', 'integration.sportsengine.sync'),
    ('venue_director', 'integration.sportsengine.view'),
    ('venue_director', 'integration.sportsengine.manage'),
    ('venue_director', 'integration.sportsengine.sync'),
    ('tournament_director', 'integration.sportsengine.view'),
    ('tournament_director', 'integration.sportsengine.sync'),
    ('league_director', 'integration.sportsengine.view'),
    ('league_director', 'integration.sportsengine.sync')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from permission_map
join public.roles on roles.key = permission_map.role_key
join public.permissions on permissions.key = permission_map.permission_key
on conflict do nothing;
