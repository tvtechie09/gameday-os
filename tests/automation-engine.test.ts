import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  automationPermissionKeys,
  automationTemplates,
  buildAutomationWorkflowFromTemplate,
  canRoleManageAutomation,
  describeAutomationAction,
  shouldSkipAutomationRun,
} from "../src/lib/automation-engine.ts";

describe("GameDay OS Automation Engine foundation", () => {
  it("ships the required admin automation permissions", () => {
    assert.deepEqual([...automationPermissionKeys], [
      "automation.workflows.view",
      "automation.workflows.manage",
      "automation.workflows.test",
      "automation.workflows.pause",
      "automation.logs.view",
      "automation.templates.install",
    ]);
  });

  it("allows only admin/operator leadership roles to manage automation rules", () => {
    assert.equal(canRoleManageAutomation("platform_admin"), true);
    assert.equal(canRoleManageAutomation("organization_owner"), true);
    assert.equal(canRoleManageAutomation("venue_director"), true);
    assert.equal(canRoleManageAutomation("tournament_director"), true);
    assert.equal(canRoleManageAutomation("league_director"), true);
    assert.equal(canRoleManageAutomation("organization_admin"), true);
    assert.equal(canRoleManageAutomation("coach"), false);
    assert.equal(canRoleManageAutomation("parent"), false);
    assert.equal(canRoleManageAutomation("player"), false);
    assert.equal(canRoleManageAutomation("fan"), false);
  });

  it("provides the initial operations templates", () => {
    assert.deepEqual(automationTemplates.map((template) => template.name), [
      "Weather Delay",
      "Lightning Delay",
      "Field Closed",
      "Game Final",
      "Schedule Changed",
      "Team Arrival",
      "Field Turnover",
      "Game Start",
    ]);
    assert.ok(automationTemplates.every((template) => template.actions.length > 0));
    assert.ok(automationTemplates.every((template) => template.workflowType));
    assert.ok(automationTemplates.every((template) => template.requiredConfiguration.length > 0));
    assert.ok(automationTemplates.every((template) => template.defaultNotificationAudience));
  });

  it("ships the Phase 1 workflow migration tables and permissions", () => {
    const migration = readFileSync("supabase/migrations/202607080005_automation_workflows_phase1.sql", "utf8");
    for (const tableName of [
      "automation_workflows",
      "automation_events",
      "automation_conditions",
      "automation_actions",
      "automation_runs",
      "automation_run_logs",
    ]) {
      assert.match(migration, new RegExp(tableName));
    }
    for (const permission of automationPermissionKeys) {
      assert.ok(migration.includes(permission) || permission === "automation.templates.install");
    }
  });

  it("ships the marketplace migration with approved internal templates", () => {
    const migration = readFileSync("supabase/migrations/202607080006_automation_template_marketplace_phase1.sql", "utf8");
    assert.match(migration, /automation_templates/);
    assert.match(migration, /automation.templates.install/);
    for (const template of ["weather-delay", "lightning-delay", "field-closed", "game-final", "schedule-changed", "team-arrival", "field-turnover", "game-start"]) {
      assert.ok(migration.includes(template));
    }
  });

  it("builds a scoped IF/THEN workflow draft from a template", () => {
    const draft = buildAutomationWorkflowFromTemplate("weather-delay", "venue", "venue-123");
    assert.ok(draft);
    assert.equal(draft.name, "Weather Delay");
    assert.equal(draft.scopeType, "venue");
    assert.equal(draft.scopeId, "venue-123");
    assert.equal(draft.eventType, "weather.delay_started");
    assert.equal(draft.actions[0].actionType, "mark_fields_delayed");
  });

  it("skips paused or disabled workflows", () => {
    assert.equal(shouldSkipAutomationRun({ workflowStatus: "active" }), false);
    assert.equal(shouldSkipAutomationRun({ workflowStatus: "paused" }), true);
    assert.equal(shouldSkipAutomationRun({ workflowStatus: "disabled" }), true);
    assert.equal(shouldSkipAutomationRun({ workflowStatus: "archived" }), true);

    const description = describeAutomationAction({ actionConfig: {}, actionType: "mark_fields_delayed" });
    assert.match(description, /Executed mark fields delayed action/);
    assert.match(description, /GameDay OS automation engine/);
  });
});
