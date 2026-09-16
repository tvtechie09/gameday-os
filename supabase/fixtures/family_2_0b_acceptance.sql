-- Hosted staging acceptance fixtures for Family 2.0B.
-- Fictional data only. Idempotent and scoped to the existing Family Tournament
-- Acceptance organization. Never run against production.

begin;

-- The shared staging project may be provisioned from a consolidated schema
-- without demo identity rows. Seed only the fictional actors and integration
-- permissions required for authenticated acceptance.
insert into public.roles (key, name, description) values
  ('platform_admin', 'Platform Admin', 'Fictional staging platform administrator.'),
  ('venue_director', 'Venue Director', 'Fictional staging venue director.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

insert into public.permissions (key, name, description) values
  ('integrations.view', 'View Integrations', 'View provider health and data quality inside an authorized scope.'),
  ('integrations.edit', 'Edit Integrations', 'Resolve provider conflicts and mappings inside an authorized scope.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

with grants(role_key, permission_key) as (values
  ('platform_admin', 'integrations.view'), ('platform_admin', 'integrations.edit'),
  ('venue_director', 'integrations.view'), ('venue_director', 'integrations.edit')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from grants
join public.roles on roles.key = grants.role_key
join public.permissions on permissions.key = grants.permission_key
on conflict (role_id, permission_id) do nothing;

insert into public.users (id, email, display_name, user_status) values
  ('11111111-1111-4111-8111-111111111111', 'platform.admin@gamedayos.test', 'Platform Admin', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'crossroads.gm@gamedayos.test', 'Crossroads GM', 'active')
on conflict (id) do update set email = excluded.email, display_name = excluded.display_name, user_status = excluded.user_status;

insert into public.user_role_assignments (id, user_id, role_id, scope_type, scope_id, assignment_status)
select '33333333-3333-4333-8333-333333333240', '11111111-1111-4111-8111-111111111111', id, 'platform', '00000000-0000-0000-0000-000000000000', 'approved'
from public.roles where key = 'platform_admin'
on conflict (id) do update set role_id = excluded.role_id, scope_type = excluded.scope_type, scope_id = excluded.scope_id, assignment_status = excluded.assignment_status;

insert into public.user_role_assignments (id, user_id, role_id, scope_type, scope_id, assignment_status)
select '33333333-3333-4333-8333-333333333241', '22222222-2222-4222-8222-222222222222', id, 'venue', '44444444-4444-4444-8444-444444444401', 'approved'
from public.roles where key = 'venue_director'
on conflict (id) do update set role_id = excluded.role_id, scope_type = excluded.scope_type, scope_id = excluded.scope_id, assignment_status = excluded.assignment_status;

insert into public.integration_connections (
  id, organization_id, venue_id, provider_key, provider_name, connection_status,
  auth_type, auth_status, external_account_id, external_account_name, source_url,
  last_attempted_sync_at, last_successful_sync_at, consecutive_error_count,
  expected_cadence_minutes, enabled, created_at, updated_at
) values
  ('33333333-3333-4333-8333-333333333201', '22222222-2222-4222-8222-222222222200', '11111111-1111-4111-8111-111111111101', 'sportsengine', 'SportsEngine', 'connected', 'oauth2', 'authorized', 'fixture-crossroads-se', 'Crossroads Fictional League', 'https://www.sportsengine.com/', now() - interval '3 days', now() - interval '3 days', 1, 60, true, now(), now()),
  ('33333333-3333-4333-8333-333333333202', '22222222-2222-4222-8222-222222222200', '11111111-1111-4111-8111-111111111101', 'gamechanger', 'GameChanger', 'connected', 'oauth2', 'authorized', 'fixture-crossroads-gc', 'Crossroads Fictional Scorebook', 'https://gc.com/', now() - interval '10 minutes', now() - interval '10 minutes', 0, 60, true, now(), now())
on conflict (id) do update set
  connection_status = excluded.connection_status,
  last_attempted_sync_at = excluded.last_attempted_sync_at,
  last_successful_sync_at = excluded.last_successful_sync_at,
  consecutive_error_count = excluded.consecutive_error_count,
  enabled = excluded.enabled,
  updated_at = now();

update public.sessions set
  external_source = 'sportsengine',
  external_source_id = 'se-event-123',
  external_source_url = 'https://www.sportsengine.com/events/se-event-123',
  updated_at = now()
where id = '11111111-1111-4111-8111-111111111130'
  and organization_id = '22222222-2222-4222-8222-222222222200';

insert into public.integration_external_entity_links (
  id, organization_id, connection_id, provider_key, entity_type,
  canonical_entity_id, external_id, external_url, source_updated_at,
  last_synced_at, sync_status, source_hash, confidence, match_evidence, metadata
) values
  ('33333333-3333-4333-8333-333333333211', '22222222-2222-4222-8222-222222222200', '33333333-3333-4333-8333-333333333201', 'sportsengine', 'event', '11111111-1111-4111-8111-111111111130', 'se-event-123', 'https://www.sportsengine.com/events/se-event-123', now() - interval '3 days', now() - interval '3 days', 'STALE', 'fixture-se-hash', 'HIGH', '{"evidence":["provider external ID"]}'::jsonb, '{"fixture":"family-2.0b"}'::jsonb),
  ('33333333-3333-4333-8333-333333333212', '22222222-2222-4222-8222-222222222200', '33333333-3333-4333-8333-333333333202', 'gamechanger', 'event', '11111111-1111-4111-8111-111111111130', 'gc-game-abc', 'https://gc.com/game/gc-game-abc', now() - interval '10 minutes', now() - interval '10 minutes', 'CONFLICT', 'fixture-gc-hash', 'HIGH', '{"evidence":["team, opponent, and venue match"]}'::jsonb, '{"fixture":"family-2.0b"}'::jsonb)
on conflict (connection_id, entity_type, external_id) do update set
  canonical_entity_id = excluded.canonical_entity_id,
  external_url = excluded.external_url,
  source_updated_at = excluded.source_updated_at,
  last_synced_at = excluded.last_synced_at,
  sync_status = excluded.sync_status,
  source_hash = excluded.source_hash,
  confidence = excluded.confidence,
  match_evidence = excluded.match_evidence,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.integration_provider_conflicts (
  id, organization_id, connection_id, canonical_entity_id, entity_type,
  field_name, provider_a, provider_a_value, provider_b, provider_b_value,
  canonical_value, conflict_key, severity, resolution_state, detected_at
) values (
  '33333333-3333-4333-8333-333333333221',
  '22222222-2222-4222-8222-222222222200',
  '33333333-3333-4333-8333-333333333201',
  '11111111-1111-4111-8111-111111111130', 'event', 'start_time',
  'sportsengine', '"2026-09-01T00:10:44.118Z"'::jsonb,
  'gamechanger', '"2026-09-01T00:40:44.118Z"'::jsonb,
  '"2026-09-01T00:10:44.118Z"'::jsonb, 'fixture-family-2.0b-start-time',
  'CRITICAL', 'OPEN', now()
)
on conflict (organization_id, conflict_key) do update set
  resolution_state = 'OPEN', resolution_action = null, resolution_value = null,
  resolved_by = null, resolved_at = null, detected_at = now(), updated_at = now();

insert into public.integration_duplicate_candidates (
  id, organization_id, entity_type, candidate_a_link_id, candidate_b_link_id,
  confidence, match_evidence, review_state
) values (
  '33333333-3333-4333-8333-333333333222',
  '22222222-2222-4222-8222-222222222200', 'event',
  '33333333-3333-4333-8333-333333333211', '33333333-3333-4333-8333-333333333212',
  'MEDIUM', '{"score":75,"evidence":["same team","start times within 30 minutes","same venue"]}'::jsonb, 'OPEN'
)
on conflict (candidate_a_link_id, candidate_b_link_id) do update set
  confidence = excluded.confidence, match_evidence = excluded.match_evidence,
  review_state = 'OPEN', reviewed_by = null, reviewed_at = null, updated_at = now();

insert into public.integration_mappings (
  id, organization_id, venue_id, connection_id, provider_key, mapping_type,
  external_id, external_label, internal_resource_type, internal_resource_id,
  mapping_status, admin_override
) values (
  '33333333-3333-4333-8333-333333333223',
  '22222222-2222-4222-8222-222222222200', '11111111-1111-4111-8111-111111111101',
  '33333333-3333-4333-8333-333333333201', 'sportsengine', 'event',
  'se-event-123', 'Celtics vs Tigers', 'session',
  '11111111-1111-4111-8111-111111111130', 'needs_review',
  '{"fixture":"family-2.0b"}'::jsonb
)
on conflict (connection_id, mapping_type, external_id) do update set
  mapping_status = 'needs_review', internal_resource_id = excluded.internal_resource_id,
  admin_override = excluded.admin_override, updated_at = now();

insert into public.integration_sync_runs (
  id, organization_id, connection_id, provider_key, run_status, sync_type,
  idempotency_key, source, trigger_type, entities_received, records_found,
  records_imported, records_created, records_updated, records_unchanged,
  conflicts_detected, duplicate_candidates, records_rejected,
  canonical_changes_emitted, started_at, completed_at, duration_ms
) values (
  '33333333-3333-4333-8333-333333333224',
  '22222222-2222-4222-8222-222222222200',
  '33333333-3333-4333-8333-333333333201', 'sportsengine', 'completed', 'scheduled',
  'fixture-family-2.0b-sync-1', 'acceptance-fixture', 'scheduled', 3, 3, 3,
  1, 1, 1, 1, 1, 0, 1, now() - interval '2 minutes', now(), 120000
)
on conflict (id) do update set
  run_status = excluded.run_status, entities_received = excluded.entities_received,
  records_updated = excluded.records_updated, conflicts_detected = excluded.conflicts_detected,
  duplicate_candidates = excluded.duplicate_candidates,
  canonical_changes_emitted = excluded.canonical_changes_emitted,
  started_at = excluded.started_at, completed_at = excluded.completed_at,
  duration_ms = excluded.duration_ms;

commit;
