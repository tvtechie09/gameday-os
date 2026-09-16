import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260831235931_tournament_family_projection_2_0a.sql", import.meta.url), "utf8");
const security = await readFile(new URL("../supabase/tests/family_2_0a_security.test.sql", import.meta.url), "utf8");

test("Tournament OS owns entries, pools, official standings, rounds, dependencies, rules, documents, and venues", () => {
  for (const table of ["tournament_divisions", "tournament_pools", "tournament_entries", "tournament_standings", "tournament_rounds", "tournament_game_contexts", "tournament_game_slots", "tournament_venues", "tournament_key_rules", "tournament_documents"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  }
  assert.doesNotMatch(migration, /create table (?:if not exists )?public\.family_(?:tournament|bracket|standing)/i);
  assert.match(migration, /session_id uuid primary key references public\.sessions/);
});

test("advancement is canonical and distinguishes confirmed, possible, pending result, and TBD", () => {
  assert.match(migration, /confirmation_state text[\s\S]+confirmed[\s\S]+possible[\s\S]+pending_result[\s\S]+tbd/);
  assert.match(migration, /source_type text[\s\S]+entry[\s\S]+winner[\s\S]+loser[\s\S]+pool_rank/);
  assert.match(migration, /source_session_id uuid references public\.sessions/);
  assert.match(migration, /family_condition_text text/);
});

test("official standings carry canonical order and tie-break explanation", () => {
  assert.match(migration, /rank integer not null/);
  assert.match(migration, /tie_break_label text/);
  assert.match(migration, /tie_break_explanation text/);
  assert.match(migration, /is_official boolean not null default false/);
  assert.match(migration, /tournament_standings_pool_rank_idx/);
});

test("all new tables are tenant scoped, indexed, RLS protected, and browser denied", () => {
  assert.ok((migration.match(/organization_id uuid not null references public\.organizations/g) ?? []).length >= 10);
  assert.ok((migration.match(/enable row level security/g) ?? []).length >= 10);
  assert.match(migration, /revoke all on public\.tournament_divisions[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete[\s\S]+to service_role/);
  assert.match(security, /has_table_privilege\('anon'/);
  assert.match(security, /has_table_privilege\('authenticated'/);
});

test("Family projections are narrow security-invoker views and documents require safe HTTPS", () => {
  assert.equal((migration.match(/with \(security_invoker = true\)/g) ?? []).length, 9);
  assert.match(migration, /url text not null check \(length\(url\) <= 2048 and url ~ '\^https:\/\/'\)/);
  assert.match(migration, /where published_at is not null and url ~ '\^https:\/\/'/);
  assert.match(migration, /revoke all on public\.tournament_family_tournaments[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant select on public\.tournament_family_tournaments[\s\S]+to service_role/);
});
