# GameDay Venue staging migration drift manifest

Audit date: 2026-09-02
Repository: `/Users/kmcgraw/Documents/gameday-venue-os`
Repository commit: `f1fcd6d80d38c003728178c30b93f5021d778ed2`
Authorized staging Supabase project: `oiyitfatarrhnussyxfu`

## Executive conclusion

Staging is not a database produced by replaying this repository's migration directory. It records 26 hosted migrations, only 10 of which match repository migration names, while the repository contains 101 migrations. Therefore 91 repository migrations are not recorded, but catalog inspection shows that many of their effects already exist.

"Migration not recorded" does not mean "schema change absent." Conversely, an existing table does not prove that all of a migration's constraints, indexes, policies, grants, data transformations, or function definitions are present.

The repository history must not be pushed wholesale. Later staging migrations—including `harden_pilot_public_base_tables`—were applied while earlier repository migrations were unrecorded. Replaying the historical chain risks duplicate data work, constraint regression, reintroducing public grants, or failure against objects that were superseded.

Classification summary:

- ALREADY PRESENT BUT HISTORY MISSING: 58
- PARTIALLY PRESENT — requires custom reconciliation: 13
- SAFE CANDIDATE — effects absent: 16
- SUPERSEDED: 3
- CONFLICTING: 1
- UNKNOWN — requires further inspection: 0

These classifications use SQL inspection plus table/column/index/view/function catalog signatures. "Already present" still requires constraint and privilege verification before any history repair.

## A. Environment identifiers

- Git HEAD matched the required commit.
- Only Supabase staging project `oiyitfatarrhnussyxfu` was queried.
- No credentials were printed or stored.
- Production was not queried or changed.

## B. Counts and ordering

- Repository migrations: **101**
- Staging-recorded migrations: **26**
- Repository migration names recorded in staging: **10**
- Repository migrations not recorded in staging: **91**
- Staging migrations without a matching repository migration name: **16**

Ordering is anomalous: staging records August and September migrations while the June-through-August repository chain is largely absent from migration history. `schedule_operations_outbox` is recorded under hosted version `20260902024555`, not repository version `20260831022455`. `harden_pilot_public_base_tables` is recorded after the unrecorded Work Order and asset-health migrations.

## C. Staging migration history

| Version | Name | Repository relationship |
|---|---|---|
| `20260827012334` | `connected_game_engine_foundation` | No repository name match |
| `20260831142141` | `gameday_coach_1_0` | No repository name match |
| `20260831142153` | `gameday_family_consumer_experience` | No repository name match |
| `20260831142210` | `family_schedule_change_engine_1_0b` | No repository name match |
| `20260831142226` | `gameday_coach_1_1_game_day` | No repository name match |
| `20260831165528` | `family_notification_priority_1_0c` | No repository name match |
| `20260831165708` | `family_notification_family_index_1_0c` | No repository name match |
| `20260831180533` | `family_places_public_projection_1_5a` | Repository name match |
| `20260831182222` | `protect_field_internal_columns_1_5a` | Repository name match |
| `20260831212728` | `family_venue_context_1_5b` | Repository name match |
| `20260831231635` | `family_live_game_hub_1_5c` | No repository name match |
| `20260831232739` | `family_live_game_hub_snapshot_scope_fix_1_5c` | No repository name match |
| `20260901001754` | `tournament_family_projection_2_0a` | Repository name match |
| `20260901004956` | `provider_normalization_data_quality_2_0b` | Repository name match |
| `20260901010500` | `seed_canonical_provider_registry_2_0b` | Repository name match |
| `20260901021909` | `harden_tournament_write_grants` | Repository name match |
| `20260901022041` | `harden_boundary_functions_and_view` | Repository name match |
| `20260901030153` | `family_followers_household_sharing_2_0c` | No repository name match |
| `20260901030720` | `family_sharing_audit_fk_indexes_2_0c` | No repository name match |
| `20260901110848` | `family_event_logistics_2_1a` | No repository name match |
| `20260901110928` | `family_event_logistics_integrity_2_1a` | No repository name match |
| `20260901111119` | `family_event_logistics_fk_indexes_2_1a` | No repository name match |
| `20260901132035` | `family_personalization_daily_brief_2_1b` | No repository name match |
| `20260902014954` | `provision_ui_ux_1_1b_staging_venue_gm` | No repository name match |
| `20260902024555` | `schedule_operations_outbox` | Repository name match |
| `20260902200525` | `harden_pilot_public_base_tables` | Repository name match |

## D. Exact missing repository migrations

| Migration | Purpose | Current staging state | Data impact | Security impact | Dependency | Recommendation |
|---|---|---|---|---|---|---|
| `202606110001_fix_sessions_schema.sql` | Fix existing sessions tables to match the GameDay OS app. Safe to run on an existing Supabase project. It does not drop existing data. | ALREADY PRESENT BUT HISTORY MISSING (2/2 sampled objects present) | Yes | Yes | Existing sessions table | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606110002_add_live_session_state.sql` | add live session state | ALREADY PRESENT BUT HISTORY MISSING (8/8 sampled objects present) | Yes | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606110003_add_session_links.sql` | add session links | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | Yes | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120001_sponsor_engine_v1.sql` | sponsor engine v1 | ALREADY PRESENT BUT HISTORY MISSING (7/7 sampled objects present) | Yes | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120002_add_session_end_time.sql` | add session end time | ALREADY PRESENT BUT HISTORY MISSING (1/1 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120003_add_venue_branding.sql` | add venue branding | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | Yes | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120004_sponsor_analytics_v1.sql` | sponsor analytics v1 | ALREADY PRESENT BUT HISTORY MISSING (6/6 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120005_add_session_sport_type.sql` | add session sport type | ALREADY PRESENT BUT HISTORY MISSING (1/1 sampled objects present) | Yes | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120006_tournament_management_v1.sql` | tournament management v1 | ALREADY PRESENT BUT HISTORY MISSING (3/3 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120007_venue_maps_v1.sql` | venue maps v1 | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120008_alerts_communications_v1.sql` | alerts communications v1 | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120009_resource_inventory_v1.sql` | resource inventory v1 | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120010_resource_activation_v1.sql` | resource activation v1 | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120011_field_status_engine_v1.sql` | field status engine v1 | ALREADY PRESENT BUT HISTORY MISSING (1/1 sampled objects present) | Yes | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120012_volunteer_roles_v1.sql` | volunteer roles v1 | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120013_field_page_views_v1.sql` | field page views v1 | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120014_parent_resource_attachment_v2.sql` | parent resource attachment v2 | ALREADY PRESENT BUT HISTORY MISSING (3/3 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120015_external_schedule_import_v1.sql` | external schedule import v1 | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606120016_external_data_sources_v1.sql` | external data sources v1 | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606130001_parent_follow_mode_v1.sql` | parent follow mode v1 | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606130002_session_timeline_v1.sql` | session timeline v1 | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606130003_integration_health_dashboard_v1.sql` | integration health dashboard v1 | ALREADY PRESENT BUT HISTORY MISSING | Yes | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606130004_venue_alerts_v2.sql` | venue alerts v2 | ALREADY PRESENT BUT HISTORY MISSING (6/6 sampled objects present) | Yes | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606130005_notification_framework_v1.sql` | notification framework v1 | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606130006_sync_engine_v1.sql` | sync engine v1 | ALREADY PRESENT BUT HISTORY MISSING (8/8 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606130007_multi_tenant_organizations_v1.sql` | multi tenant organizations v1 | PARTIALLY PRESENT — requires custom reconciliation (10/17 sampled objects present) | Yes | Yes | Organizations plus existing Venue tables | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202606130008_organization_branding_v1.sql` | organization branding v1 | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606130009_role_framework_v1.sql` | role framework v1 | SAFE CANDIDATE — effects absent (0/4 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `202606130010_scoreboard_integration_framework_v1.sql` | scoreboard integration framework v1 | PARTIALLY PRESENT — requires custom reconciliation (3/6 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202606140001_walk_up_music_audio_framework_v1.sql` | walk up music audio framework v1 | PARTIALLY PRESENT — requires custom reconciliation (1/6 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202606140002_scoreboard_demo_mode_v1.sql` | scoreboard demo mode v1 | PARTIALLY PRESENT — requires custom reconciliation (1/2 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202606140003_scoreboard_adapter_framework_v1.sql` | scoreboard adapter framework v1 | PARTIALLY PRESENT — requires custom reconciliation (1/4 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202606210001_weather_module_v1.sql` | weather module v1 | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606220001_fix_sponsor_assignment_target_check.sql` | fix sponsor assignment target check | CONFLICTING | No | No | Ordered predecessors; inspect SQL references | Do not replay; create a forward-only reconciliation preserving current semantics. |
| `202606220002_schema_audit_catch_up.sql` | GameDay OS schema audit catch-up migration. Purpose: safely create missing tables and add missing columns reported by Schema Audit. | PARTIALLY PRESENT — requires custom reconciliation (349/378 sampled objects present) | No | Yes | All earlier June foundations | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202606230001_gameday_identity_v1.sql` | GameDay Identity v1 Long-term role-based and scope-based access control foundation. | PARTIALLY PRESENT — requires custom reconciliation (35/39 sampled objects present) | Yes | Yes | Organizations and tenant schema | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202606240001_identity_phase2_access_workflows.sql` | GameDay Identity Phase 2: Access Workflows Safe catch-up migration for invites, access requests, approvals, and temporary access lifecycle. | PARTIALLY PRESENT — requires custom reconciliation (48/49 sampled objects present) | Yes | Yes | GameDay Identity v1 | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202606250001_venue_complex_foundation_v1.sql` | GameDay Venue complex venue foundation v1 Adds zones, play surfaces, field layouts, and provider-ready Venue Mode endpoints. | ALREADY PRESENT BUT HISTORY MISSING (23/23 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202606250002_identity_play_surface_scope.sql` | GameDay Identity: allow permissions to be scoped to a configured play surface. This keeps venue, parent field, and play-surface permissions exact instead of implied globally. | SUPERSEDED | No | No | Identity workflow tables | Do not replay; later schema has replaced or removed its target. |
| `202606300001_ai_recommendations_v1.sql` | ai recommendations v1 | SAFE CANDIDATE — effects absent (0/6 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `202606300002_identity_platform_foundation.sql` | GameDay Identity Platform Foundation Shared identity graph for organizations, venues, tournaments/leagues, teams, families, and people. | PARTIALLY PRESENT — requires custom reconciliation (4/75 sampled objects present) | Yes | Yes | GameDay Identity v1 | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202606300003_connected_game_platform_v1.sql` | Connected Game Platform v1 Session becomes the architecture hub connecting teams, venue operations, | SAFE CANDIDATE — effects absent (0/13 sampled objects present) | No | No | Sessions, organizations, scoreboard/audio profiles | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `202606300004_digital_venue_platform_v1.sql` | Digital Venue Platform v1 Durable venue asset registry. No hardware control and no external APIs. | ALREADY PRESENT BUT HISTORY MISSING (34/34 sampled objects present) | No | Yes | Organizations, venues, fields | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202607080001_venue_ops_media_and_field_qr_v1.sql` | Venue Operations: field QR routing + media/amenity/maintenance tables v1 Additive migration. Extends the existing parent-field / play-surface hierarchy | ALREADY PRESENT BUT HISTORY MISSING (21/21 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202607080001_weather_api_location_columns.sql` | Weather API support: preserve existing data and add optional venue location fields. Weather profiles already store latitude/longitude and remain the primary source for weather provider lookups. | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202607080002_automation_engine.sql` | GameDay OS Automation Engine v1 Admin-only, scoped, event-driven automation foundation. | SAFE CANDIDATE — effects absent (0/17 sampled objects present) | Yes | Yes | Ordered predecessors; inspect SQL references | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `202607080003_sportsengine_schedule_integration.sql` | GameDay OS SportsEngine Venue Schedule Integration v1 Provider-ready schedule ingestion. SportsEngine is treated as an external | PARTIALLY PRESENT — requires custom reconciliation (6/16 sampled objects present) | Yes | Yes | Ordered predecessors; inspect SQL references | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `202607080004_integration_framework_v1.sql` | GameDay OS Integration Framework v1 Production-ready admin-only integration registry, credentials metadata, | ALREADY PRESENT BUT HISTORY MISSING (58/58 sampled objects present) | Yes | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202607080005_automation_workflows_phase1.sql` | GameDay OS Automation Engine Phase 1 Admin-only workflow layer for Weather Delay, Field Closed, Game Final, | SAFE CANDIDATE — effects absent (0/20 sampled objects present) | Yes | Yes | Automation engine | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `202607080006_automation_template_marketplace_phase1.sql` | GameDay OS Automation Template Marketplace Phase 1 Internal, approved one-click templates for creating scoped automation workflows. | SAFE CANDIDATE — effects absent (0/7 sampled objects present) | Yes | Yes | Automation workflows | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `202607080007_daktronics_readonly_scoreboard_integration.sql` | GameDay OS Daktronics Read-Only Scoreboard Integration Receives local adapter readings and normalizes scoreboard state without any physical control commands. | SAFE CANDIDATE — effects absent (0/14 sampled objects present) | Yes | Yes | Integration framework and scoreboard schema | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `202607120001_sessions_gameday_team_link.sql` | Team Season <-> Venue Session link (integration blueprint core mapping). Applied to the shared GameDay OS Supabase project on 2026-07-12. | ALREADY PRESENT BUT HISTORY MISSING (6/6 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202607120002_alert_email_delivery.sql` | Announcement delivery: followers can leave an email; alert creation fans out delivery records (sent via provider when configured). | ALREADY PRESENT BUT HISTORY MISSING (3/3 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202607120003_sessions_is_demo.sql` | Schema drift fix: sessions.is_demo existed in code paths but not live. Applied 2026-07-12. | ALREADY PRESENT BUT HISTORY MISSING (1/1 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `202607120004_scorekeeper_links.sql` | Rung 1: per-session scorekeeper links (token + PIN) with idempotent sync sequence. Applied to the shared GameDay OS Supabase project on 2026-07-12. | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260712120000_field_bookings.sql` | Field allocation & permit bookings (applied live 2026-07-12). Outside groups (travel orgs, rec programs, permits) reserve field time; | ALREADY PRESENT BUT HISTORY MISSING (2/2 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260712121000_field_work_orders.sql` | Field maintenance work orders (applied live 2026-07-12). | ALREADY PRESENT BUT HISTORY MISSING (2/2 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260713010000_session_events_widen_types.sql` | Applied live 2026-07-13: the session_events check constraint lagged the TypeScript SessionEventType union; operations_update/scoreboard_update | ALREADY PRESENT BUT HISTORY MISSING | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260713011000_session_officials.sql` | Umpire/official assignment (applied live 2026-07-13). Officials are assigned per session and confirm via a tokenized public link — the | ALREADY PRESENT BUT HISTORY MISSING (2/2 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260713020000_fix_scoreboards_rls_and_definer_view.sql` | Applied live 2026-07-13 (security review). 1) `scoreboards` is an orphan legacy table (the app reads scoreboard_profiles, | SUPERSEDED | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; later schema has replaced or removed its target. |
| `20260713030000_weather_automation_and_official_phone.sql` | Per-venue weather automation settings on weather_profiles + official phone for umpire SMS. Applied live 2026-07-13; mirrored here. | ALREADY PRESENT BUT HISTORY MISSING (8/8 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260713040000_connected_game_engine.sql` | Connected Game Engine — Sprint 1 foundation (ADR-connected-game-engine). STATUS: GENERATED, NOT APPLIED. Review docs/reports/connected-game-engine-sprint-1.md | PARTIALLY PRESENT — requires custom reconciliation (6/10 sampled objects present) | Yes | Yes | Sessions and organizations | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `20260713050000_rls_orphan_game_states.sql` | Orphan game_states table (0 rows, no code refs, DB drift — a batting-order scoreboard prototype). Discovered during the Connected Game Engine migration | ALREADY PRESENT BUT HISTORY MISSING | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260714010000_realtime_game_live_state.sql` | Connected Game Engine Sprint 2 (#5): publish game_live_state changes over Supabase Realtime so public field/scoreboard pages can subscribe to live | PARTIALLY PRESENT — requires custom reconciliation | No | No | Ordered predecessors; inspect SQL references | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `20260714020000_game_engine_apply_project_scores.sql` | Connected Game Engine — Sprint 2 (#6): keep `sessions` a COMPLETE legacy projection of the live score. | SAFE CANDIDATE — effects absent (0/1 sampled objects present) | Yes | Yes | Connected Game Engine | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `20260714030000_sponsor_campaigns.sql` | Revenue Engine — sponsor wedge: campaign records that turn ad-hoc sponsor placements into sold packages with CONTRACTED inventory, so the platform can | ALREADY PRESENT BUT HISTORY MISSING (4/4 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260714040000_billing.sql` | Billing visibility (NOT payment processing). GameDay staff record what a venue's organization is charged and mark invoices paid; the venue's GM sees | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260717030000_automation_service_account.sql` | Automation service account for unattended storm response. WHY: executeStormResponse holds fields by calling updateFieldStatus, which runs | SAFE CANDIDATE — effects absent | Yes | Yes | Identity roles, permissions, users, assignments | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `20260717040000_demo_tenant_flag.sql` | Disposable demo tenants. WHY: onboarding provisions real organizations. Every demo we spin up for a | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260717050000_league_onboarding_requests.sql` | League onboarding: recorded intent, not a forged identity. WHY THIS TABLE EXISTS: teams live in the team app (gdt_*), and an org there is | ALREADY PRESENT BUT HISTORY MISSING (3/3 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260717060000_audio_profiles.sql` | audio_profiles: the table the app has always expected and never had. WHY THIS IS ODD: src/lib/services/audio-profiles.ts, the /admin/audio CRUD, and | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260717070000_backfill_scoreboards_to_venue_assets.sql` | Backfill the orphaned scoreboards into venue_assets. WHY: nine Daktronics boards have sat in `scoreboards` since the demo seed, and | SUPERSEDED | Yes | No | Legacy scoreboards plus venue_assets | Do not replay; later schema has replaced or removed its target. |
| `20260717080000_retire_legacy_scoreboards_table.sql` | Retire the legacy `scoreboards` table. It held 9 rows since the demo seed and NOTHING in the app read it. Those 9 | ALREADY PRESENT BUT HISTORY MISSING (1/1 sampled objects present) | No | No | Backfill scoreboards first | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260717090000_field_reservations.sql` | Coach self-serve field reservations (Phase 1: the engine). Replaces "coaches email the head of the league to reserve the field." Two levels: | ALREADY PRESENT BUT HISTORY MISSING (6/6 sampled objects present) | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260717100000_org_scope_role_assignments.sql` | Allow organization-scoped role assignments. The access layer already speaks scopeType 'organization' -- canViewBilling and | ALREADY PRESENT BUT HISTORY MISSING | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260718000000_harden_venue_assets_read.sql` | Pre-launch hardening (2026-07-18 security audit). venue_assets is read ONLY through the service role (venue-assets.ts + the command-center service); no | ALREADY PRESENT BUT HISTORY MISSING | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260725000000_harden_volunteer_roles_read.sql` | Pre-launch hardening (2026-07-25). volunteer_roles carries contact PII — contact_email, contact_name, contact_phone — from the public "Help Run This | ALREADY PRESENT BUT HISTORY MISSING | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260725010000_harden_resources_read.sql` | Pre-launch hardening (2026-07-25). resources (device inventory) exposed serial_number / manufacturer / model / notes to the anon key via a | ALREADY PRESENT BUT HISTORY MISSING | No | Yes | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260725020000_work_order_issue_lifecycle.sql` | Durable issue lifecycle on field_work_orders (2026-07-25). The Command Center attention queue is COMPUTED from live signals — which means | ALREADY PRESENT BUT HISTORY MISSING (13/13 sampled objects present) | No | Yes | Base field_work_orders | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260727000000_sponsor_category.sql` | Sponsor category (2026-07-27). Phase 1 of BOTH sponsor roadmap features: category exclusivity (docs/sponsor-category-exclusivity.md) and prohibited | ALREADY PRESENT BUT HISTORY MISSING (2/2 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260729000000_org_prohibited_sponsor_categories.sql` | Org-level advertising policy (2026-07-29). Phase 2 of docs/sponsor-prohibited-categories.md. | ALREADY PRESENT BUT HISTORY MISSING (1/1 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260801214707_venue_timezone.sql` | Per-venue timezone. Every venue-local calculation in the app (the "today" date boundary, delay | ALREADY PRESENT BUT HISTORY MISSING (1/1 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260810000000_organization_branding_columns.sql` | Give organizations the branding columns the app has always written. The admin "New organization" form collects a banner, two brand colours, a | ALREADY PRESENT BUT HISTORY MISSING (5/5 sampled objects present) | No | No | Ordered predecessors; inspect SQL references | Do not replay; verify equivalent security/constraints, then consider history repair only after sign-off. |
| `20260829021710_durable_public_rate_limits.sql` | durable public rate limits | SAFE CANDIDATE — effects absent (0/2 sampled objects present) | Yes | Yes | Ordered predecessors; inspect SQL references | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `20260829161427_follower_notification_preferences.sql` | Account-free notification controls for public field and game followers. Existing followers keep receiving all updates by default. Preference changes | SAFE CANDIDATE — effects absent (0/5 sampled objects present) | No | Yes | Base follows; server rate limiting used by route | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `20260829165411_pilot_launch_operations.sql` | One persisted launch gate per venue. These records are operational evidence, not public content, so only trusted server-side clients receive privileges. | SAFE CANDIDATE — effects absent (0/5 sampled objects present) | No | Yes | Organizations, venues, users | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `20260831021258_operational_issue_command_center.sql` | GameDay Venue Operations Sprint 1 Evolve the existing field_work_orders table into the single accountable | SAFE CANDIDATE — effects absent (0/11 sampled objects present) | Yes | Yes | Base Work Orders + lifecycle + venues/fields/assets/sessions/users | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `20260831023105_logical_asset_health.sql` | Human-facing health for canonical logical venue assets. Edge/vendor details remain infrastructure and support diagnostics, not required operator input. | PARTIALLY PRESENT — requires custom reconciliation (3/7 sampled objects present) | Yes | Yes | Digital Venue venue_assets | Do not replay unchanged; use a forward-only delta after dependency and data checks. |
| `20260831023709_venue_weather_operations.sql` | venue weather operations | SAFE CANDIDATE — effects absent (0/1 sampled objects present) | No | Yes | Venues and auth.users | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `20260831024531_venue_asset_health_history.sql` | Measured device reliability for management reporting. This records logical asset health transitions; it does not expose Edge transport details or keys. | SAFE CANDIDATE — effects absent (0/4 sampled objects present) | Yes | Yes | Logical asset health | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |
| `20260831190412_super_admin_permission_superset.sql` | Restore the super_admin ⊇ platform_admin invariant in role_permissions. src/lib/access/catalog.ts documents super_admin as "the HIGHEST authorization: | SAFE CANDIDATE — effects absent | Yes | Yes | Roles, permissions, role_permissions | Evaluate against current pilot scope and dependencies; prefer a new forward migration over historical replay. |

## E. Unexpected staging migrations

| Version | Name | Disposition |
|---|---|---|
| `20260827012334` | `connected_game_engine_foundation` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260831142141` | `gameday_coach_1_0` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260831142153` | `gameday_family_consumer_experience` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260831142210` | `family_schedule_change_engine_1_0b` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260831142226` | `gameday_coach_1_1_game_day` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260831165528` | `family_notification_priority_1_0c` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260831165708` | `family_notification_family_index_1_0c` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260831231635` | `family_live_game_hub_1_5c` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260831232739` | `family_live_game_hub_snapshot_scope_fix_1_5c` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260901030153` | `family_followers_household_sharing_2_0c` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260901030720` | `family_sharing_audit_fk_indexes_2_0c` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260901110848` | `family_event_logistics_2_1a` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260901110928` | `family_event_logistics_integrity_2_1a` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260901111119` | `family_event_logistics_fk_indexes_2_1a` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260901132035` | `family_personalization_daily_brief_2_1b` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |
| `20260902014954` | `provision_ui_ux_1_1b_staging_venue_gm` | Hosted/API-applied or from another product stream; retain and reconcile, do not delete or repair blindly. |

These entries are not necessarily erroneous. They represent hosted/API-applied migrations and Team/Family/Coach work sharing the staging project. They must not be deleted, renamed, or marked reverted without a separate cross-product review.

## F. Known runtime failures mapped to migrations

### `field_work_orders.venue_id`

Runtime failure: `column field_work_orders.venue_id does not exist`.

The missing effect belongs to `20260831021258_operational_issue_command_center.sql`. None of its seven added columns or four indexes exists in staging:

- columns: `venue_id`, `issue_type`, `system_key`, `detected_at`, `assigned_at`, `started_at`, `metadata`
- indexes: `field_work_orders_venue_status_idx`, `field_work_orders_game_idx`, `field_work_orders_asset_idx`, `field_work_orders_open_system_key_unique`

The earlier base and lifecycle effects are present: base Work Orders, assignment fields, acknowledgement fields, due date, resolution, source, game/asset foreign keys, and their lifecycle indexes. RLS is enabled. No anon/authenticated privileges or policies exist after `harden_pilot_public_base_tables`.

### `venue_assets.health_message`

Runtime failure: `column venue_assets.health_message does not exist`.

The source is `20260831023105_logical_asset_health.sql`. Staging already has `connection_health`, `last_seen_at`, and `edge_device_id`, but lacks:

- `health_message`
- `diagnostic_summary`
- `venue_assets_connection_health_idx`
- `venue_assets_edge_device_unique`

The service selects both missing columns in `src/lib/services/venue-assets.ts`, so Resources/device-health reads fail even though part of the schema is present.

## G. Focused risk assessment: operational issue migration

`20260831021258_operational_issue_command_center.sql`:

1. Adds seven Work Order columns.
2. Backfills `venue_id` from `fields`.
3. Makes `venue_id` required and makes `field_id` optional.
4. Normalizes existing status values.
5. Replaces status and issue-type checks.
6. Adds four indexes.
7. Re-enables RLS, revokes anon/authenticated access, and grants service-role CRUD.

The file contains no explicit `BEGIN/COMMIT`; atomicity therefore depends on the migration runner. It is additive in schema intent but data-transforming and constraint-changing. Current staging has **0 Work Orders**, which materially reduces immediate backfill risk, but that count must be rechecked immediately before an approved change.

Applying it unchanged would probably succeed against today's empty table, and its grants are compatible with current hardening. It is still not the preferred repair because staging already has later migration history. Use a new forward-only reconciliation migration containing the verified missing delta, preserve the current deny-by-default grants, and record the new version normally. Do not mark the historical file applied until schema equivalence is proven.

## H. Focused risk assessment: logical asset health

`20260831023105_logical_asset_health.sql` is partially present. It adds five columns, replaces a health check, recalculates `connection_health`, adds two indexes, and repeats service-role-only access.

Staging has **1 Venue asset**. Replaying the file would update that record when its health remains `unknown`, so this is not schema-only. A targeted forward migration should add only the two missing columns and two missing indexes, validate the existing check constraint, and make any health recalculation an explicit reviewed data step.

`20260831024531_venue_asset_health_history.sql` depends on logical asset health. It creates an event table, a SECURITY DEFINER trigger function, a trigger, privileges, and inserts one baseline event per existing asset. It is fully absent and data-changing. Apply only after the logical-asset delta, with function ownership/search-path/EXECUTE verification. The historical function uses `search_path = public, pg_temp`; a new reconciliation should prefer an empty or tightly qualified search path.

## I. Other important drift

- `identity_invites.organization_id` is missing. The application selects and writes it, so the hosted invitation workflow is blocked. Other identity scope constraints are broader than the older historical migration; replaying that history could remove `tenant` or other accepted values.
- `sponsor_assignments_target_check` exists but differs from the repository repair. This is conflicting, not absent.
- `scoreboards` has already been removed while its security migration remains unrecorded; replaying that migration would fail on the removed table. The replacement `venue_technology_profile` is already security-invoker.
- `game_states` already has RLS.
- `game_live_state` already has REPLICA IDENTITY FULL but is not in `supabase_realtime`; that migration is partial.
- Venue assets, volunteer roles, and resources already have no anon/authenticated privileges and no public policies. Do not replay earlier public-read migrations over these protections.
- The super-admin permission superset is absent: staging has 2 platform-admin permission rows, 0 super-admin permission rows, and 2 permissions missing from the superset. This is security data, not schema.
- The automation service identity/role/grant/assignments are absent.
- The legacy scoreboard backfill is superseded because the source `scoreboards` table no longer exists.
- Missing Command Center session columns from `202606300003_connected_game_platform_v1.sql` are referenced by `src/lib/services/session-command-center.ts`; treat this as a separate forward reconciliation, not a historical replay.
- Weather-coordinate absence is data/configuration drift, not migration drift. Public pages fall back safely but log it at error level.

## J. Data-changing missing migrations

`202606110001_fix_sessions_schema.sql`, `202606110002_add_live_session_state.sql`, `202606110003_add_session_links.sql`, `202606120001_sponsor_engine_v1.sql`, `202606120003_add_venue_branding.sql`, `202606120005_add_session_sport_type.sql`, `202606120011_field_status_engine_v1.sql`, `202606130003_integration_health_dashboard_v1.sql`, `202606130004_venue_alerts_v2.sql`, `202606130007_multi_tenant_organizations_v1.sql`, `202606230001_gameday_identity_v1.sql`, `202606240001_identity_phase2_access_workflows.sql`, `202606300002_identity_platform_foundation.sql`, `202607080002_automation_engine.sql`, `202607080003_sportsengine_schedule_integration.sql`, `202607080004_integration_framework_v1.sql`, `202607080005_automation_workflows_phase1.sql`, `202607080006_automation_template_marketplace_phase1.sql`, `202607080007_daktronics_readonly_scoreboard_integration.sql`, `20260713040000_connected_game_engine.sql`, `20260714020000_game_engine_apply_project_scores.sql`, `20260717030000_automation_service_account.sql`, `20260717070000_backfill_scoreboards_to_venue_assets.sql`, `20260829021710_durable_public_rate_limits.sql`, `20260831021258_operational_issue_command_center.sql`, `20260831023105_logical_asset_health.sql`, `20260831024531_venue_asset_health_history.sql`, `20260831190412_super_admin_permission_superset.sql`

The broad historical data migrations must not be replayed automatically. Current useful counts:

| Table | Rows |
|---|---:|
| sessions | 5 |
| field_work_orders | 0 |
| venue_assets | 1 |
| follows | 0 |
| identity_invites | 0 |
| external_sources | 0 |
| sponsor_assignments | 0 |
| game_live_state | 1 |
| user_role_assignments | 3 |
| role_permissions | 5 |
| audit_logs | 14 |

## K. Security-sensitive missing migrations

`202606110001_fix_sessions_schema.sql`, `202606120004_sponsor_analytics_v1.sql`, `202606120006_tournament_management_v1.sql`, `202606120008_alerts_communications_v1.sql`, `202606120009_resource_inventory_v1.sql`, `202606120010_resource_activation_v1.sql`, `202606120012_volunteer_roles_v1.sql`, `202606120013_field_page_views_v1.sql`, `202606120016_external_data_sources_v1.sql`, `202606130001_parent_follow_mode_v1.sql`, `202606130002_session_timeline_v1.sql`, `202606130005_notification_framework_v1.sql`, `202606130006_sync_engine_v1.sql`, `202606130007_multi_tenant_organizations_v1.sql`, `202606130009_role_framework_v1.sql`, `202606130010_scoreboard_integration_framework_v1.sql`, `202606140001_walk_up_music_audio_framework_v1.sql`, `202606140003_scoreboard_adapter_framework_v1.sql`, `202606210001_weather_module_v1.sql`, `202606220002_schema_audit_catch_up.sql`, `202606230001_gameday_identity_v1.sql`, `202606240001_identity_phase2_access_workflows.sql`, `202606250001_venue_complex_foundation_v1.sql`, `202606300001_ai_recommendations_v1.sql`, `202606300002_identity_platform_foundation.sql`, `202606300004_digital_venue_platform_v1.sql`, `202607080001_venue_ops_media_and_field_qr_v1.sql`, `202607080002_automation_engine.sql`, `202607080003_sportsengine_schedule_integration.sql`, `202607080004_integration_framework_v1.sql`, `202607080005_automation_workflows_phase1.sql`, `202607080006_automation_template_marketplace_phase1.sql`, `202607080007_daktronics_readonly_scoreboard_integration.sql`, `202607120002_alert_email_delivery.sql`, `20260712120000_field_bookings.sql`, `20260712121000_field_work_orders.sql`, `20260713011000_session_officials.sql`, `20260713020000_fix_scoreboards_rls_and_definer_view.sql`, `20260713040000_connected_game_engine.sql`, `20260713050000_rls_orphan_game_states.sql`, `20260714020000_game_engine_apply_project_scores.sql`, `20260714030000_sponsor_campaigns.sql`, `20260714040000_billing.sql`, `20260717030000_automation_service_account.sql`, `20260717050000_league_onboarding_requests.sql`, `20260717060000_audio_profiles.sql`, `20260717090000_field_reservations.sql`, `20260718000000_harden_venue_assets_read.sql`, `20260725000000_harden_volunteer_roles_read.sql`, `20260725010000_harden_resources_read.sql`, `20260725020000_work_order_issue_lifecycle.sql`, `20260829021710_durable_public_rate_limits.sql`, `20260829161427_follower_notification_preferences.sql`, `20260829165411_pilot_launch_operations.sql`, `20260831021258_operational_issue_command_center.sql`, `20260831023105_logical_asset_health.sql`, `20260831023709_venue_weather_operations.sql`, `20260831024531_venue_asset_health_history.sql`, `20260831190412_super_admin_permission_superset.sql`

The most important safety invariant is to preserve the already-applied `harden_pilot_public_base_tables` outcome. Any reconciliation must finish by verifying that browser roles still have no base-table privileges on `sessions`, `alerts`, `venues`, and `field_work_orders`, and no write privileges on `fields`.

## L. Dependency chains

### Hosted identity acceptance

Base identity tables
→ forward reconciliation for `identity_invites.organization_id` and any required organization-membership model
→ preserve current broader scope constraints
→ real hosted GM/Staff identities and assignments
→ authenticated route acceptance

### Work Orders

`20260712121000_field_work_orders.sql` effects present
→ `20260725020000_work_order_issue_lifecycle.sql` effects present
→ forward reconciliation of `20260831021258_operational_issue_command_center.sql` delta
→ Work Order list/detail/actions
→ audit/history and field deep-link acceptance

### Asset health

`202606300004_digital_venue_platform_v1.sql` effects present
→ forward reconciliation of the missing `20260831023105_logical_asset_health.sql` delta
→ evaluate/apply `20260831024531_venue_asset_health_history.sql`
→ device reliability reporting

### Public followers

Base `follows` table present
→ `20260829021710_durable_public_rate_limits.sql`
→ `20260829161427_follower_notification_preferences.sql`
→ public manage-token acceptance

### Operational weather and launch

Venues/auth foundations
→ `20260831023709_venue_weather_operations.sql`
→ weather operational acceptance

Organizations/venues/users
→ `20260829165411_pilot_launch_operations.sql`
→ pilot launch evidence acceptance

## M. Proposed exact remediation order

Do not use `db push` against the 91-file delta.

1. Create a new forward-only **identity reconciliation migration** for `identity_invites.organization_id` and any explicitly chosen organization-membership compatibility, preserving current scope values.
2. Create a new forward-only **Command Center session reconciliation migration** for only the still-required missing session columns/indexes after checking current call sites.
3. Create a new forward-only **Work Order operational reconciliation migration** carrying the missing delta from `20260831021258_operational_issue_command_center.sql`.
4. Create a new forward-only **logical asset-health reconciliation migration** for the two missing columns and two missing indexes; separately review the one-row data normalization.
5. Consider `20260831024531_venue_asset_health_history.sql` as a reviewed forward migration after step 4; expect one baseline row.
6. Consider `20260831023709_venue_weather_operations.sql`.
7. Consider `20260829165411_pilot_launch_operations.sql`.
8. Consider `20260829021710_durable_public_rate_limits.sql`, then `20260829161427_follower_notification_preferences.sql`.
9. Consider a reviewed forward data migration equivalent to `20260831190412_super_admin_permission_superset.sql` only after confirming the intended staging role catalog.
10. Re-run privilege/RLS, public projections, Work Order lifecycle, real Auth GM/Staff, mobile, and runtime-log acceptance.
11. Only after schema equivalence is proven, decide whether to repair historical migration records. Never use history repair as a substitute for schema verification.

## N. Migrations not recommended for automatic application

- All 51 sampled migrations whose effects already exist but history is absent.
- All partial migrations, especially broad catch-up/identity/integration migrations.
- `202606220001_fix_sponsor_assignment_target_check.sql` because current semantics conflict.
- `202606250002_identity_play_surface_scope.sql` because current constraints are broader.
- `20260713020000_fix_scoreboards_rls_and_definer_view.sql` because `scoreboards` is gone.
- `20260717070000_backfill_scoreboards_to_venue_assets.sql` because its source table is gone.
- `20260717080000_retire_legacy_scoreboards_table.sql` because its effect is already present.
- AI, automation marketplace, Daktronics, and provider-specific missing migrations until those product surfaces are explicitly included in staging acceptance.
- Any historical migration that grants public/anon/authenticated access without re-evaluating the current server-projection model.

## O. Work Order acceptance dependencies

Hard blockers:

- List and venue-scoped reporting: missing `venue_id`.
- Creation: missing `venue_id`, `issue_type`, `system_key`, `detected_at`, and `metadata`.
- Assignment: missing `assigned_at`.
- Start: missing `started_at`.
- System-key deduplication: missing unique partial index.
- Venue-wide issues: `field_id` is still NOT NULL.
- Field Operations and Work Order pages fail before meaningful lifecycle acceptance.

Not independently blocked:

- Audit storage exists in `audit_logs`, but action paths cannot reach valid lifecycle completion.
- Resolve fields from the earlier lifecycle exist, but the route remains blocked by the missing operational shape.
- Detail-by-id may retrieve a row, but mapping and authorization require the missing venue/operational columns.
- Field-context deep links remain blocked because list/context loading is venue-scoped.

## P. Hosted Auth acceptance

Migration drift does not prevent Supabase Auth itself from creating a user. It does block the application's normal invite/provisioning workflow because `identity_invites.organization_id` is selected and written by the current service. A manually paired `users` plus `user_role_assignments` record might work, but creating it is outside this audit and would bypass the intended workflow.

After schema reconciliation, acceptance must use real hosted GM and Venue Staff identities. The dev-login role checks are useful authorization evidence but are not hosted Auth proof.

## Q. Public projection risk

- Work Order and logical asset reconciliation should remain service-role-only and should not directly expose new public data.
- Asset-health history and weather operations must be deny-by-default.
- Follower preferences and rate limits affect public QR/follow workflows and require dedicated negative tests.
- Identity and super-admin changes have no intended public projection but are authorization-sensitive.
- Historical public-read policies must not be restored.
- Public field, public venue, QR, anon, authenticated, and service-role checks are mandatory after any approved remediation.

## R. Complete repository migration inventory

| Migration | Short purpose | Kind | Relevant dependency | Staging history |
|---|---|---|---|---|
| `202606110001_fix_sessions_schema.sql` | Fix existing sessions tables to match the GameDay OS app. Safe to run on an existing Supabase project. It does not drop existing data. | schema, data/backfill, security | Existing sessions table | Not recorded |
| `202606110002_add_live_session_state.sql` | add live session state | schema, data/backfill | Ordered predecessors where referenced | Not recorded |
| `202606110003_add_session_links.sql` | add session links | schema, data/backfill | Ordered predecessors where referenced | Not recorded |
| `202606120001_sponsor_engine_v1.sql` | sponsor engine v1 | schema, data/backfill | Ordered predecessors where referenced | Not recorded |
| `202606120002_add_session_end_time.sql` | add session end time | schema | Ordered predecessors where referenced | Not recorded |
| `202606120003_add_venue_branding.sql` | add venue branding | schema, data/backfill | Ordered predecessors where referenced | Not recorded |
| `202606120004_sponsor_analytics_v1.sql` | sponsor analytics v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606120005_add_session_sport_type.sql` | add session sport type | schema, data/backfill | Ordered predecessors where referenced | Not recorded |
| `202606120006_tournament_management_v1.sql` | tournament management v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606120007_venue_maps_v1.sql` | venue maps v1 | schema | Ordered predecessors where referenced | Not recorded |
| `202606120008_alerts_communications_v1.sql` | alerts communications v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606120009_resource_inventory_v1.sql` | resource inventory v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606120010_resource_activation_v1.sql` | resource activation v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606120011_field_status_engine_v1.sql` | field status engine v1 | schema, data/backfill | Ordered predecessors where referenced | Not recorded |
| `202606120012_volunteer_roles_v1.sql` | volunteer roles v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606120013_field_page_views_v1.sql` | field page views v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606120014_parent_resource_attachment_v2.sql` | parent resource attachment v2 | schema | Ordered predecessors where referenced | Not recorded |
| `202606120015_external_schedule_import_v1.sql` | external schedule import v1 | schema | Ordered predecessors where referenced | Not recorded |
| `202606120016_external_data_sources_v1.sql` | external data sources v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606130001_parent_follow_mode_v1.sql` | parent follow mode v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606130002_session_timeline_v1.sql` | session timeline v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606130003_integration_health_dashboard_v1.sql` | integration health dashboard v1 | data/backfill | Ordered predecessors where referenced | Not recorded |
| `202606130004_venue_alerts_v2.sql` | venue alerts v2 | schema, data/backfill | Ordered predecessors where referenced | Not recorded |
| `202606130005_notification_framework_v1.sql` | notification framework v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606130006_sync_engine_v1.sql` | sync engine v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606130007_multi_tenant_organizations_v1.sql` | multi tenant organizations v1 | schema, data/backfill, security | Organizations plus existing Venue tables | Not recorded |
| `202606130008_organization_branding_v1.sql` | organization branding v1 | schema | Ordered predecessors where referenced | Not recorded |
| `202606130009_role_framework_v1.sql` | role framework v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606130010_scoreboard_integration_framework_v1.sql` | scoreboard integration framework v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606140001_walk_up_music_audio_framework_v1.sql` | walk up music audio framework v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606140002_scoreboard_demo_mode_v1.sql` | scoreboard demo mode v1 | schema | Ordered predecessors where referenced | Not recorded |
| `202606140003_scoreboard_adapter_framework_v1.sql` | scoreboard adapter framework v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606210001_weather_module_v1.sql` | weather module v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606220001_fix_sponsor_assignment_target_check.sql` | fix sponsor assignment target check | constraint/config | Ordered predecessors where referenced | Not recorded |
| `202606220002_schema_audit_catch_up.sql` | GameDay OS schema audit catch-up migration. Purpose: safely create missing tables and add missing columns reported by Schema Audit. | schema, security | All earlier June foundations | Not recorded |
| `202606230001_gameday_identity_v1.sql` | GameDay Identity v1 Long-term role-based and scope-based access control foundation. | schema, data/backfill, security | Organizations and tenant schema | Not recorded |
| `202606240001_identity_phase2_access_workflows.sql` | GameDay Identity Phase 2: Access Workflows Safe catch-up migration for invites, access requests, approvals, and temporary access lifecycle. | schema, data/backfill, security | GameDay Identity v1 | Not recorded |
| `202606250001_venue_complex_foundation_v1.sql` | GameDay Venue complex venue foundation v1 Adds zones, play surfaces, field layouts, and provider-ready Venue Mode endpoints. | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606250002_identity_play_surface_scope.sql` | GameDay Identity: allow permissions to be scoped to a configured play surface. This keeps venue, parent field, and play-surface permissions exact instead of implied globally. | constraint/config | Identity workflow tables | Not recorded |
| `202606300001_ai_recommendations_v1.sql` | ai recommendations v1 | schema, security | Ordered predecessors where referenced | Not recorded |
| `202606300002_identity_platform_foundation.sql` | GameDay Identity Platform Foundation Shared identity graph for organizations, venues, tournaments/leagues, teams, families, and people. | schema, data/backfill, security | GameDay Identity v1 | Not recorded |
| `202606300003_connected_game_platform_v1.sql` | Connected Game Platform v1 Session becomes the architecture hub connecting teams, venue operations, | schema | Sessions, organizations, scoreboard/audio profiles | Not recorded |
| `202606300004_digital_venue_platform_v1.sql` | Digital Venue Platform v1 Durable venue asset registry. No hardware control and no external APIs. | schema, security | Organizations, venues, fields | Not recorded |
| `202607080001_venue_ops_media_and_field_qr_v1.sql` | Venue Operations: field QR routing + media/amenity/maintenance tables v1 Additive migration. Extends the existing parent-field / play-surface hierarchy | schema, security | Ordered predecessors where referenced | Not recorded |
| `202607080001_weather_api_location_columns.sql` | Weather API support: preserve existing data and add optional venue location fields. Weather profiles already store latitude/longitude and remain the primary source for weather provider lookups. | schema | Ordered predecessors where referenced | Not recorded |
| `202607080002_automation_engine.sql` | GameDay OS Automation Engine v1 Admin-only, scoped, event-driven automation foundation. | schema, data/backfill, security | Ordered predecessors where referenced | Not recorded |
| `202607080003_sportsengine_schedule_integration.sql` | GameDay OS SportsEngine Venue Schedule Integration v1 Provider-ready schedule ingestion. SportsEngine is treated as an external | schema, data/backfill, security | Ordered predecessors where referenced | Not recorded |
| `202607080004_integration_framework_v1.sql` | GameDay OS Integration Framework v1 Production-ready admin-only integration registry, credentials metadata, | schema, data/backfill, security | Ordered predecessors where referenced | Not recorded |
| `202607080005_automation_workflows_phase1.sql` | GameDay OS Automation Engine Phase 1 Admin-only workflow layer for Weather Delay, Field Closed, Game Final, | schema, data/backfill, security | Automation engine | Not recorded |
| `202607080006_automation_template_marketplace_phase1.sql` | GameDay OS Automation Template Marketplace Phase 1 Internal, approved one-click templates for creating scoped automation workflows. | schema, data/backfill, security | Automation workflows | Not recorded |
| `202607080007_daktronics_readonly_scoreboard_integration.sql` | GameDay OS Daktronics Read-Only Scoreboard Integration Receives local adapter readings and normalizes scoreboard state without any physical control commands. | schema, data/backfill, security | Integration framework and scoreboard schema | Not recorded |
| `202607120001_sessions_gameday_team_link.sql` | Team Season <-> Venue Session link (integration blueprint core mapping). Applied to the shared GameDay OS Supabase project on 2026-07-12. | schema | Ordered predecessors where referenced | Not recorded |
| `202607120002_alert_email_delivery.sql` | Announcement delivery: followers can leave an email; alert creation fans out delivery records (sent via provider when configured). | schema, security | Ordered predecessors where referenced | Not recorded |
| `202607120003_sessions_is_demo.sql` | Schema drift fix: sessions.is_demo existed in code paths but not live. Applied 2026-07-12. | schema | Ordered predecessors where referenced | Not recorded |
| `202607120004_scorekeeper_links.sql` | Rung 1: per-session scorekeeper links (token + PIN) with idempotent sync sequence. Applied to the shared GameDay OS Supabase project on 2026-07-12. | schema | Ordered predecessors where referenced | Not recorded |
| `20260712120000_field_bookings.sql` | Field allocation & permit bookings (applied live 2026-07-12). Outside groups (travel orgs, rec programs, permits) reserve field time; | schema, security | Ordered predecessors where referenced | Not recorded |
| `20260712121000_field_work_orders.sql` | Field maintenance work orders (applied live 2026-07-12). | schema, security | Ordered predecessors where referenced | Not recorded |
| `20260713010000_session_events_widen_types.sql` | Applied live 2026-07-13: the session_events check constraint lagged the TypeScript SessionEventType union; operations_update/scoreboard_update | constraint/config | Ordered predecessors where referenced | Not recorded |
| `20260713011000_session_officials.sql` | Umpire/official assignment (applied live 2026-07-13). Officials are assigned per session and confirm via a tokenized public link — the | schema, security | Ordered predecessors where referenced | Not recorded |
| `20260713020000_fix_scoreboards_rls_and_definer_view.sql` | Applied live 2026-07-13 (security review). 1) `scoreboards` is an orphan legacy table (the app reads scoreboard_profiles, | security | Ordered predecessors where referenced | Not recorded |
| `20260713030000_weather_automation_and_official_phone.sql` | Per-venue weather automation settings on weather_profiles + official phone for umpire SMS. Applied live 2026-07-13; mirrored here. | schema | Ordered predecessors where referenced | Not recorded |
| `20260713040000_connected_game_engine.sql` | Connected Game Engine — Sprint 1 foundation (ADR-connected-game-engine). STATUS: GENERATED, NOT APPLIED. Review docs/reports/connected-game-engine-sprint-1.md | schema, data/backfill, security | Sessions and organizations | Not recorded |
| `20260713050000_rls_orphan_game_states.sql` | Orphan game_states table (0 rows, no code refs, DB drift — a batting-order scoreboard prototype). Discovered during the Connected Game Engine migration | security | Ordered predecessors where referenced | Not recorded |
| `20260714010000_realtime_game_live_state.sql` | Connected Game Engine Sprint 2 (#5): publish game_live_state changes over Supabase Realtime so public field/scoreboard pages can subscribe to live | constraint/config | Ordered predecessors where referenced | Not recorded |
| `20260714020000_game_engine_apply_project_scores.sql` | Connected Game Engine — Sprint 2 (#6): keep `sessions` a COMPLETE legacy projection of the live score. | schema, data/backfill, security | Connected Game Engine | Not recorded |
| `20260714030000_sponsor_campaigns.sql` | Revenue Engine — sponsor wedge: campaign records that turn ad-hoc sponsor placements into sold packages with CONTRACTED inventory, so the platform can | schema, security | Ordered predecessors where referenced | Not recorded |
| `20260714040000_billing.sql` | Billing visibility (NOT payment processing). GameDay staff record what a venue's organization is charged and mark invoices paid; the venue's GM sees | schema, security | Ordered predecessors where referenced | Not recorded |
| `20260717030000_automation_service_account.sql` | Automation service account for unattended storm response. WHY: executeStormResponse holds fields by calling updateFieldStatus, which runs | data/backfill, security | Identity roles, permissions, users, assignments | Not recorded |
| `20260717040000_demo_tenant_flag.sql` | Disposable demo tenants. WHY: onboarding provisions real organizations. Every demo we spin up for a | schema | Ordered predecessors where referenced | Not recorded |
| `20260717050000_league_onboarding_requests.sql` | League onboarding: recorded intent, not a forged identity. WHY THIS TABLE EXISTS: teams live in the team app (gdt_*), and an org there is | schema, security | Ordered predecessors where referenced | Not recorded |
| `20260717060000_audio_profiles.sql` | audio_profiles: the table the app has always expected and never had. WHY THIS IS ODD: src/lib/services/audio-profiles.ts, the /admin/audio CRUD, and | schema, security | Ordered predecessors where referenced | Not recorded |
| `20260717070000_backfill_scoreboards_to_venue_assets.sql` | Backfill the orphaned scoreboards into venue_assets. WHY: nine Daktronics boards have sat in `scoreboards` since the demo seed, and | data/backfill | Legacy scoreboards plus venue_assets | Not recorded |
| `20260717080000_retire_legacy_scoreboards_table.sql` | Retire the legacy `scoreboards` table. It held 9 rows since the demo seed and NOTHING in the app read it. Those 9 | schema, destructive | Backfill scoreboards first | Not recorded |
| `20260717090000_field_reservations.sql` | Coach self-serve field reservations (Phase 1: the engine). Replaces "coaches email the head of the league to reserve the field." Two levels: | schema, security | Ordered predecessors where referenced | Not recorded |
| `20260717100000_org_scope_role_assignments.sql` | Allow organization-scoped role assignments. The access layer already speaks scopeType 'organization' -- canViewBilling and | constraint/config | Ordered predecessors where referenced | Not recorded |
| `20260718000000_harden_venue_assets_read.sql` | Pre-launch hardening (2026-07-18 security audit). venue_assets is read ONLY through the service role (venue-assets.ts + the command-center service); no | security | Ordered predecessors where referenced | Not recorded |
| `20260725000000_harden_volunteer_roles_read.sql` | Pre-launch hardening (2026-07-25). volunteer_roles carries contact PII — contact_email, contact_name, contact_phone — from the public "Help Run This | security | Ordered predecessors where referenced | Not recorded |
| `20260725010000_harden_resources_read.sql` | Pre-launch hardening (2026-07-25). resources (device inventory) exposed serial_number / manufacturer / model / notes to the anon key via a | security | Ordered predecessors where referenced | Not recorded |
| `20260725020000_work_order_issue_lifecycle.sql` | Durable issue lifecycle on field_work_orders (2026-07-25). The Command Center attention queue is COMPUTED from live signals — which means | schema, security | Base field_work_orders | Not recorded |
| `20260727000000_sponsor_category.sql` | Sponsor category (2026-07-27). Phase 1 of BOTH sponsor roadmap features: category exclusivity (docs/sponsor-category-exclusivity.md) and prohibited | schema | Ordered predecessors where referenced | Not recorded |
| `20260729000000_org_prohibited_sponsor_categories.sql` | Org-level advertising policy (2026-07-29). Phase 2 of docs/sponsor-prohibited-categories.md. | schema | Ordered predecessors where referenced | Not recorded |
| `20260801214707_venue_timezone.sql` | Per-venue timezone. Every venue-local calculation in the app (the "today" date boundary, delay | schema | Ordered predecessors where referenced | Not recorded |
| `20260810000000_organization_branding_columns.sql` | Give organizations the branding columns the app has always written. The admin "New organization" form collects a banner, two brand colours, a | schema | Ordered predecessors where referenced | Not recorded |
| `20260829021710_durable_public_rate_limits.sql` | durable public rate limits | schema, data/backfill, security | Ordered predecessors where referenced | Not recorded |
| `20260829161427_follower_notification_preferences.sql` | Account-free notification controls for public field and game followers. Existing followers keep receiving all updates by default. Preference changes | schema, security | Base follows; server rate limiting used by route | Not recorded |
| `20260829165411_pilot_launch_operations.sql` | One persisted launch gate per venue. These records are operational evidence, not public content, so only trusted server-side clients receive privileges. | schema, security | Organizations, venues, users | Not recorded |
| `20260831021258_operational_issue_command_center.sql` | GameDay Venue Operations Sprint 1 Evolve the existing field_work_orders table into the single accountable | schema, data/backfill, security | Base Work Orders + lifecycle + venues/fields/assets/sessions/users | Not recorded |
| `20260831022455_schedule_operations_outbox.sql` | Provider-neutral schedule-change outbox and one atomic venue operation RPC. GameDay views continue reading canonical public.sessions; connected providers | schema, data/backfill, security | Ordered predecessors where referenced | Recorded |
| `20260831023105_logical_asset_health.sql` | Human-facing health for canonical logical venue assets. Edge/vendor details remain infrastructure and support diagnostics, not required operator input. | schema, data/backfill, security | Digital Venue venue_assets | Not recorded |
| `20260831023709_venue_weather_operations.sql` | venue weather operations | schema, security | Venues and auth.users | Not recorded |
| `20260831024531_venue_asset_health_history.sql` | Measured device reliability for management reporting. This records logical asset health transitions; it does not expose Edge transport details or keys. | schema, data/backfill, security | Logical asset health | Not recorded |
| `20260831173957_family_places_public_projection_1_5a.sql` | GameDay Family 1.5A: canonical, parent-safe venue place projection. Venue OS owns these columns and views. Family consumes them with the service | schema, security | Ordered predecessors where referenced | Recorded |
| `20260831182046_protect_field_internal_columns_1_5a.sql` | Family 1.5A defense in depth: preserve public field/QR reads without granting browser roles access to internal staff notes, opaque resources, | security | Ordered predecessors where referenced | Recorded |
| `20260831190412_super_admin_permission_superset.sql` | Restore the super_admin ⊇ platform_admin invariant in role_permissions. src/lib/access/catalog.ts documents super_admin as "the HIGHEST authorization: | data/backfill, security | Roles, permissions, role_permissions | Not recorded |
| `20260831212728_family_venue_context_1_5b.sql` | Family 1.5B: parent-safe projection of canonical Venue OS alerts. `alerts` remains the single write model used by Venue staff, storm actions, | schema, security | Ordered predecessors where referenced | Recorded |
| `20260831235931_tournament_family_projection_2_0a.sql` | Family 2.0A: canonical Tournament structure and parent-safe projections. Venue sessions remain canonical games. These tables add the Tournament-owned | schema, security | Ordered predecessors where referenced | Recorded |
| `20260901004956_provider_normalization_data_quality_2_0b.sql` | Family 2.0B: canonical provider normalization, lineage, quality, and health. Venue owns the shared integration platform. Team/Family consumes canonical | schema, data/backfill, security | Ordered predecessors where referenced | Recorded |
| `20260901010500_seed_canonical_provider_registry_2_0b.sql` | Family 2.0B: ensure the canonical provider registry is complete even when a shared staging project was provisioned from a consolidated schema snapshot. | data/backfill | Ordered predecessors where referenced | Recorded |
| `20260901021909_harden_tournament_write_grants.sql` | Tournament OS remains the canonical server-managed source. Family consumes its published projections and never mutates official tournament state. | security, destructive | Ordered predecessors where referenced | Recorded |
| `20260901022041_harden_boundary_functions_and_view.sql` | Browser users must reach score and device mutations through authenticated, scope-checked server routes. The canonical engine RPC is service-only. | security | Ordered predecessors where referenced | Recorded |
| `20260902170000_harden_pilot_public_base_tables.sql` | UI/UX 1.1E pilot hardening. Venue's public pages are server-rendered through explicit projections and | security | Ordered predecessors where referenced | Recorded |

## Validation baseline

At audit time:

- staging migration count: 26
- migration-history fingerprint: `4de7a4c4ee356fbb1942401586211b49`
- key-schema fingerprint: `5953baaef2f156d641159dc6a1542f1c`
- no staging rows or schema objects were changed
- no migration-history rows were changed
- no production project was accessed
- no credentials were written
