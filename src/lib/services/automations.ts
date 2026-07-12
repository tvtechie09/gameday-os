import type { SupabaseClient } from "@supabase/supabase-js";
import {
  describeAutomationAction,
  shouldSkipAutomationRun,
  type AutomationAction,
  type AutomationLogLevel,
  type AutomationRule,
  type AutomationRuleStatus,
  type AutomationRun,
  type AutomationRunLog,
  type AutomationTrigger,
} from "@/lib/automation-engine";
import { getCurrentOrganizationScope } from "@/lib/organization-scope";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { IdentityScopeType } from "@/lib/types";
import { assertActorUserId, PermissionDeniedError, requirePermission, safelyLogAudit } from "./identity";

type AutomationRuleRow = {
  id: string;
  organization_id: string | null;
  venue_id: string | null;
  tournament_id: string | null;
  name: string;
  description: string | null;
  rule_status: AutomationRuleStatus;
  trigger_event: string;
  trigger_conditions: Json;
  scope_type: IdentityScopeType;
  scope_id: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type AutomationTriggerRow = {
  id: string;
  rule_id: string;
  trigger_type: string;
  event_type: string;
  conditions: Json;
  created_at: string;
};

type AutomationActionRow = {
  id: string;
  rule_id: string;
  action_type: string;
  action_config: Json;
  sort_order: number;
  created_at: string;
};

type AutomationRunRow = {
  id: string;
  rule_id: string;
  run_status: AutomationRun["runStatus"];
  run_type: AutomationRun["runType"];
  triggered_by: string | null;
  trigger_payload: Json;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
};

type AutomationRunLogRow = {
  id: string;
  run_id: string;
  rule_id: string;
  log_level: AutomationLogLevel;
  message: string;
  metadata: Json;
  created_at: string;
};

type AutomationTables = {
  automation_rules: {
    Row: AutomationRuleRow;
    Insert: Partial<AutomationRuleRow> & Pick<AutomationRuleRow, "name" | "trigger_event" | "scope_type" | "scope_id">;
    Update: Partial<AutomationRuleRow>;
    Relationships: [];
  };
  automation_triggers: {
    Row: AutomationTriggerRow;
    Insert: Partial<AutomationTriggerRow> & Pick<AutomationTriggerRow, "rule_id" | "trigger_type" | "event_type">;
    Update: Partial<AutomationTriggerRow>;
    Relationships: [];
  };
  automation_actions: {
    Row: AutomationActionRow;
    Insert: Partial<AutomationActionRow> & Pick<AutomationActionRow, "rule_id" | "action_type">;
    Update: Partial<AutomationActionRow>;
    Relationships: [];
  };
  automation_runs: {
    Row: AutomationRunRow;
    Insert: Partial<AutomationRunRow> & Pick<AutomationRunRow, "rule_id" | "run_status" | "run_type">;
    Update: Partial<AutomationRunRow>;
    Relationships: [];
  };
  automation_run_logs: {
    Row: AutomationRunLogRow;
    Insert: Partial<AutomationRunLogRow> & Pick<AutomationRunLogRow, "run_id" | "rule_id" | "message">;
    Update: Partial<AutomationRunLogRow>;
    Relationships: [];
  };
};

type AutomationDatabase = {
  public: {
    Tables: AutomationTables;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AutomationSupabaseClient = SupabaseClient<AutomationDatabase>;

export type AutomationRuleInput = {
  organizationId?: string | null;
  venueId?: string | null;
  tournamentId?: string | null;
  name: string;
  description?: string | null;
  ruleStatus?: AutomationRuleStatus;
  triggerEvent: string;
  triggerConditions?: Json;
  scopeType: IdentityScopeType;
  scopeId: string;
  trigger?: AutomationTrigger;
  actions: AutomationAction[];
};

export class AutomationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AutomationError";
  }
}

const ruleSelect = "id,organization_id,venue_id,tournament_id,name,description,rule_status,trigger_event,trigger_conditions,scope_type,scope_id,created_by,updated_by,created_at,updated_at";
const triggerSelect = "id,rule_id,trigger_type,event_type,conditions,created_at";
const actionSelect = "id,rule_id,action_type,action_config,sort_order,created_at";
const runSelect = "id,rule_id,run_status,run_type,triggered_by,trigger_payload,started_at,completed_at,error_message";
const runLogSelect = "id,run_id,rule_id,log_level,message,metadata,created_at";

function getAutomationSupabase() {
  return getSupabaseAdminClient() as unknown as AutomationSupabaseClient;
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapTrigger(row: AutomationTriggerRow): AutomationTrigger {
  return {
    conditions: row.conditions,
    eventType: row.event_type,
    id: row.id,
    triggerType: row.trigger_type,
  };
}

function mapAction(row: AutomationActionRow): AutomationAction {
  return {
    actionConfig: row.action_config,
    actionType: row.action_type,
    id: row.id,
    sortOrder: row.sort_order,
  };
}

function mapRule(row: AutomationRuleRow, triggers: AutomationTrigger[] = [], actions: AutomationAction[] = []): AutomationRule {
  return {
    actions,
    createdAt: row.created_at,
    createdBy: row.created_by,
    description: row.description,
    id: row.id,
    name: row.name,
    organizationId: row.organization_id,
    ruleStatus: row.rule_status,
    scopeId: row.scope_id,
    scopeType: row.scope_type,
    tournamentId: row.tournament_id,
    triggerConditions: row.trigger_conditions,
    triggerEvent: row.trigger_event,
    triggers,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    venueId: row.venue_id,
  };
}

function mapRun(row: AutomationRunRow): AutomationRun {
  return {
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    id: row.id,
    ruleId: row.rule_id,
    runStatus: row.run_status,
    runType: row.run_type,
    startedAt: row.started_at,
    triggeredBy: row.triggered_by,
    triggerPayload: row.trigger_payload,
  };
}

function mapRunLog(row: AutomationRunLogRow): AutomationRunLog {
  return {
    createdAt: row.created_at,
    id: row.id,
    logLevel: row.log_level,
    message: row.message,
    metadata: row.metadata,
    ruleId: row.rule_id,
    runId: row.run_id,
  };
}

function validateInput(input: AutomationRuleInput) {
  if (!normalizeText(input.name)) throw new AutomationError("Rule name is required.");
  if (!normalizeText(input.triggerEvent)) throw new AutomationError("Trigger event is required.");
  if (!normalizeText(input.scopeId)) throw new AutomationError("Scope id is required.");
  if (input.actions.length === 0) throw new AutomationError("At least one action is required.");
}

async function hydrateRules(rows: AutomationRuleRow[]) {
  if (rows.length === 0) return [];

  const supabase = getAutomationSupabase();
  const ruleIds = rows.map((row) => row.id);
  const [{ data: triggerData, error: triggerError }, { data: actionData, error: actionError }] = await Promise.all([
    supabase.from("automation_triggers").select(triggerSelect).in("rule_id", ruleIds),
    supabase.from("automation_actions").select(actionSelect).in("rule_id", ruleIds).order("sort_order", { ascending: true }),
  ]);

  if (triggerError) throw new Error(triggerError.message);
  if (actionError) throw new Error(actionError.message);

  const triggerRows = (triggerData ?? []) as unknown as AutomationTriggerRow[];
  const actionRows = (actionData ?? []) as unknown as AutomationActionRow[];
  const triggersByRule = new Map<string, AutomationTrigger[]>();
  const actionsByRule = new Map<string, AutomationAction[]>();

  for (const trigger of triggerRows) {
    const current = triggersByRule.get(trigger.rule_id) ?? [];
    current.push(mapTrigger(trigger));
    triggersByRule.set(trigger.rule_id, current);
  }

  for (const action of actionRows) {
    const current = actionsByRule.get(action.rule_id) ?? [];
    current.push(mapAction(action));
    actionsByRule.set(action.rule_id, current);
  }

  return rows.map((row) => mapRule(row, triggersByRule.get(row.id) ?? [], actionsByRule.get(row.id) ?? []));
}

export async function getAutomationRules(actorUserId: string, filters?: { scopeType?: IdentityScopeType; scopeId?: string }) {
  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase.from("automation_rules").select(ruleSelect).neq("rule_status", "archived").order("updated_at", { ascending: false });

  if (organizationId) query = query.eq("organization_id", organizationId);
  if (filters?.scopeType) query = query.eq("scope_type", filters.scopeType);
  if (filters?.scopeId) query = query.eq("scope_id", filters.scopeId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rules = await hydrateRules((data ?? []) as unknown as AutomationRuleRow[]);
  const allowedRules: AutomationRule[] = [];
  for (const rule of rules) {
    try {
      await requirePermission(actor, "automation.rules.view", rule.scopeType, rule.scopeId);
      allowedRules.push(rule);
    } catch (error) {
      if (!(error instanceof PermissionDeniedError)) throw error;
    }
  }

  return allowedRules;
}

export async function getAutomationRule(id: string, actorUserId: string, permissionKey = "automation.rules.view") {
  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const { data, error } = await supabase.from("automation_rules").select(ruleSelect).eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as AutomationRuleRow;
  await requirePermission(actor, permissionKey, row.scope_type, row.scope_id);
  const [rule] = await hydrateRules([row]);
  return rule ?? null;
}

async function replaceRuleChildren(ruleId: string, input: Pick<AutomationRuleInput, "trigger" | "triggerEvent" | "triggerConditions" | "actions">) {
  const supabase = getAutomationSupabase();
  await supabase.from("automation_triggers").delete().eq("rule_id", ruleId);
  await supabase.from("automation_actions").delete().eq("rule_id", ruleId);

  const trigger = input.trigger ?? {
    conditions: input.triggerConditions ?? {},
    eventType: input.triggerEvent,
    triggerType: "event",
  };

  const { error: triggerError } = await supabase.from("automation_triggers").insert({
    conditions: trigger.conditions ?? {},
    event_type: trigger.eventType,
    rule_id: ruleId,
    trigger_type: trigger.triggerType ?? "event",
  });
  if (triggerError) throw new Error(triggerError.message);

  const { error: actionError } = await supabase.from("automation_actions").insert(
    input.actions.map((action, index) => ({
      action_config: action.actionConfig ?? {},
      action_type: action.actionType,
      rule_id: ruleId,
      sort_order: action.sortOrder ?? index,
    })),
  );
  if (actionError) throw new Error(actionError.message);
}

export async function createAutomationRule(input: AutomationRuleInput, actorUserId: string) {
  validateInput(input);
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "automation.rules.create", input.scopeType, input.scopeId);

  const supabase = getAutomationSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("automation_rules")
    .insert({
      created_by: actor,
      description: normalizeText(input.description),
      name: normalizeText(input.name) ?? input.name,
      organization_id: normalizeText(input.organizationId),
      rule_status: input.ruleStatus ?? "active",
      scope_id: input.scopeId,
      scope_type: input.scopeType,
      tournament_id: normalizeText(input.tournamentId),
      trigger_conditions: input.triggerConditions ?? input.trigger?.conditions ?? {},
      trigger_event: input.triggerEvent,
      updated_at: now,
      updated_by: actor,
      venue_id: normalizeText(input.venueId),
    })
    .select(ruleSelect)
    .single();

  if (error) throw new Error(error.message);
  const createdRow = data as unknown as AutomationRuleRow;
  await replaceRuleChildren(createdRow.id, input);

  await safelyLogAudit({
    action: "automation.rule.created",
    actorUserId: actor,
    metadata: { name: createdRow.name, triggerEvent: createdRow.trigger_event },
    resourceId: createdRow.id,
    resourceType: "automation_rule",
    scopeId: createdRow.scope_id,
    scopeType: createdRow.scope_type,
  });

  const rule = await getAutomationRule(createdRow.id, actor);
  if (!rule) throw new AutomationError("Automation rule was created but could not be reloaded.", 500);
  return rule;
}

export async function updateAutomationRule(id: string, input: AutomationRuleInput, actorUserId: string) {
  validateInput(input);
  const existing = await getAutomationRule(id, actorUserId, "automation.rules.edit");
  if (!existing) throw new AutomationError("Automation rule not found.", 404);

  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const { error } = await supabase
    .from("automation_rules")
    .update({
      description: normalizeText(input.description),
      name: normalizeText(input.name) ?? input.name,
      organization_id: normalizeText(input.organizationId),
      rule_status: input.ruleStatus ?? existing.ruleStatus,
      scope_id: input.scopeId,
      scope_type: input.scopeType,
      tournament_id: normalizeText(input.tournamentId),
      trigger_conditions: input.triggerConditions ?? input.trigger?.conditions ?? {},
      trigger_event: input.triggerEvent,
      updated_at: new Date().toISOString(),
      updated_by: actor,
      venue_id: normalizeText(input.venueId),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  await replaceRuleChildren(id, input);
  await safelyLogAudit({
    action: "automation.rule.updated",
    actorUserId: actor,
    metadata: { name: input.name, triggerEvent: input.triggerEvent },
    resourceId: id,
    resourceType: "automation_rule",
    scopeId: input.scopeId,
    scopeType: input.scopeType,
  });

  const rule = await getAutomationRule(id, actor);
  if (!rule) throw new AutomationError("Automation rule was updated but could not be reloaded.", 500);
  return rule;
}

export async function setAutomationRulePaused(id: string, paused: boolean, actorUserId: string) {
  const existing = await getAutomationRule(id, actorUserId, "automation.rules.pause");
  if (!existing) throw new AutomationError("Automation rule not found.", 404);

  const actor = assertActorUserId(actorUserId);
  const nextStatus: AutomationRuleStatus = paused ? "paused" : "active";
  const supabase = getAutomationSupabase();
  const { error } = await supabase
    .from("automation_rules")
    .update({ rule_status: nextStatus, updated_at: new Date().toISOString(), updated_by: actor })
    .eq("id", id);

  if (error) throw new Error(error.message);
  await safelyLogAudit({
    action: paused ? "automation.rule.paused" : "automation.rule.resumed",
    actorUserId: actor,
    metadata: { previousStatus: existing.ruleStatus, nextStatus },
    resourceId: id,
    resourceType: "automation_rule",
    scopeId: existing.scopeId,
    scopeType: existing.scopeType,
  });

  const rule = await getAutomationRule(id, actor);
  if (!rule) throw new AutomationError("Automation rule was updated but could not be reloaded.", 500);
  return rule;
}

export async function deleteAutomationRule(id: string, actorUserId: string) {
  const existing = await getAutomationRule(id, actorUserId, "automation.rules.delete");
  if (!existing) throw new AutomationError("Automation rule not found.", 404);

  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const { error } = await supabase.from("automation_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await safelyLogAudit({
    action: "automation.rule.deleted",
    actorUserId: actor,
    metadata: { name: existing.name },
    resourceId: id,
    resourceType: "automation_rule",
    scopeId: existing.scopeId,
    scopeType: existing.scopeType,
  });
}

async function createRunLog(runId: string, ruleId: string, logLevel: AutomationLogLevel, message: string, metadata: Json = {}) {
  const supabase = getAutomationSupabase();
  const { error } = await supabase.from("automation_run_logs").insert({
    log_level: logLevel,
    message,
    metadata,
    rule_id: ruleId,
    run_id: runId,
  });
  if (error) console.error("Failed to write automation run log", error);
}

export async function runAutomationRuleManually(id: string, actorUserId: string, triggerPayload: Json = {}) {
  const rule = await getAutomationRule(id, actorUserId, "automation.rules.run_manual");
  if (!rule) throw new AutomationError("Automation rule not found.", 404);

  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const { data: runRow, error: runError } = await supabase
    .from("automation_runs")
    .insert({
      rule_id: rule.id,
      run_status: "running",
      run_type: "manual",
      triggered_by: actor,
      trigger_payload: triggerPayload,
    })
    .select(runSelect)
    .single();

  if (runError) throw new Error(runError.message);

  const run = runRow as unknown as AutomationRunRow;

  try {
    await createRunLog(run.id, rule.id, "info", `Manual automation run started for ${rule.name}.`, { source: "admin_manual_run" });

    if (shouldSkipAutomationRun(rule)) {
      await createRunLog(run.id, rule.id, "warning", "Rule is paused or archived; actions were skipped.", { ruleStatus: rule.ruleStatus });
      const { data: skippedRun, error } = await supabase
        .from("automation_runs")
        .update({ completed_at: new Date().toISOString(), run_status: "skipped" })
        .eq("id", run.id)
        .select(runSelect)
        .single();
      if (error) throw new Error(error.message);
      return mapRun(skippedRun as unknown as AutomationRunRow);
    }

    for (const action of rule.actions) {
      await createRunLog(run.id, rule.id, "info", describeAutomationAction(action), {
        actionConfig: action.actionConfig,
        actionType: action.actionType,
        providerStatus: "mock_provider_ready",
      });
    }

    const { data: completedRun, error } = await supabase
      .from("automation_runs")
      .update({ completed_at: new Date().toISOString(), run_status: "completed" })
      .eq("id", run.id)
      .select(runSelect)
      .single();
    if (error) throw new Error(error.message);

    await safelyLogAudit({
      action: "automation.rule.manual_run",
      actorUserId: actor,
      metadata: { actionCount: rule.actions.length, runId: run.id },
      resourceId: rule.id,
      resourceType: "automation_rule",
      scopeId: rule.scopeId,
      scopeType: rule.scopeType,
    });

    return mapRun(completedRun as unknown as AutomationRunRow);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation run failed.";
    await createRunLog(run.id, rule.id, "error", message, { source: "automation_engine" });
    const { data: failedRun, error: updateError } = await supabase
      .from("automation_runs")
      .update({ completed_at: new Date().toISOString(), error_message: message, run_status: "failed" })
      .eq("id", run.id)
      .select(runSelect)
      .single();

    if (updateError) console.error("Failed to mark automation run failed", updateError);
    return failedRun ? mapRun(failedRun as unknown as AutomationRunRow) : { ...mapRun(run), completedAt: new Date().toISOString(), errorMessage: message, runStatus: "failed" };
  }
}

export async function getAutomationRunLogs(ruleId: string, actorUserId: string) {
  const rule = await getAutomationRule(ruleId, actorUserId, "automation.rules.view_logs");
  if (!rule) throw new AutomationError("Automation rule not found.", 404);

  const supabase = getAutomationSupabase();
  const { data, error } = await supabase
    .from("automation_run_logs")
    .select(runLogSelect)
    .eq("rule_id", ruleId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as AutomationRunLogRow[]).map(mapRunLog);
}
