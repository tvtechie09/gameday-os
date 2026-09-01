-- Family 2.0B: ensure the canonical provider registry is complete even when a
-- shared staging project was provisioned from a consolidated schema snapshot.

set search_path = public, extensions;

begin;

insert into public.integration_providers (
  provider_key, provider_name, provider_category, auth_type,
  credential_requirements, supports_oauth, supports_webhooks, supports_manual_sync,
  provider_status, description, integration_mode, supported_entity_types,
  capabilities, api_support_state, enabled, external_domain_rules, internal_notes
) values
  ('sportsengine', 'SportsEngine', 'SCHEDULING', 'oauth2', '[{"envVar":"SPORTSENGINE_CLIENT_ID","required":true,"secret":false},{"envVar":"SPORTSENGINE_CLIENT_SECRET","required":true,"secret":true},{"envVar":"SPORTSENGINE_REDIRECT_URI","required":true,"secret":false},{"envVar":"SPORTSENGINE_GRAPHQL_URL","required":true,"secret":false}]'::jsonb, true, true, true, 'available', 'Schedule and association provider when legitimate OAuth access is configured.', 'API_SYNC', array['organization','season','team','participant','event','venue','tournament'], '{"teams":true,"participants":"conditional","schedules":true,"games":true,"practices":true,"tournaments":"conditional","venues":true,"registration_link":true,"payment_account_link":true}'::jsonb, 'CREDENTIALS_REQUIRED', true, array['sportsengine.com','www.sportsengine.com','user.sportngin.com'], 'Registration, dues, forms, and account management remain provider link-outs.'),
  ('gamechanger', 'GameChanger', 'SCOREBOOK', 'oauth2', '[]'::jsonb, true, false, false, 'available', 'Scorebook and game deep links; no unsupported live API ingestion is claimed.', 'LINK_OUT', array['team','event','live_source'], '{"scorebook_link":true,"roster_link":true,"live_data":false}'::jsonb, 'LINK_OUT_ONLY', true, array['gc.com','gamechanger.io','web.gc.com'], 'GameChanger remains the scorebook system of record.'),
  ('teamsnap', 'TeamSnap', 'TEAM_MANAGEMENT', 'oauth2', '[]'::jsonb, true, false, false, 'future', 'Partner capability registry entry.', 'LINK_OUT', array['team','participant','event'], '{"team_link":true,"schedule_link":true,"api_sync":false}'::jsonb, 'PARTNER_ACCESS_REQUIRED', false, array['teamsnap.com','go.teamsnap.com'], 'Scaffolded until legitimate partner access is configured.'),
  ('leagueapps', 'LeagueApps', 'LEAGUE_MANAGEMENT', 'api_key', '[]'::jsonb, false, false, false, 'future', 'Partner capability registry entry.', 'LINK_OUT', array['organization','season','team','event'], '{"league_link":true,"schedule_link":true,"registration_link":true,"api_sync":false}'::jsonb, 'PARTNER_ACCESS_REQUIRED', false, array['leagueapps.com'], 'Registration remains external; no API sync is claimed.'),
  ('playmetrics', 'PlayMetrics', 'TEAM_MANAGEMENT', 'oauth2', '[]'::jsonb, true, false, false, 'future', 'Partner capability registry entry.', 'LINK_OUT', array['team','participant','event'], '{"team_link":true,"api_sync":false}'::jsonb, 'PARTNER_ACCESS_REQUIRED', false, array['playmetrics.com'], 'No API sync is claimed.'),
  ('sprocketsports', 'Sprocket Sports', 'LEAGUE_MANAGEMENT', 'oauth2', '[]'::jsonb, true, false, false, 'future', 'Partner capability registry entry.', 'LINK_OUT', array['organization','team','event'], '{"league_link":true,"registration_link":true,"api_sync":false}'::jsonb, 'PARTNER_ACCESS_REQUIRED', false, array['sprocketsports.com'], 'Registration remains external.'),
  ('hometeamsonline', 'HomeTeamsOnline', 'LEAGUE_MANAGEMENT', 'manual', '[]'::jsonb, false, false, true, 'available', 'Public-feed and link-out capability.', 'LINK_OUT', array['team','event'], '{"schedule_link":true,"public_feed":"conditional"}'::jsonb, 'LINK_OUT_ONLY', true, array['hometeamsonline.com'], 'Structured imports use the shared file/feed normalization pipeline.'),
  ('csv', 'CSV / Manual Import', 'OTHER', 'manual', '[]'::jsonb, false, false, true, 'available', 'No-credential file import through the canonical pipeline.', 'FILE_IMPORT', array['team','participant','event','venue'], '{"teams":true,"participants":"minimal","schedules":true,"venues":true}'::jsonb, 'LIVE', true, '{}'::text[], 'Uses shared validation, normalization, identity, precedence, and change rules.'),
  ('gameday_native', 'GameDay Native', 'OTHER', 'manual', '[]'::jsonb, false, false, false, 'available', 'Canonical GameDay-owned operations and enrichment.', 'NATIVE', array['organization','season','team','participant','event','venue','playable_space','tournament','live_source'], '{"canonical_operations":true,"venue_enrichment":true,"family_projection":true}'::jsonb, 'LIVE', true, '{}'::text[], 'Native operational state and explicit overrides have highest applicable authority.')
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
  integration_mode = excluded.integration_mode,
  supported_entity_types = excluded.supported_entity_types,
  capabilities = excluded.capabilities,
  api_support_state = excluded.api_support_state,
  enabled = excluded.enabled,
  external_domain_rules = excluded.external_domain_rules,
  internal_notes = excluded.internal_notes,
  updated_at = now();

commit;
