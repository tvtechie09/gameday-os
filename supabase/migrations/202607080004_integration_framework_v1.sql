-- GameDay OS Integration Framework v1
-- Production-ready admin-only integration registry, credentials metadata,
-- sync runs/logs, webhooks, and mappings. No mock adapters or fake syncs.

create extension if not exists pgcrypto;

create table if not exists public.integration_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  provider_name text not null,
  provider_category text not null,
  auth_type text not null check (auth_type in ('api_key', 'oauth2', 'webhook', 'server_env', 'manual')),
  credential_requirements jsonb not null default '[]'::jsonb,
  supports_oauth boolean not null default false,
  supports_webhooks boolean not null default false,
  supports_manual_sync boolean not null default false,
  provider_status text not null default 'available' check (provider_status in ('available', 'disabled', 'future')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid()
);

alter table public.integration_connections add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.integration_connections add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.integration_connections add column if not exists tournament_id uuid references public.tournaments(id) on delete cascade;
alter table public.integration_connections add column if not exists provider_key text;
alter table public.integration_connections add column if not exists provider_name text;
alter table public.integration_connections add column if not exists connection_status text not null default 'not_configured';
alter table public.integration_connections add column if not exists auth_type text;
alter table public.integration_connections add column if not exists auth_status text not null default 'not_configured';
alter table public.integration_connections add column if not exists external_account_id text;
alter table public.integration_connections add column if not exists external_account_name text;
alter table public.integration_connections add column if not exists external_org_id text;
alter table public.integration_connections add column if not exists source_url text;
alter table public.integration_connections add column if not exists last_sync_at timestamptz;
alter table public.integration_connections add column if not exists disconnected_at timestamptz;
alter table public.integration_connections add column if not exists error_message text;
alter table public.integration_connections add column if not exists notes text;
alter table public.integration_connections add column if not exists created_by uuid references public.users(id);
alter table public.integration_connections add column if not exists updated_by uuid references public.users(id);
alter table public.integration_connections add column if not exists created_at timestamptz not null default now();
alter table public.integration_connections add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'integration_connections_status_check') then
    alter table public.integration_connections add constraint integration_connections_status_check check (connection_status in ('not_configured', 'credentials_missing', 'ready_to_connect', 'connected', 'sync_error', 'disconnected'));
  end if;
end $$;

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.integration_connections(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  provider_key text not null,
  credential_key text not null,
  credential_label text not null,
  credential_source text not null default 'server_env' check (credential_source in ('server_env', 'encrypted_storage', 'oauth_token', 'manual_reference')),
  env_var_name text,
  masked_value text,
  secret_hint text,
  is_secret boolean not null default true,
  is_configured boolean not null default false,
  expires_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, provider_key, credential_key)
);

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid()
);

alter table public.integration_sync_runs add column if not exists connection_id uuid references public.integration_connections(id) on delete cascade;
alter table public.integration_sync_runs add column if not exists provider_key text;
alter table public.integration_sync_runs add column if not exists run_status text not null default 'pending';
alter table public.integration_sync_runs add column if not exists sync_type text not null default 'manual';
alter table public.integration_sync_runs add column if not exists idempotency_key text;
alter table public.integration_sync_runs add column if not exists source text;
alter table public.integration_sync_runs add column if not exists records_found integer not null default 0;
alter table public.integration_sync_runs add column if not exists records_imported integer not null default 0;
alter table public.integration_sync_runs add column if not exists records_skipped integer not null default 0;
alter table public.integration_sync_runs add column if not exists records_missing_mapping integer not null default 0;
alter table public.integration_sync_runs add column if not exists retry_count integer not null default 0;
alter table public.integration_sync_runs add column if not exists started_at timestamptz not null default now();
alter table public.integration_sync_runs add column if not exists completed_at timestamptz;
alter table public.integration_sync_runs add column if not exists error_message text;
alter table public.integration_sync_runs add column if not exists created_by uuid references public.users(id);

create table if not exists public.integration_sync_logs (
  id uuid primary key default gen_random_uuid()
);

alter table public.integration_sync_logs add column if not exists sync_run_id uuid references public.integration_sync_runs(id) on delete cascade;
alter table public.integration_sync_logs add column if not exists connection_id uuid references public.integration_connections(id) on delete cascade;
alter table public.integration_sync_logs add column if not exists provider_key text;
alter table public.integration_sync_logs add column if not exists log_level text not null default 'info';
alter table public.integration_sync_logs add column if not exists message text not null default '';
alter table public.integration_sync_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.integration_sync_logs add column if not exists created_at timestamptz not null default now();

create table if not exists public.integration_webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete cascade,
  provider_key text not null,
  webhook_url text,
  webhook_status text not null default 'not_configured' check (webhook_status in ('not_configured', 'registered', 'paused', 'error')),
  validation_status text not null default 'placeholder' check (validation_status in ('placeholder', 'validated', 'failed')),
  last_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete cascade,
  provider_key text not null,
  mapping_type text not null,
  external_id text not null,
  external_label text,
  internal_resource_type text not null,
  internal_resource_id uuid,
  mapping_status text not null default 'active' check (mapping_status in ('active', 'ignored', 'needs_review', 'disabled')),
  admin_override jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, mapping_type, external_id)
);

create index if not exists integration_providers_key_idx on public.integration_providers(provider_key);
create index if not exists integration_connections_provider_idx on public.integration_connections(provider_key);
create index if not exists integration_connections_org_idx on public.integration_connections(organization_id);
create index if not exists integration_connections_venue_idx on public.integration_connections(venue_id);
create unique index if not exists integration_sync_runs_idempotency_idx on public.integration_sync_runs(connection_id, idempotency_key) where idempotency_key is not null;
create index if not exists integration_sync_runs_provider_idx on public.integration_sync_runs(provider_key);
create index if not exists integration_sync_logs_connection_idx on public.integration_sync_logs(connection_id);
create index if not exists integration_webhooks_provider_idx on public.integration_webhooks(provider_key);
create index if not exists integration_mappings_provider_idx on public.integration_mappings(provider_key, mapping_type);

alter table public.integration_providers enable row level security;
alter table public.integration_connections enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.integration_sync_runs enable row level security;
alter table public.integration_sync_logs enable row level security;
alter table public.integration_webhooks enable row level security;
alter table public.integration_mappings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_providers' and policyname = 'integration_providers_service_role_all') then
    create policy integration_providers_service_role_all on public.integration_providers for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_connections' and policyname = 'integration_connections_service_role_all') then
    create policy integration_connections_service_role_all on public.integration_connections for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_credentials' and policyname = 'integration_credentials_service_role_all') then
    create policy integration_credentials_service_role_all on public.integration_credentials for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_sync_runs' and policyname = 'integration_sync_runs_service_role_all') then
    create policy integration_sync_runs_service_role_all on public.integration_sync_runs for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_sync_logs' and policyname = 'integration_sync_logs_service_role_all') then
    create policy integration_sync_logs_service_role_all on public.integration_sync_logs for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_webhooks' and policyname = 'integration_webhooks_service_role_all') then
    create policy integration_webhooks_service_role_all on public.integration_webhooks for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'integration_mappings' and policyname = 'integration_mappings_service_role_all') then
    create policy integration_mappings_service_role_all on public.integration_mappings for all to service_role using (true) with check (true);
  end if;
end $$;

insert into public.integration_providers (provider_key, provider_name, provider_category, auth_type, credential_requirements, supports_oauth, supports_webhooks, supports_manual_sync, provider_status, description)
values
  ('weather', 'Weather', 'weather', 'server_env', '[{"envVar":"WEATHER_PROVIDER","required":false,"secret":false},{"envVar":"OPENWEATHER_API_KEY","required":false,"secret":true},{"envVar":"WEATHER_API_KEY","required":false,"secret":true}]', false, false, false, 'available', 'Existing venue weather profile integration.'),
  ('sportsengine', 'SportsEngine', 'schedule', 'oauth2', '[{"envVar":"SPORTSENGINE_CLIENT_ID","required":true,"secret":false},{"envVar":"SPORTSENGINE_CLIENT_SECRET","required":true,"secret":true},{"envVar":"SPORTSENGINE_REDIRECT_URI","required":true,"secret":false},{"envVar":"SPORTSENGINE_GRAPHQL_URL","required":true,"secret":false}]', true, true, true, 'available', 'SportsEngine schedule/events provider ready for OAuth credentials.'),
  ('gamechanger', 'GameChanger', 'schedule', 'oauth2', '[]', true, true, true, 'future', 'Future schedule and scoring connector.'),
  ('teamsnap', 'TeamSnap', 'schedule', 'oauth2', '[]', true, true, true, 'future', 'Future team and schedule connector.'),
  ('leagueapps', 'LeagueApps', 'schedule', 'api_key', '[]', false, true, true, 'future', 'Future league and registration connector.'),
  ('daktronics', 'Daktronics', 'scoreboard', 'server_env', '[]', false, false, false, 'future', 'Future scoreboard integration requiring venue/vendor approval.'),
  ('stripe', 'Stripe', 'payments', 'api_key', '[{"envVar":"STRIPE_SECRET_KEY","required":true,"secret":true}]', false, true, false, 'future', 'Future payments and sponsorship billing provider.'),
  ('notifications', 'Notifications', 'communications', 'manual', '[]', false, true, false, 'available', 'Notification delivery framework.'),
  ('streaming', 'Streaming', 'streaming', 'manual', '[]', false, true, true, 'available', 'Streaming provider framework.')
on conflict (provider_key) do update set
  provider_name = excluded.provider_name,
  provider_category = excluded.provider_category,
  auth_type = excluded.auth_type,
  credential_requirements = excluded.credential_requirements,
  supports_oauth = excluded.supports_oauth,
  supports_webhooks = excluded.supports_webhooks,
  supports_manual_sync = excluded.supports_manual_sync,
  provider_status = excluded.provider_status,
  description = excluded.description,
  updated_at = now();

insert into public.permissions (key, name, description)
values
  ('integrations.view', 'View Integrations', 'View provider definitions, connections, status, and logs.'),
  ('integrations.create', 'Create Integrations', 'Create integration connection records.'),
  ('integrations.edit', 'Edit Integrations', 'Edit integration connection records.'),
  ('integrations.delete', 'Delete Integrations', 'Delete integration connection records.'),
  ('integrations.connect', 'Connect Integrations', 'Start provider OAuth/API connection flows.'),
  ('integrations.disconnect', 'Disconnect Integrations', 'Disconnect provider connections.'),
  ('integrations.sync', 'Sync Integrations', 'Run manual integration syncs.'),
  ('integrations.view_logs', 'View Integration Logs', 'View integration sync and webhook logs.'),
  ('integrations.manage_credentials', 'Manage Integration Credentials', 'Manage credential references and provider secrets.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

with permission_map(role_key, permission_key) as (
  values
    ('platform_admin', 'integrations.view'), ('platform_admin', 'integrations.create'), ('platform_admin', 'integrations.edit'), ('platform_admin', 'integrations.delete'), ('platform_admin', 'integrations.connect'), ('platform_admin', 'integrations.disconnect'), ('platform_admin', 'integrations.sync'), ('platform_admin', 'integrations.view_logs'), ('platform_admin', 'integrations.manage_credentials'),
    ('organization_admin', 'integrations.view'), ('organization_admin', 'integrations.create'), ('organization_admin', 'integrations.edit'), ('organization_admin', 'integrations.delete'), ('organization_admin', 'integrations.connect'), ('organization_admin', 'integrations.disconnect'), ('organization_admin', 'integrations.sync'), ('organization_admin', 'integrations.view_logs'), ('organization_admin', 'integrations.manage_credentials'),
    ('venue_director', 'integrations.view'), ('venue_director', 'integrations.create'), ('venue_director', 'integrations.edit'), ('venue_director', 'integrations.connect'), ('venue_director', 'integrations.disconnect'), ('venue_director', 'integrations.sync'), ('venue_director', 'integrations.view_logs'), ('venue_director', 'integrations.manage_credentials'),
    ('tournament_director', 'integrations.view'), ('tournament_director', 'integrations.connect'), ('tournament_director', 'integrations.disconnect'), ('tournament_director', 'integrations.sync'), ('tournament_director', 'integrations.view_logs'),
    ('league_director', 'integrations.view'), ('league_director', 'integrations.connect'), ('league_director', 'integrations.disconnect'), ('league_director', 'integrations.sync'), ('league_director', 'integrations.view_logs')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from permission_map
join public.roles on roles.key = permission_map.role_key
join public.permissions on permissions.key = permission_map.permission_key
on conflict do nothing;
