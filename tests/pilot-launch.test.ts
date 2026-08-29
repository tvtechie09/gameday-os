import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildAutomaticPilotChecks,
  evaluatePilotGate,
  PILOT_REHEARSAL_STEPS,
} from "../src/lib/services/pilot-launch-core.ts";

const migration = readFileSync("supabase/migrations/20260829165411_pilot_launch_operations.sql", "utf8");
const launchPage = readFileSync("src/app/admin/pilot-launch/page.tsx", "utf8");
const prepPage = readFileSync("src/app/admin/pilot-prep/page.tsx", "utf8");
const scriptPage = readFileSync("src/app/admin/pilot-script/page.tsx", "utf8");

test("automatic launch checks describe the minimum viable venue launch", () => {
  const checks = buildAutomaticPilotChecks({
    backupOwnerReady: true,
    escalationReady: true,
    fieldCount: 2,
    primaryOwnerReady: true,
    publicUrlReady: true,
    scheduleCount: 12,
    targetDateReady: true,
    venueProfileReady: true,
    weatherReady: true,
  });

  assert.equal(checks.length, 9);
  assert.ok(checks.every((check) => check.passed));
  assert.deepEqual(checks.map((check) => check.key), [
    "venue",
    "fields",
    "schedule",
    "weather",
    "public_url",
    "launch_date",
    "primary_owner",
    "backup_owner",
    "escalation",
  ]);
});

test("launch approval requires setup, a complete rehearsal, and no serious open incident", () => {
  const automaticChecks = buildAutomaticPilotChecks({
    backupOwnerReady: true,
    escalationReady: true,
    fieldCount: 1,
    primaryOwnerReady: true,
    publicUrlReady: true,
    scheduleCount: 1,
    targetDateReady: true,
    venueProfileReady: true,
    weatherReady: true,
  });
  const rehearsalStatuses = Object.fromEntries(PILOT_REHEARSAL_STEPS.map((step) => [step.key, "passed"]));

  assert.equal(evaluatePilotGate({ automaticChecks, openHighSeverityIncidents: 0, rehearsalStatuses }).canApprove, true);
  assert.equal(evaluatePilotGate({ automaticChecks, openHighSeverityIncidents: 1, rehearsalStatuses }).canApprove, false);
  assert.equal(evaluatePilotGate({ automaticChecks, openHighSeverityIncidents: 1, rehearsalStatuses }).blockers.at(-1), "Resolve high-priority support incidents");
  rehearsalStatuses.operator_login = "failed";
  assert.equal(evaluatePilotGate({ automaticChecks, openHighSeverityIncidents: 0, rehearsalStatuses }).canApprove, false);
});

test("pilot launch records are private, tenant-linked, and server-managed", () => {
  for (const table of ["pilot_launches", "pilot_rehearsal_checks", "pilot_support_incidents"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
    assert.match(migration, new RegExp(`grant select, insert, update on table public\\.${table} to service_role`));
  }
  assert.match(migration, /venue_id uuid not null unique references public\.venues\(id\)/);
  assert.match(migration, /status in \('setup', 'rehearsal', 'approved', 'live', 'paused'\)/);
  assert.doesNotMatch(migration, /create policy/i);
});

test("one launch surface owns setup, rehearsal, support, and approval", () => {
  assert.match(launchPage, /Guided setup/);
  assert.match(launchPage, /Game-day support plan/);
  assert.match(launchPage, /Successful Saturday drill/);
  assert.match(launchPage, /Pilot incidents/);
  assert.match(launchPage, /Launch decision/);
  assert.doesNotMatch(launchPage, /Coach Score Update Test|Resource Activation Test/);
  assert.ok(prepPage.includes("redirect(venueId ? `/admin/pilot-launch"));
  assert.ok(scriptPage.includes("/admin/pilot-launch/runbook"));
});
