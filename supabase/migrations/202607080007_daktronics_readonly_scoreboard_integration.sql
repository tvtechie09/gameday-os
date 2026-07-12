-- GameDay OS Daktronics Read-Only Scoreboard Integration
-- Receives local adapter readings and normalizes scoreboard state without any physical control commands.

create extension if not exists pgcrypto;

create table if not exists public.scoreboard_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  manufacturer text not null default 'Daktronics',
  model text not null,
  controller_model text,
  sport text not null default 'baseball',
  connection_type text not null check (connection_type in ('network', 'serial', 'controller_bridge', 'local_adapter', 'unknown')),
  ip_address text,
  serial_port text,
  status text not null default 'configured' check (status in ('configured', 'connected', 'stale', 'offline', 'error', 'disabled')),
  last_seen_at timestamptz,
  adapter_key text unique,
  is_read_only boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scoreboard_connections (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.scoreboard_devices(id) on delete cascade,
  provider_key text not null default 'daktronics',
  connection_status text not null default 'configured' check (connection_status in ('configured', 'connected', 'stale', 'offline', 'error', 'disabled')),
  adapter_version text,
  adapter_host text,
  last_connected_at timestamptz,
  last_read_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scoreboard_readings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.scoreboard_devices(id) on delete cascade,
  connection_id uuid references public.scoreboard_connections(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  source text not null default 'daktronics_readonly',
  home_score integer not null default 0,
  away_score integer not null default 0,
  period_label text,
  inning integer,
  top_bottom text check (top_bottom in ('top', 'bottom') or top_bottom is null),
  balls integer,
  strikes integer,
  outs integer,
  game_clock text,
  shot_clock text,
  possession text,
  status text not null default 'unknown',
  raw_payload jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  is_official boolean not null default false,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.scoreboard_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.scoreboard_devices(id) on delete cascade,
  reading_id uuid references public.scoreboard_readings(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  event_type text not null check (event_type in ('scoreboard.game_started', 'scoreboard.score_changed', 'scoreboard.period_changed', 'scoreboard.game_final_detected', 'scoreboard.connection_lost', 'scoreboard.reading_received')),
  event_message text not null,
  previous_state jsonb,
  current_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.scoreboard_adapter_logs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.scoreboard_devices(id) on delete set null,
  connection_id uuid references public.scoreboard_connections(id) on delete set null,
  log_level text not null default 'info' check (log_level in ('debug', 'info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scoreboard_devices_venue_id_idx on public.scoreboard_devices(venue_id);
create index if not exists scoreboard_devices_field_id_idx on public.scoreboard_devices(field_id);
create index if not exists scoreboard_devices_adapter_key_idx on public.scoreboard_devices(adapter_key);
create index if not exists scoreboard_connections_device_id_idx on public.scoreboard_connections(device_id);
create index if not exists scoreboard_readings_device_created_idx on public.scoreboard_readings(device_id, created_at desc);
create index if not exists scoreboard_readings_field_created_idx on public.scoreboard_readings(field_id, created_at desc);
create index if not exists scoreboard_readings_hash_idx on public.scoreboard_readings(device_id, payload_hash);
create index if not exists scoreboard_events_device_created_idx on public.scoreboard_events(device_id, created_at desc);
create index if not exists scoreboard_adapter_logs_device_created_idx on public.scoreboard_adapter_logs(device_id, created_at desc);

alter table public.scoreboard_devices enable row level security;
alter table public.scoreboard_connections enable row level security;
alter table public.scoreboard_readings enable row level security;
alter table public.scoreboard_events enable row level security;
alter table public.scoreboard_adapter_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scoreboard_devices' and policyname = 'scoreboard_devices_service_role_all') then
    create policy scoreboard_devices_service_role_all on public.scoreboard_devices for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scoreboard_connections' and policyname = 'scoreboard_connections_service_role_all') then
    create policy scoreboard_connections_service_role_all on public.scoreboard_connections for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scoreboard_readings' and policyname = 'scoreboard_readings_service_role_all') then
    create policy scoreboard_readings_service_role_all on public.scoreboard_readings for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scoreboard_events' and policyname = 'scoreboard_events_service_role_all') then
    create policy scoreboard_events_service_role_all on public.scoreboard_events for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scoreboard_adapter_logs' and policyname = 'scoreboard_adapter_logs_service_role_all') then
    create policy scoreboard_adapter_logs_service_role_all on public.scoreboard_adapter_logs for all to service_role using (true) with check (true);
  end if;
end $$;

update public.integration_providers
set
  credential_requirements = '[{"envVar":"DAKTRONICS_ADAPTER_TOKEN","label":"Local adapter token","required":true,"secret":true}]'::jsonb,
  supports_webhooks = true,
  provider_status = 'ready',
  description = 'Read-only Daktronics scoreboard feed receiver for local venue adapters. No physical scoreboard control commands are supported.'
where provider_key = 'daktronics';

insert into public.integration_providers (provider_key, provider_name, provider_category, auth_type, credential_requirements, supports_oauth, supports_webhooks, supports_manual_sync, provider_status, description)
values ('daktronics', 'Daktronics', 'scoreboard', 'server_env', '[{"envVar":"DAKTRONICS_ADAPTER_TOKEN","label":"Local adapter token","required":true,"secret":true}]'::jsonb, false, true, false, 'ready', 'Read-only Daktronics scoreboard feed receiver for local venue adapters. No physical scoreboard control commands are supported.')
on conflict (provider_key) do nothing;
