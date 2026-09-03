import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/20260903195110_platform_identity_1_0.sql", import.meta.url), "utf8");
const foreignKeyIndexes = readFileSync(new URL("../supabase/migrations/20260903201234_platform_identity_1_0_fk_indexes.sql", import.meta.url), "utf8");
const architecture = readFileSync(new URL("../docs/platform-identity-1.0.md", import.meta.url), "utf8");

const identityTables = [
  "people",
  "person_organization_links",
  "account_people",
  "person_source_identities",
  "person_identifiers",
  "person_relationships",
  "person_provenance_assertions",
  "identity_resolution_cases",
  "identity_separation_rules",
  "identity_resolution_events",
  "identity_authority_rules",
  "person_legacy_links",
];

describe("Platform Identity 1.0 schema contract", () => {
  it("creates the canonical person, account, source, relationship, provenance, review, audit, and authority concepts", () => {
    for (const table of identityTables) assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  });

  it("keeps Auth account identity separate from canonical person identity", () => {
    assert.match(migration, /create table if not exists public\.account_people[\s\S]*auth_user_id uuid not null unique[\s\S]*person_id uuid not null unique references public\.people/i);
    assert.doesNotMatch(migration, /create table if not exists public\.people[\s\S]{0,400}auth_user_id uuid not null/i);
  });

  it("uses the durable provider connection identity and permits unresolved sources", () => {
    assert.match(migration, /unique \(provider, provider_connection_key, external_person_id\)/);
    assert.match(migration, /person_id uuid references public\.people\(id\) on delete set null/);
  });

  it("does not make shared email, phone, or names globally unique", () => {
    assert.doesNotMatch(migration, /unique\s*\(normalized_value\)/i);
    assert.doesNotMatch(migration, /normalized_value\s+text\s+[^,\n]*unique/i);
    assert.doesNotMatch(migration, /display_name\s+text\s+[^,\n]*unique/i);
  });

  it("locks every identity table behind RLS and deny-by-default browser grants", () => {
    for (const table of identityTables) {
      assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
      assert.match(migration, new RegExp(`grant select, insert, update, delete on table public\\.${table} to service_role`));
    }
    assert.doesNotMatch(migration, /grant\s+[^;]+\s+to\s+(anon|authenticated)/i);
  });

  it("provides indexed identifier and source lookups without unbounded scans", () => {
    assert.match(migration, /person_identifiers_lookup_idx[\s\S]*organization_id, identifier_type, normalized_value/);
    assert.match(migration, /person_source_identities_org_idx/);
    assert.match(migration, /identity_resolution_cases_open_idx/);
  });

  it("covers staging-advisor foreign-key maintenance paths additively", () => {
    for (const index of [
      "people_organization_id_idx",
      "people_user_id_idx",
      "account_people_user_id_idx",
      "person_source_identities_connection_id_idx",
      "person_identifiers_source_identity_id_idx",
      "person_relationships_subject_person_id_idx",
      "person_relationships_related_person_id_idx",
      "person_relationships_source_identity_id_idx",
      "person_provenance_assertions_organization_id_idx",
      "identity_resolution_cases_source_identity_id_idx",
      "identity_resolution_cases_candidate_person_id_idx",
      "identity_resolution_cases_reviewed_by_user_id_idx",
      "identity_separation_rules_organization_id_idx",
      "identity_separation_rules_person_id_idx",
      "identity_separation_rules_decided_by_user_id_idx",
      "identity_resolution_events_person_id_idx",
      "identity_resolution_events_source_identity_id_idx",
      "identity_resolution_events_previous_person_id_idx",
      "identity_resolution_events_actor_user_id_idx",
      "identity_authority_rules_organization_id_idx",
      "identity_authority_rules_created_by_user_id_idx",
      "person_legacy_links_person_id_idx",
    ]) assert.match(foreignKeyIndexes, new RegExp(`create index if not exists ${index}`));
    assert.doesNotMatch(foreignKeyIndexes, /\b(drop|delete|update|truncate)\b/i);
  });

  it("normalizes legacy phone values with the intended PostgreSQL non-digit pattern", () => {
    assert.ok(migration.includes("regexp_replace(people.phone, '\\D', '', 'g')"));
    assert.ok(!migration.includes("regexp_replace(people.phone, '\\\\D', '', 'g')"));
  });

  it("preserves conflicting source assertions instead of applying cross-provider last-write-wins", () => {
    assert.match(migration, /unique \(source_identity_id, fact_domain, fact_key, value_hash\)/);
    assert.match(migration, /identity_authority_rules_unique_idx/);
  });

  it("is additive and does not rewrite Team or Family gdt records", () => {
    assert.doesNotMatch(migration, /(update|delete from|alter table|drop table)\s+public\.gdt_/i);
    assert.match(architecture, /does not update or delete `gdt_people`/);
  });

  it("documents exact resolver rules, migration boundary, security, deferred work, and risks", () => {
    for (const heading of ["Architecture found", "Architecture implemented", "Exact resolver rules", "Schema and migration safety", "Security boundary", "Deferred work", "Risks"]) assert.match(architecture, new RegExp(`## ${heading}`));
    assert.match(architecture, /runtime-accepted/);
  });
});
