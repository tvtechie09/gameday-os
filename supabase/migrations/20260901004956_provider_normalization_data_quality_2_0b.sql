-- Family 2.0B: canonical provider normalization, lineage, quality, and health.
-- Venue owns the shared integration platform. Team/Family consumes canonical
-- events and schedule-change projections; no second provider platform is added.

alter table public.integration_providers
  add column if not exists integration_mode text not null default 'MANUAL',
  add column if not exists supported_entity_types text[] not null default '{}'::text[],
  add column if not exists capabilities jsonb not null default '{}'::jsonb,
  add column if not exists api_support_state text not null default 'SCAFFOLDED',
  add column if not exists enabled boolean not null default false,
  add column if not exists external_domain_rules text[] not null default '{}'::text[],
  add column if not exists internal_notes text;

alter table public.integration_providers drop constraint if exists integration_providers_integration_mode_check;
alter table public.integration_providers add constraint integration_providers_integration_mode_check
  check (integration_mode in ('API_SYNC', 'WEBHOOK', 'FILE_IMPORT', 'LINK_OUT', 'MANUAL', 'NATIVE'));
alter table public.integration_providers drop constraint if exists integration_providers_api_support_state_check;
alter table public.integration_providers add constraint integration_providers_api_support_state_check
  check (api_support_state in ('LIVE', 'CREDENTIALS_REQUIRED', 'PARTNER_ACCESS_REQUIRED', 'SCAFFOLDED', 'LINK_OUT_ONLY', 'DISABLED'));

alter table public.integration_connections
  add column if not exists last_attempted_sync_at timestamptz,
  add column if not exists last_successful_sync_at timestamptz,
  add column if not exists consecutive_error_count integer not null default 0,
  add column if not exists last_error_at timestamptz,
  add column if not exists expected_cadence_minutes integer not null default 1440,
  add column if not exists sync_cursor text,
  add column if not exists enabled boolean not null default true;

alter table public.integration_sync_runs
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists trigger_type text not null default 'manual',
  add column if not exists entities_received integer not null default 0,
  add column if not exists records_created integer not null default 0,
  add column if not exists records_updated integer not null default 0,
  add column if not exists records_unchanged integer not null default 0,
  add column if not exists conflicts_detected integer not null default 0,
  add column if not exists duplicate_candidates integer not null default 0,
  add column if not exists records_rejected integer not null default 0,
  add column if not exists canonical_changes_emitted integer not null default 0,
  add column if not exists duration_ms integer;

create table if not exists public.integration_external_entity_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  provider_key text not null,
  entity_type text not null check (entity_type in ('organization', 'season', 'team', 'participant', 'event', 'venue', 'playable_space', 'tournament', 'standing', 'live_source')),
  canonical_entity_id text not null,
  external_id text not null,
  external_parent_id text,
  external_url text,
  source_updated_at timestamptz,
  last_synced_at timestamptz not null default now(),
  sync_status text not null default 'SYNCED' check (sync_status in ('SYNCED', 'STALE', 'CONFLICT', 'ERROR', 'DISCONNECTED')),
  source_hash text not null,
  source_version text,
  confidence text not null default 'HIGH' check (confidence in ('HIGH', 'MEDIUM', 'LOW')),
  match_evidence jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, entity_type, external_id)
);

create table if not exists public.integration_provider_conflicts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete cascade,
  canonical_entity_id text not null,
  entity_type text not null,
  field_name text not null,
  provider_a text not null,
  provider_a_value jsonb not null,
  provider_b text not null,
  provider_b_value jsonb not null,
  canonical_value jsonb,
  conflict_key text not null,
  severity text not null check (severity in ('CRITICAL', 'IMPORTANT', 'INFORMATIONAL')),
  resolution_state text not null default 'OPEN' check (resolution_state in ('OPEN', 'AUTO_RESOLVED', 'MANUALLY_RESOLVED', 'IGNORED')),
  resolution_action text,
  resolution_value jsonb,
  detected_at timestamptz not null default now(),
  resolved_by uuid references public.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, conflict_key)
);

create table if not exists public.integration_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  candidate_a_link_id uuid not null references public.integration_external_entity_links(id) on delete cascade,
  candidate_b_link_id uuid not null references public.integration_external_entity_links(id) on delete cascade,
  confidence text not null check (confidence in ('HIGH', 'MEDIUM', 'LOW')),
  match_evidence jsonb not null default '{}'::jsonb,
  review_state text not null default 'OPEN' check (review_state in ('OPEN', 'LINKED', 'SEPARATE', 'IGNORED')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_a_link_id, candidate_b_link_id)
);

create table if not exists public.integration_field_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  canonical_entity_id text not null,
  field_name text not null,
  override_value jsonb not null,
  reason text not null,
  authority text not null,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entity_type, canonical_entity_id, field_name)
);

create table if not exists public.integration_webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  provider_key text not null,
  provider_event_id text not null,
  payload_hash text not null,
  signature_verified boolean not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'RECEIVED' check (processing_status in ('RECEIVED', 'PROCESSED', 'REJECTED', 'FAILED')),
  unique (connection_id, provider_event_id)
);

create index if not exists integration_external_entity_links_canonical_idx
  on public.integration_external_entity_links (organization_id, entity_type, canonical_entity_id);
create index if not exists integration_external_entity_links_freshness_idx
  on public.integration_external_entity_links (connection_id, sync_status, last_synced_at);
create index if not exists integration_provider_conflicts_open_idx
  on public.integration_provider_conflicts (organization_id, severity, detected_at desc)
  where resolution_state = 'OPEN';
create index if not exists integration_duplicate_candidates_open_idx
  on public.integration_duplicate_candidates (organization_id, confidence, created_at desc)
  where review_state = 'OPEN';
create index if not exists integration_field_overrides_active_idx
  on public.integration_field_overrides (organization_id, entity_type, canonical_entity_id, field_name, expires_at);
create index if not exists integration_sync_runs_org_idx
  on public.integration_sync_runs (organization_id, started_at desc);
create unique index if not exists integration_connections_source_identity_idx
  on public.integration_connections (organization_id, provider_key, external_account_id)
  where organization_id is not null and external_account_id is not null;

alter table public.integration_external_entity_links enable row level security;
alter table public.integration_provider_conflicts enable row level security;
alter table public.integration_duplicate_candidates enable row level security;
alter table public.integration_field_overrides enable row level security;
alter table public.integration_webhook_receipts enable row level security;

revoke all on table public.integration_external_entity_links from public, anon, authenticated;
revoke all on table public.integration_provider_conflicts from public, anon, authenticated;
revoke all on table public.integration_duplicate_candidates from public, anon, authenticated;
revoke all on table public.integration_field_overrides from public, anon, authenticated;
revoke all on table public.integration_webhook_receipts from public, anon, authenticated;
grant select, insert, update, delete on table public.integration_external_entity_links to service_role;
grant select, insert, update, delete on table public.integration_provider_conflicts to service_role;
grant select, insert, update, delete on table public.integration_duplicate_candidates to service_role;
grant select, insert, update, delete on table public.integration_field_overrides to service_role;
grant select, insert, update, delete on table public.integration_webhook_receipts to service_role;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'integration_external_entity_links', 'integration_provider_conflicts',
    'integration_duplicate_candidates', 'integration_field_overrides',
    'integration_webhook_receipts'
  ] loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = table_name || '_service_role_all'
    ) then
      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true)',
        table_name || '_service_role_all', table_name
      );
    end if;
  end loop;
end $$;

update public.integration_providers set
  provider_category = 'SCHEDULING', integration_mode = 'API_SYNC',
  supported_entity_types = array['organization','season','team','participant','event','venue','tournament'],
  capabilities = '{"teams":true,"participants":"conditional","schedules":true,"games":true,"practices":true,"tournaments":"conditional","venues":true,"registration_link":true,"payment_account_link":true}'::jsonb,
  api_support_state = 'CREDENTIALS_REQUIRED', enabled = true,
  external_domain_rules = array['sportsengine.com','www.sportsengine.com','user.sportngin.com'],
  internal_notes = 'API sync requires legitimate OAuth credentials. Registration, dues, forms, and account management remain provider link-outs.'
where provider_key = 'sportsengine';

update public.integration_providers set
  provider_category = 'SCOREBOOK', integration_mode = 'LINK_OUT',
  supported_entity_types = array['team','event','live_source'],
  capabilities = '{"scorebook_link":true,"roster_link":true,"live_data":false}'::jsonb,
  api_support_state = 'LINK_OUT_ONLY', enabled = true,
  external_domain_rules = array['gc.com','gamechanger.io','web.gc.com'],
  internal_notes = 'No unsupported score or schedule ingestion is claimed.'
where provider_key = 'gamechanger';

update public.integration_providers set
  provider_category = 'TEAM_MANAGEMENT', integration_mode = 'LINK_OUT',
  supported_entity_types = array['team','participant','event'],
  capabilities = '{"team_link":true,"schedule_link":true,"api_sync":false}'::jsonb,
  api_support_state = 'PARTNER_ACCESS_REQUIRED', enabled = false,
  external_domain_rules = array['teamsnap.com','go.teamsnap.com'],
  internal_notes = 'Scaffolded until legitimate partner access is configured.'
where provider_key = 'teamsnap';

update public.integration_providers set
  provider_category = 'LEAGUE_MANAGEMENT', integration_mode = 'LINK_OUT',
  supported_entity_types = array['organization','season','team','event'],
  capabilities = '{"league_link":true,"schedule_link":true,"registration_link":true,"api_sync":false}'::jsonb,
  api_support_state = 'PARTNER_ACCESS_REQUIRED', enabled = false,
  external_domain_rules = array['leagueapps.com'],
  internal_notes = 'Scaffolded/link-out only until legitimate API access is configured.'
where provider_key = 'leagueapps';

insert into public.integration_providers (
  provider_key, provider_name, provider_category, auth_type,
  credential_requirements, supports_oauth, supports_webhooks, supports_manual_sync,
  provider_status, description, integration_mode, supported_entity_types,
  capabilities, api_support_state, enabled, external_domain_rules, internal_notes
) values
  ('playmetrics', 'PlayMetrics', 'TEAM_MANAGEMENT', 'oauth2', '[]'::jsonb, true, false, false, 'future', 'Partner capability registry entry.', 'LINK_OUT', array['team','participant','event'], '{"team_link":true,"api_sync":false}'::jsonb, 'PARTNER_ACCESS_REQUIRED', false, array['playmetrics.com'], 'No API sync is claimed.'),
  ('sprocketsports', 'Sprocket Sports', 'LEAGUE_MANAGEMENT', 'oauth2', '[]'::jsonb, true, false, false, 'future', 'Partner capability registry entry.', 'LINK_OUT', array['organization','team','event'], '{"league_link":true,"registration_link":true,"api_sync":false}'::jsonb, 'PARTNER_ACCESS_REQUIRED', false, array['sprocketsports.com'], 'Registration remains external.'),
  ('hometeamsonline', 'HomeTeamsOnline', 'LEAGUE_MANAGEMENT', 'manual', '[]'::jsonb, false, false, true, 'available', 'Public-feed and link-out capability.', 'LINK_OUT', array['team','event'], '{"schedule_link":true,"public_feed":"conditional"}'::jsonb, 'LINK_OUT_ONLY', true, array['hometeamsonline.com'], 'Structured imports use the shared file/feed normalization pipeline.'),
  ('csv', 'CSV / Manual Import', 'OTHER', 'manual', '[]'::jsonb, false, false, true, 'available', 'No-credential file import through the canonical pipeline.', 'FILE_IMPORT', array['team','participant','event','venue'], '{"teams":true,"participants":"minimal","schedules":true,"venues":true}'::jsonb, 'LIVE', true, '{}'::text[], 'Uses the same validation, normalization, identity, precedence, and change rules.'),
  ('gameday_native', 'GameDay Native', 'OTHER', 'manual', '[]'::jsonb, false, false, false, 'available', 'Canonical GameDay-owned operations and enrichment.', 'NATIVE', array['organization','season','team','participant','event','venue','playable_space','tournament','live_source'], '{"canonical_operations":true,"venue_enrichment":true,"family_projection":true}'::jsonb, 'LIVE', true, '{}'::text[], 'Native operational state and explicit overrides have highest applicable authority.')
on conflict (provider_key) do update set
  provider_name = excluded.provider_name,
  provider_category = excluded.provider_category,
  integration_mode = excluded.integration_mode,
  supported_entity_types = excluded.supported_entity_types,
  capabilities = excluded.capabilities,
  api_support_state = excluded.api_support_state,
  enabled = excluded.enabled,
  external_domain_rules = excluded.external_domain_rules,
  internal_notes = excluded.internal_notes,
  updated_at = now();

comment on table public.integration_external_entity_links is 'Durable external lineage. Canonical history survives provider disconnect.';
comment on table public.integration_provider_conflicts is 'Provider disagreement visible to integration admins, not Family consumers.';
comment on table public.integration_field_overrides is 'Authorized, auditable GameDay field ownership that survives provider replay until expiry.';
