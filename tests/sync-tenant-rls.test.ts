import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migration = readFileSync("supabase/migrations/20261118000100_sync_tenant_ownership_rls.sql", "utf8");
const rollback = readFileSync("supabase/rollback/20261118000100_sync_tenant_ownership_rls.rollback.sql", "utf8");
const roleTests = readFileSync("supabase/tests/sync_tenant_rls_role_tests.sql", "utf8");
const runbook = readFileSync("docs/security/sync-tenant-rls-rollout.md", "utf8");

describe("sync tenant ownership migration", () => {
  it("adds multi-venue ownership without destructively rewriting legacy rows", () => {
    assert.match(migration, /create table if not exists public\.sync_job_venues/);
    assert.match(migration, /add column if not exists venue_id uuid/);
    assert.doesNotMatch(migration, /alter column venue_id set not null/i);
    assert.doesNotMatch(migration, /drop table|drop column/i);
  });

  it("backfills only from canonical fields and external sources", () => {
    assert.match(migration, /source_data #>> '\{session,field_id\}' = fields\.id::text/);
    assert.match(migration, /join public\.external_sources as sources on sources\.id = jobs\.source_id/);
    assert.doesNotMatch(migration, /\(.*source_data.*\)::uuid/i);
    assert.match(migration, /queue_missing_canonical_venue/);
    assert.match(migration, /job_missing_owner/);
    assert.match(migration, /source_queue_venue_mismatch/);
  });

  it("enforces canonical immutable queue ownership and durable job ownership", () => {
    assert.match(migration, /Sync queue ownership and source target are immutable/);
    assert.match(migration, /Sync queue venue does not match its canonical field/);
    assert.match(migration, /sync_queue_register_job_venue_trigger/);
    assert.match(migration, /sync_job_register_source_venue_trigger/);
  });

  it("replaces public access with permission- and scope-aware RLS", () => {
    assert.match(migration, /drop policy if exists "Public can read sync jobs"/);
    assert.match(migration, /drop policy if exists "Public can create sync queue"/);
    assert.match(migration, /permissions\.key = required_permission_key/);
    assert.match(migration, /assignments\.scope_type = 'platform'/);
    assert.match(migration, /assignments\.scope_type = 'organization'/);
    assert.match(migration, /assignments\.scope_type = 'venue'/);
    assert.match(migration, /assignments\.assignment_status = 'approved'/);
    assert.match(migration, /assignments\.revoked_at is null/);
    assert.match(migration, /assignments\.ends_at is null or assignments\.ends_at > now\(\)/);
    assert.match(migration, /not public\.can_access_sync_venue/);
    assert.match(migration, /queue\.venue_id is null/);
    assert.match(migration, /revoke all on public\.sync_jobs from public, anon, authenticated/);
  });

  it("keeps application writes and reads aligned with durable ownership", () => {
    const service = readFileSync("src/lib/services/sync-engine.ts", "utf8");
    assert.match(service, /venue_id: venueId/);
    assert.match(service, /from\("sync_job_venues"\)\.select\("sync_job_id,venue_id"\)/);
    assert.match(service, /item\.venueId !== field\.venueId/);
    assert.match(service, /syncQueueSelect = ".*venue_id/);
  });

  it("ships synthetic role tests and a non-weakening rollback", () => {
    for (const expected of ["platform role", "organization role", "venue A role", "venue B role", "expired role", "disabled role", "anon select", "authenticated insert", "service role"]) {
      assert.match(roleTests, new RegExp(expected));
    }
    assert.match(roleTests, /^begin;/m);
    assert.match(roleTests, /^rollback;/m);
    assert.doesNotMatch(rollback, /create policy\s+"Public can/i);
    assert.doesNotMatch(rollback, /drop table|drop column/i);
    assert.match(rollback, /revoke all on public\.sync_jobs from public, anon, authenticated/);
    assert.match(rollback, /service-role-only access explicit/);
  });

  it("documents the unexecuted environment state and deployment gates", () => {
    assert.match(runbook, /has not been applied to a local, staging, shared, or production\s+database/i);
    assert.match(runbook, /did not provide Supabase CLI[\s\S]*psql[\s\S]*Docker[\s\S]*Podman/i);
    assert.match(runbook, /Production migration and deployment require separate explicit authorization/);
    assert.match(runbook, /Never assign a venue from names, timestamps, or operator guesses/i);
  });
});
