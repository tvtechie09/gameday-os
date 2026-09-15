import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260901004956_provider_normalization_data_quality_2_0b.sql", import.meta.url), "utf8");
const providerSeedMigration = await readFile(new URL("../supabase/migrations/20260901010500_seed_canonical_provider_registry_2_0b.sql", import.meta.url), "utf8");
const qualityPage = await readFile(new URL("../src/app/admin/integrations/quality/page.tsx", import.meta.url), "utf8");
const qualityActions = await readFile(new URL("../src/app/admin/integrations/quality/actions.ts", import.meta.url), "utf8");
const qualityService = await readFile(new URL("../src/lib/services/integration-data-quality.ts", import.meta.url), "utf8");
const integrationService = await readFile(new URL("../src/lib/services/integration-framework.ts", import.meta.url), "utf8");
const lineageService = await readFile(new URL("../src/lib/services/provider-lineage.ts", import.meta.url), "utf8");
const syncEngine = await readFile(new URL("../src/lib/services/sync-engine.ts", import.meta.url), "utf8");
const syncActions = await readFile(new URL("../src/app/admin/sync/actions.ts", import.meta.url), "utf8");
const sessionsService = await readFile(new URL("../src/lib/services/sessions.ts", import.meta.url), "utf8");
const scheduleNotifications = await readFile(new URL("../src/lib/services/schedule-notifications.ts", import.meta.url), "utf8");

describe("Family 2.0B database and security", () => {
  it("creates tenant-scoped lineage, conflict, duplicate, override, and webhook-receipt models", () => {
    for (const table of ["integration_external_entity_links", "integration_provider_conflicts", "integration_duplicate_candidates", "integration_field_overrides", "integration_webhook_receipts"]) {
      assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
      assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
    }
    assert.match(migration, /unique \(connection_id, entity_type, external_id\)/);
    assert.match(migration, /unique \(organization_id, conflict_key\)/);
    assert.match(migration, /integration_connections_source_identity_idx/);
  });

  it("seeds the complete truthful provider registry on consolidated staging schemas", () => {
    for (const provider of ["sportsengine", "gamechanger", "teamsnap", "leagueapps", "playmetrics", "sprocketsports", "hometeamsonline", "csv", "gameday_native"]) assert.match(providerSeedMigration, new RegExp(`'${provider}'`));
    assert.match(providerSeedMigration, /'sportsengine'[\s\S]*'API_SYNC'/);
    assert.match(providerSeedMigration, /'gamechanger'[\s\S]*'LINK_OUT'/);
    assert.match(providerSeedMigration, /on conflict \(provider_key\) do update/);
  });

  it("keeps integration data service-role-only and tenant scoped in mutations", () => {
    assert.match(qualityService, /requirePermission\(actor, "integrations\.edit"/);
    assert.match(qualityService, /"platform", platformScopeSentinel/);
    assert.match(integrationService, /"platform", platformScopeSentinel/);
    assert.match(qualityService, /\.eq\("organization_id", conflict\.organization_id\)/);
    assert.match(qualityService, /\.eq\("organization_id", mapping\.organization_id\)/);
    assert.match(qualityService, /allowedOrganizationIds/);
    assert.match(qualityService, /\.filter\(\(candidate\) => allowedOrganizationIds\.has\(candidate\.organization_id\)\)/);
    assert.match(qualityService, /session\.organizationId !== conflict\.organization_id/);
    assert.match(qualityService, /updateImportedSessionSchedule/);
    assert.match(qualityActions, /getVerifiedVenueActorId/);
    assert.match(qualityActions, /if \(!isDevLoginEnabled\(\)\) throw error/);
    assert.match(qualityActions, /session\.kind === "active"/);
    assert.match(syncActions, /requireServerActionPermission\("integration\.webhook\.manage"\)/);
    assert.doesNotMatch(qualityPage, /credential|token|secret/i);
  });

  it("routes provider schedule mutations through the existing Family change and notification policy", () => {
    assert.match(sessionsService, /updateImportedSessionSchedule[\s\S]*notifyScheduleChange/);
    assert.match(sessionsService, /sourceProvider: mappedSession\.externalSource/);
    assert.match(scheduleNotifications, /rpc\("persist_schedule_change_event"/);
    assert.match(scheduleNotifications, /gdt_family_notification_preferences/);
    assert.match(scheduleNotifications, /gdt_family_notifications/);
    assert.match(scheduleNotifications, /dedupe_key: `schedule-change:\$\{changeId\}`/);
    assert.match(scheduleNotifications, /groupKey: `venue-provider:\$\{input\.eventId\}:\$\{fingerprint\}`/);
  });

  it("routes approved CSV/manual imports through durable canonical lineage", () => {
    assert.match(syncEngine, /recordImportedSessionLineage/);
    assert.match(lineageService, /integration_external_entity_links/);
    assert.match(lineageService, /onConflict: "connection_id,entity_type,external_id"/);
    assert.match(lineageService, /sanitizeProviderMetadata/);
    assert.match(lineageService, /resolveSafeProviderLink/);
  });
});

describe("Family 2.0B admin experience", () => {
  it("shows health, sync history, conflicts, duplicates, and mapping review", () => {
    for (const phrase of ["Provider health", "Conflict review", "Mapping review", "Sync history", "Duplicate candidates", "Stale integrations"]) assert.match(qualityPage, new RegExp(phrase, "i"));
    assert.match(qualityPage, /resolveProviderConflictAction/);
    assert.match(qualityPage, /reviewProviderMappingAction/);
  });

  it("uses responsive wrapping rather than fixed data tables", () => {
    assert.match(qualityPage, /sm:grid-cols-2/);
    assert.match(qualityPage, /xl:grid-cols-4/);
    assert.match(qualityPage, /break-words/);
    assert.doesNotMatch(qualityPage, /<table/);
  });
});
