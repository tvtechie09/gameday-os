import type { SupabaseClient } from "@supabase/supabase-js";
import { automationTemplates, describeAutomationAction, getAutomationTemplate, shouldSkipAutomationRun, type AutomationAction, type AutomationCondition, type AutomationEvent, type AutomationRun, type AutomationRunLog, type AutomationTemplate, type AutomationWorkflow, type AutomationWorkflowStatus, type AutomationWorkflowType } from "@/lib/automation-engine";
import { getCurrentOrganizationScope } from "@/lib/organization-scope";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { IdentityScopeType } from "@/lib/types";
import { assertActorUserId, PermissionDeniedError, requirePermission, safelyLogAudit } from "./identity";

type WorkflowRow = { id: string; template_id: string | null; template_key: string | null; organization_id: string | null; venue_id: string | null; field_id: string | null; tournament_id: string | null; name: string; description: string | null; workflow_type: AutomationWorkflowType; workflow_status: AutomationWorkflowStatus; event_type: string; notification_audience: string | null; scope_type: IdentityScopeType; scope_id: string; created_by: string | null; updated_by: string | null; created_at: string; updated_at: string };
type TemplateRow = { id: string; template_key: string; name: string; description: string; workflow_type: AutomationWorkflowType; event_type: string; event_source: AutomationEvent["eventSource"]; event_payload: Json; conditions: Json; actions: Json; required_configuration: Json; default_notification_audience: string; severity: AutomationTemplate["severity"]; template_status: "approved" | "disabled"; is_internal: boolean; created_at: string; updated_at: string };
type EventRow = { id: string; workflow_id: string; event_type: string; event_source: AutomationEvent["eventSource"]; event_payload: Json; created_at: string };
type ConditionRow = { id: string; workflow_id: string; condition_type: string; condition_config: Json; sort_order: number; created_at: string };
type ActionRow = { id: string; workflow_id: string; action_type: string; action_config: Json; sort_order: number; created_at: string };
type RunRow = { id: string; workflow_id: string; run_status: AutomationRun["runStatus"]; run_type: AutomationRun["runType"]; triggered_by: string | null; trigger_payload: Json; started_at: string; completed_at: string | null; error_message: string | null };
type LogRow = { id: string; run_id: string; workflow_id: string; log_level: AutomationRunLog["logLevel"]; message: string; metadata: Json; created_at: string };

type AutomationTables = {
  automation_workflows: { Row: WorkflowRow; Insert: Partial<WorkflowRow> & Pick<WorkflowRow, "name" | "workflow_type" | "event_type" | "scope_type" | "scope_id">; Update: Partial<WorkflowRow>; Relationships: [] };
  automation_templates: { Row: TemplateRow; Insert: Partial<TemplateRow> & Pick<TemplateRow, "template_key" | "name" | "workflow_type" | "event_type">; Update: Partial<TemplateRow>; Relationships: [] };
  automation_events: { Row: EventRow; Insert: Partial<EventRow> & Pick<EventRow, "workflow_id" | "event_type" | "event_source">; Update: Partial<EventRow>; Relationships: [] };
  automation_conditions: { Row: ConditionRow; Insert: Partial<ConditionRow> & Pick<ConditionRow, "workflow_id" | "condition_type">; Update: Partial<ConditionRow>; Relationships: [] };
  automation_actions: { Row: ActionRow; Insert: Partial<ActionRow> & Pick<ActionRow, "workflow_id" | "action_type">; Update: Partial<ActionRow>; Relationships: [] };
  automation_runs: { Row: RunRow; Insert: Partial<RunRow> & Pick<RunRow, "workflow_id" | "run_status" | "run_type">; Update: Partial<RunRow>; Relationships: [] };
  automation_run_logs: { Row: LogRow; Insert: Partial<LogRow> & Pick<LogRow, "run_id" | "workflow_id" | "message">; Update: Partial<LogRow>; Relationships: [] };
};

type AutomationDatabase = { public: { Tables: AutomationTables; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
type AutomationSupabaseClient = SupabaseClient<AutomationDatabase>;

export type AutomationWorkflowInput = { templateId?: string | null; templateKey?: string | null; notificationAudience?: string | null; organizationId?: string | null; venueId?: string | null; fieldId?: string | null; tournamentId?: string | null; name: string; description?: string | null; workflowType: AutomationWorkflowType; workflowStatus?: AutomationWorkflowStatus; eventType: string; scopeType: IdentityScopeType; scopeId: string; event?: AutomationEvent; conditions?: AutomationCondition[]; actions: AutomationAction[] };
export type InstallAutomationTemplateInput = { activate?: boolean; fieldId?: string | null; fieldIds?: string[]; notificationAudience?: string | null; organizationId?: string | null; scopeId: string; scopeType: Extract<IdentityScopeType, "organization" | "venue" | "field" | "tournament">; tournamentId?: string | null; venueId?: string | null };

export class AutomationError extends Error { constructor(message: string, readonly status = 400) { super(message); this.name = "AutomationError"; } }

const workflowSelect = "id,template_id,template_key,organization_id,venue_id,field_id,tournament_id,name,description,workflow_type,workflow_status,event_type,notification_audience,scope_type,scope_id,created_by,updated_by,created_at,updated_at";
const templateSelect = "id,template_key,name,description,workflow_type,event_type,event_source,event_payload,conditions,actions,required_configuration,default_notification_audience,severity,template_status,is_internal,created_at,updated_at";
const eventSelect = "id,workflow_id,event_type,event_source,event_payload,created_at";
const conditionSelect = "id,workflow_id,condition_type,condition_config,sort_order,created_at";
const actionSelect = "id,workflow_id,action_type,action_config,sort_order,created_at";
const runSelect = "id,workflow_id,run_status,run_type,triggered_by,trigger_payload,started_at,completed_at,error_message";
const runLogSelect = "id,run_id,workflow_id,log_level,message,metadata,created_at";

function getAutomationSupabase() { return getSupabaseAdminClient() as unknown as AutomationSupabaseClient; }
function normalizeText(value: string | null | undefined) { const trimmed = value?.trim(); return trimmed ? trimmed : null; }
function readStringFromJson(value: Json | undefined, key: string) { if (!value || typeof value !== "object" || Array.isArray(value)) return null; const item = (value as Record<string, Json>)[key]; return typeof item === "string" && item.trim() ? item.trim() : null; }
function readStringArrayFromJson(value: Json | undefined, key: string) { if (!value || typeof value !== "object" || Array.isArray(value)) return []; const item = (value as Record<string, Json>)[key]; return Array.isArray(item) ? item.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : []; }

function mapWorkflow(row: WorkflowRow, events: AutomationEvent[] = [], conditions: AutomationCondition[] = [], actions: AutomationAction[] = []): AutomationWorkflow { return { actions, conditions, createdAt: row.created_at, createdBy: row.created_by, description: row.description, eventType: row.event_type, events, fieldId: row.field_id, id: row.id, name: row.name, notificationAudience: row.notification_audience, organizationId: row.organization_id, scopeId: row.scope_id, scopeType: row.scope_type, templateId: row.template_id, templateKey: row.template_key, tournamentId: row.tournament_id, updatedAt: row.updated_at, updatedBy: row.updated_by, venueId: row.venue_id, workflowStatus: row.workflow_status, workflowType: row.workflow_type }; }
function mapRun(row: RunRow): AutomationRun { return { completedAt: row.completed_at, errorMessage: row.error_message, id: row.id, runStatus: row.run_status, runType: row.run_type, startedAt: row.started_at, triggeredBy: row.triggered_by, triggerPayload: row.trigger_payload, workflowId: row.workflow_id }; }
function mapRunLog(row: LogRow): AutomationRunLog { return { createdAt: row.created_at, id: row.id, logLevel: row.log_level, message: row.message, metadata: row.metadata, runId: row.run_id, workflowId: row.workflow_id }; }
function mapTemplateRow(row: TemplateRow, installedWorkflowIds: string[] = []): AutomationTemplate { return { actions: Array.isArray(row.actions) ? row.actions as unknown as AutomationAction[] : [], conditions: Array.isArray(row.conditions) ? row.conditions as unknown as AutomationCondition[] : [], databaseId: row.id, defaultNotificationAudience: row.default_notification_audience, description: row.description, event: { eventPayload: row.event_payload ?? {}, eventSource: row.event_source, eventType: row.event_type }, id: row.template_key, installedWorkflowIds, isInstalled: installedWorkflowIds.length > 0, name: row.name, requiredConfiguration: Array.isArray(row.required_configuration) ? row.required_configuration.filter((item): item is string => typeof item === "string") : [], severity: row.severity, templateStatus: row.template_status, workflowType: row.workflow_type }; }

function validateInput(input: AutomationWorkflowInput) { if (!normalizeText(input.name)) throw new AutomationError("Workflow name is required."); if (!normalizeText(input.eventType)) throw new AutomationError("Event type is required."); if (!normalizeText(input.scopeId)) throw new AutomationError("Scope id is required."); if (!input.actions.length) throw new AutomationError("At least one action is required."); }

async function hydrateWorkflows(rows: WorkflowRow[]) {
  if (!rows.length) return [];
  const supabase = getAutomationSupabase();
  const workflowIds = rows.map((row) => row.id);
  const [{ data: eventData, error: eventError }, { data: conditionData, error: conditionError }, { data: actionData, error: actionError }] = await Promise.all([
    supabase.from("automation_events").select(eventSelect).in("workflow_id", workflowIds),
    supabase.from("automation_conditions").select(conditionSelect).in("workflow_id", workflowIds).order("sort_order", { ascending: true }),
    supabase.from("automation_actions").select(actionSelect).in("workflow_id", workflowIds).order("sort_order", { ascending: true }),
  ]);
  if (eventError) throw new Error(eventError.message);
  if (conditionError) throw new Error(conditionError.message);
  if (actionError) throw new Error(actionError.message);

  const eventsByWorkflow = new Map<string, AutomationEvent[]>();
  const conditionsByWorkflow = new Map<string, AutomationCondition[]>();
  const actionsByWorkflow = new Map<string, AutomationAction[]>();
  for (const event of (eventData ?? []) as unknown as EventRow[]) { const current = eventsByWorkflow.get(event.workflow_id) ?? []; current.push({ eventPayload: event.event_payload, eventSource: event.event_source, eventType: event.event_type, id: event.id }); eventsByWorkflow.set(event.workflow_id, current); }
  for (const condition of (conditionData ?? []) as unknown as ConditionRow[]) { const current = conditionsByWorkflow.get(condition.workflow_id) ?? []; current.push({ conditionConfig: condition.condition_config, conditionType: condition.condition_type, id: condition.id, sortOrder: condition.sort_order }); conditionsByWorkflow.set(condition.workflow_id, current); }
  for (const action of (actionData ?? []) as unknown as ActionRow[]) { const current = actionsByWorkflow.get(action.workflow_id) ?? []; current.push({ actionConfig: action.action_config, actionType: action.action_type, id: action.id, sortOrder: action.sort_order }); actionsByWorkflow.set(action.workflow_id, current); }
  return rows.map((row) => mapWorkflow(row, eventsByWorkflow.get(row.id) ?? [], conditionsByWorkflow.get(row.id) ?? [], actionsByWorkflow.get(row.id) ?? []));
}

export async function getAutomationWorkflows(actorUserId: string, filters?: { scopeType?: IdentityScopeType; scopeId?: string }) {
  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const organizationId = await getCurrentOrganizationScope();
  let query = supabase.from("automation_workflows").select(workflowSelect).neq("workflow_status", "archived").order("updated_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  if (filters?.scopeType) query = query.eq("scope_type", filters.scopeType);
  if (filters?.scopeId) query = query.eq("scope_id", filters.scopeId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const workflows = await hydrateWorkflows((data ?? []) as unknown as WorkflowRow[]);
  const allowedWorkflows: AutomationWorkflow[] = [];
  for (const workflow of workflows) { try { await requirePermission(actor, "automation.workflows.view", workflow.scopeType, workflow.scopeId); allowedWorkflows.push(workflow); } catch (error) { if (!(error instanceof PermissionDeniedError)) throw error; } }
  return allowedWorkflows;
}

export async function getAutomationWorkflow(id: string, actorUserId: string, permissionKey = "automation.workflows.view") {
  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const { data, error } = await supabase.from("automation_workflows").select(workflowSelect).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as WorkflowRow;
  await requirePermission(actor, permissionKey, row.scope_type, row.scope_id);
  const [workflow] = await hydrateWorkflows([row]);
  return workflow ?? null;
}

async function replaceWorkflowChildren(workflowId: string, input: Pick<AutomationWorkflowInput, "event" | "eventType" | "conditions" | "actions">) {
  const supabase = getAutomationSupabase();
  await supabase.from("automation_events").delete().eq("workflow_id", workflowId);
  await supabase.from("automation_conditions").delete().eq("workflow_id", workflowId);
  await supabase.from("automation_actions").delete().eq("workflow_id", workflowId);
  const event = input.event ?? { eventPayload: {}, eventSource: "admin" as const, eventType: input.eventType };
  const { error: eventError } = await supabase.from("automation_events").insert({ event_payload: event.eventPayload ?? {}, event_source: event.eventSource, event_type: event.eventType, workflow_id: workflowId });
  if (eventError) throw new Error(eventError.message);
  if (input.conditions?.length) {
    const { error: conditionError } = await supabase.from("automation_conditions").insert(input.conditions.map((condition, index) => ({ condition_config: condition.conditionConfig ?? {}, condition_type: condition.conditionType, sort_order: condition.sortOrder ?? index, workflow_id: workflowId })));
    if (conditionError) throw new Error(conditionError.message);
  }
  const { error: actionError } = await supabase.from("automation_actions").insert(input.actions.map((action, index) => ({ action_config: action.actionConfig ?? {}, action_type: action.actionType, sort_order: action.sortOrder ?? index, workflow_id: workflowId })));
  if (actionError) throw new Error(actionError.message);
}

export async function createAutomationWorkflow(input: AutomationWorkflowInput, actorUserId: string) {
  validateInput(input);
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "automation.workflows.manage", input.scopeType, input.scopeId);
  const supabase = getAutomationSupabase();
  const { data, error } = await supabase.from("automation_workflows").insert({ created_by: actor, description: normalizeText(input.description), event_type: input.eventType, field_id: normalizeText(input.fieldId), name: normalizeText(input.name) ?? input.name, notification_audience: normalizeText(input.notificationAudience), organization_id: normalizeText(input.organizationId), scope_id: input.scopeId, scope_type: input.scopeType, template_id: normalizeText(input.templateId), template_key: normalizeText(input.templateKey), tournament_id: normalizeText(input.tournamentId), updated_by: actor, venue_id: normalizeText(input.venueId), workflow_status: input.workflowStatus ?? "active", workflow_type: input.workflowType }).select(workflowSelect).single();
  if (error) throw new Error(error.message);
  const createdRow = data as unknown as WorkflowRow;
  await replaceWorkflowChildren(createdRow.id, input);
  await safelyLogAudit({ action: "automation.workflow.created", actorUserId: actor, metadata: { eventType: createdRow.event_type, name: createdRow.name, templateKey: createdRow.template_key, workflowType: createdRow.workflow_type }, resourceId: createdRow.id, resourceType: "automation_workflow", scopeId: createdRow.scope_id, scopeType: createdRow.scope_type });
  const workflow = await getAutomationWorkflow(createdRow.id, actor);
  if (!workflow) throw new AutomationError("Automation workflow was created but could not be reloaded.", 500);
  return workflow;
}

export async function updateAutomationWorkflow(id: string, input: AutomationWorkflowInput, actorUserId: string) {
  validateInput(input);
  const existing = await getAutomationWorkflow(id, actorUserId, "automation.workflows.manage");
  if (!existing) throw new AutomationError("Automation workflow not found.", 404);
  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const { error } = await supabase.from("automation_workflows").update({ description: normalizeText(input.description), event_type: input.eventType, field_id: normalizeText(input.fieldId), name: normalizeText(input.name) ?? input.name, notification_audience: normalizeText(input.notificationAudience), organization_id: normalizeText(input.organizationId), scope_id: input.scopeId, scope_type: input.scopeType, template_id: normalizeText(input.templateId), template_key: normalizeText(input.templateKey), tournament_id: normalizeText(input.tournamentId), updated_at: new Date().toISOString(), updated_by: actor, venue_id: normalizeText(input.venueId), workflow_status: input.workflowStatus ?? existing.workflowStatus, workflow_type: input.workflowType }).eq("id", id);
  if (error) throw new Error(error.message);
  await replaceWorkflowChildren(id, input);
  await safelyLogAudit({ action: "automation.workflow.updated", actorUserId: actor, metadata: { eventType: input.eventType, name: input.name, workflowType: input.workflowType }, resourceId: id, resourceType: "automation_workflow", scopeId: input.scopeId, scopeType: input.scopeType });
  const workflow = await getAutomationWorkflow(id, actor);
  if (!workflow) throw new AutomationError("Automation workflow was updated but could not be reloaded.", 500);
  return workflow;
}

async function setAutomationWorkflowStatus(id: string, status: AutomationWorkflowStatus, actorUserId: string) {
  const existing = await getAutomationWorkflow(id, actorUserId, status === "paused" ? "automation.workflows.pause" : "automation.workflows.manage");
  if (!existing) throw new AutomationError("Automation workflow not found.", 404);
  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const { error } = await supabase.from("automation_workflows").update({ updated_at: new Date().toISOString(), updated_by: actor, workflow_status: status }).eq("id", id);
  if (error) throw new Error(error.message);
  const actionByStatus: Record<AutomationWorkflowStatus, string> = { active: "automation.workflow.activated", archived: "automation.workflow.removed", disabled: "automation.workflow.disabled", paused: "automation.workflow.paused" };
  await safelyLogAudit({ action: actionByStatus[status], actorUserId: actor, metadata: { previousStatus: existing.workflowStatus, nextStatus: status }, resourceId: id, resourceType: "automation_workflow", scopeId: existing.scopeId, scopeType: existing.scopeType });
  const workflow = await getAutomationWorkflow(id, actor);
  if (!workflow) throw new AutomationError("Automation workflow was updated but could not be reloaded.", 500);
  return workflow;
}

export function enableAutomationWorkflow(id: string, actorUserId: string) { return setAutomationWorkflowStatus(id, "active", actorUserId); }
export function disableAutomationWorkflow(id: string, actorUserId: string) { return setAutomationWorkflowStatus(id, "disabled", actorUserId); }
export function pauseAutomationWorkflow(id: string, actorUserId: string) { return setAutomationWorkflowStatus(id, "paused", actorUserId); }

export async function deleteAutomationWorkflow(id: string, actorUserId: string) {
  const existing = await getAutomationWorkflow(id, actorUserId, "automation.workflows.manage");
  if (!existing) throw new AutomationError("Automation workflow not found.", 404);
  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const { error } = await supabase.from("automation_workflows").update({ updated_at: new Date().toISOString(), updated_by: actor, workflow_status: "archived" }).eq("id", id);
  if (error) throw new Error(error.message);
  await safelyLogAudit({ action: "automation.workflow.removed", actorUserId: actor, metadata: { name: existing.name, templateKey: existing.templateKey }, resourceId: id, resourceType: "automation_workflow", scopeId: existing.scopeId, scopeType: existing.scopeType });
}

async function getTemplateRows() {
  const supabase = getAutomationSupabase();
  const { data, error } = await supabase.from("automation_templates").select(templateSelect).eq("is_internal", true).order("name", { ascending: true });
  if (error) {
    console.error("Automation template table unavailable; falling back to bundled templates.", error);
    return null;
  }
  return (data ?? []) as unknown as TemplateRow[];
}

async function getApprovedTemplate(templateKey: string) {
  const supabase = getAutomationSupabase();
  const { data, error } = await supabase.from("automation_templates").select(templateSelect).eq("template_key", templateKey).maybeSingle();
  if (error) {
    console.error("Automation template lookup failed; falling back to bundled template.", error);
    const fallback = getAutomationTemplate(templateKey);
    if (!fallback) return null;
    return { template: fallback, templateId: null };
  }
  if (data) {
    const row = data as unknown as TemplateRow;
    if (!row.is_internal || row.template_status !== "approved") throw new AutomationError("This automation template is not approved for install.", 403);
    return { template: mapTemplateRow(row), templateId: row.id };
  }
  const fallback = getAutomationTemplate(templateKey);
  return fallback ? { template: fallback, templateId: null } : null;
}

export async function getAutomationMarketplace(actorUserId: string) {
  const actor = assertActorUserId(actorUserId);
  const workflows = await getAutomationWorkflows(actor);
  const installedByTemplate = new Map<string, string[]>();
  for (const workflow of workflows) {
    if (!workflow.templateKey) continue;
    const current = installedByTemplate.get(workflow.templateKey) ?? [];
    current.push(workflow.id);
    installedByTemplate.set(workflow.templateKey, current);
  }

  const rows = await getTemplateRows();
  const templates = rows?.length
    ? rows.map((row) => mapTemplateRow(row, installedByTemplate.get(row.template_key) ?? []))
    : automationTemplates.map((template) => {
        const installedWorkflowIds = installedByTemplate.get(template.id) ?? [];
        return { ...template, installedWorkflowIds, isInstalled: installedWorkflowIds.length > 0, templateStatus: "approved" as const };
      });

  return { templates, workflows };
}

function withInstallConfig(actions: AutomationAction[], input: InstallAutomationTemplateInput) {
  const fieldIds = [...new Set([...(input.fieldIds ?? []), input.fieldId].filter((value): value is string => Boolean(value?.trim())))];
  return actions.map((action) => ({
    ...action,
    actionConfig: {
      ...(typeof action.actionConfig === "object" && action.actionConfig && !Array.isArray(action.actionConfig) ? action.actionConfig : {}),
      fieldIds: fieldIds.length ? fieldIds : undefined,
      notificationAudience: normalizeText(input.notificationAudience) ?? undefined,
    },
  }));
}

export async function installAutomationTemplate(templateKey: string, input: InstallAutomationTemplateInput, actorUserId: string) {
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "automation.templates.install", input.scopeType, input.scopeId);
  await requirePermission(actor, "automation.workflows.manage", input.scopeType, input.scopeId);

  const approved = await getApprovedTemplate(templateKey);
  if (!approved) throw new AutomationError("Automation template not found.", 404);
  const { template, templateId } = approved;
  if (!template.actions.length) throw new AutomationError("Automation template has no approved actions.", 400);

  const workflow = await createAutomationWorkflow({
    actions: withInstallConfig(template.actions, input),
    conditions: template.conditions,
    description: template.description,
    event: template.event,
    eventType: template.event.eventType,
    fieldId: normalizeText(input.fieldId) ?? null,
    name: template.name,
    notificationAudience: normalizeText(input.notificationAudience) ?? template.defaultNotificationAudience,
    organizationId: normalizeText(input.organizationId),
    scopeId: input.scopeId,
    scopeType: input.scopeType,
    templateId,
    templateKey: template.id,
    tournamentId: normalizeText(input.tournamentId),
    venueId: normalizeText(input.venueId),
    workflowStatus: input.activate === false ? "paused" : "active",
    workflowType: template.workflowType,
  }, actor);

  await safelyLogAudit({ action: "automation.template.installed", actorUserId: actor, metadata: { activate: input.activate !== false, notificationAudience: normalizeText(input.notificationAudience) ?? template.defaultNotificationAudience, templateKey: template.id }, resourceId: workflow.id, resourceType: "automation_workflow", scopeId: workflow.scopeId, scopeType: workflow.scopeType });
  if ((workflow.workflowStatus ?? "active") === "active") {
    await safelyLogAudit({ action: "automation.template.activated", actorUserId: actor, metadata: { templateKey: template.id }, resourceId: workflow.id, resourceType: "automation_workflow", scopeId: workflow.scopeId, scopeType: workflow.scopeType });
  }
  return workflow;
}

async function createRunLog(runId: string, workflowId: string, logLevel: AutomationRunLog["logLevel"], message: string, metadata: Json = {}) {
  const supabase = getAutomationSupabase();
  const { error } = await supabase.from("automation_run_logs").insert({ log_level: logLevel, message, metadata, run_id: runId, workflow_id: workflowId });
  if (error) console.error("Failed to write automation run log", error);
}

function resolveVenueId(workflow: AutomationWorkflow, payload: Json) { return readStringFromJson(payload, "venueId") ?? workflow.venueId; }
function resolveSessionId(payload: Json, action: AutomationAction) { return readStringFromJson(payload, "sessionId") ?? readStringFromJson(action.actionConfig, "sessionId"); }
function resolveFieldIds(workflow: AutomationWorkflow, payload: Json, action: AutomationAction) { const ids = [...readStringArrayFromJson(payload, "fieldIds"), ...readStringArrayFromJson(action.actionConfig, "fieldIds")]; const payloadFieldId = readStringFromJson(payload, "fieldId"); const actionFieldId = readStringFromJson(action.actionConfig, "fieldId"); if (payloadFieldId) ids.push(payloadFieldId); if (actionFieldId) ids.push(actionFieldId); if (workflow.fieldId) ids.push(workflow.fieldId); return [...new Set(ids)]; }

async function executeAutomationAction(workflow: AutomationWorkflow, action: AutomationAction, runId: string, triggerPayload: Json) {
  const supabase = getSupabaseAdminClient();
  const now = new Date();
  const fieldIds = resolveFieldIds(workflow, triggerPayload, action);
  const venueId = resolveVenueId(workflow, triggerPayload);
  const sessionId = resolveSessionId(triggerPayload, action);

  switch (action.actionType) {
    case "mark_fields_delayed":
    case "update_field_availability": {
      if (!fieldIds.length) throw new AutomationError("Field target is required for this field status action.");
      const status = action.actionType === "mark_fields_delayed" ? "delayed" : readStringFromJson(action.actionConfig, "status") ?? "open";
      const { error } = await supabase.from("fields").update({ field_status: status, updated_at: now.toISOString() }).in("id", fieldIds);
      if (error) throw new Error(error.message);
      await createRunLog(runId, workflow.id, "info", "Field status updated.", { fieldIds, status });
      return;
    }
    case "create_venue_alert": {
      if (!venueId) throw new AutomationError("Venue target is required to create a venue alert.");
      const start = now.toISOString();
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("alerts").insert({ alert_priority: readStringFromJson(action.actionConfig, "priority") ?? "normal", alert_scope: fieldIds.length === 1 ? "field" : "venue", alert_type: readStringFromJson(action.actionConfig, "alertType") ?? "info", alert_visibility: readStringFromJson(action.actionConfig, "visibility") ?? "public", end_time: end, field_id: fieldIds.length === 1 ? fieldIds[0] : null, is_active: true, message: readStringFromJson(action.actionConfig, "message") ?? workflow.description ?? workflow.name, organization_id: workflow.organizationId, start_time: start, title: readStringFromJson(action.actionConfig, "title") ?? workflow.name, tournament_id: workflow.tournamentId, venue_id: venueId });
      if (error) throw new Error(error.message);
      await createRunLog(runId, workflow.id, "info", "Venue alert created.", { fieldIds, venueId });
      return;
    }
    case "mark_schedule_impacted": {
      if (!fieldIds.length && !sessionId) throw new AutomationError("A field or session target is required to mark schedule impact.");
      let query = supabase.from("sessions").select("id", { count: "exact", head: true }).neq("status", "final");
      if (sessionId) query = query.eq("id", sessionId); else query = query.in("field_id", fieldIds);
      const { count, error } = await query;
      if (error) throw new Error(error.message);
      await createRunLog(runId, workflow.id, "warning", "Schedule marked impacted for operations review.", { affectedSessions: count ?? 0, fieldIds, sessionId });
      return;
    }
    case "record_session_timeline": {
      if (!sessionId) throw new AutomationError("Session target is required to record a session timeline event.");
      const eventType = readStringFromJson(action.actionConfig, "eventType") ?? workflow.eventType ?? "automation_event";
      const { error } = await supabase.from("session_events").insert({ event_message: `${workflow.name}: ${eventType.replaceAll("_", " ")}`, event_type: eventType, session_id: sessionId });
      if (error) throw new Error(error.message);
      await createRunLog(runId, workflow.id, "info", "Session timeline event recorded.", { eventType, sessionId });
      return;
    }
    case "prep_next_game": {
      if (!fieldIds.length) throw new AutomationError("Field target is required to prep the next game workflow.");
      const { count, error } = await supabase.from("sessions").select("id", { count: "exact", head: true }).in("field_id", fieldIds).eq("status", "scheduled").gte("start_time", now.toISOString());
      if (error) throw new Error(error.message);
      await createRunLog(runId, workflow.id, "info", "Next game prep queued for operations review.", { fieldIds, upcomingSessions: count ?? 0 });
      return;
    }
    case "notify_admins":
      await createRunLog(runId, workflow.id, "info", "Admin notification queued inside GameDay OS.", { channel: readStringFromJson(action.actionConfig, "channel") ?? "admin_dashboard" });
      return;
    default:
      throw new AutomationError(`Unsupported Phase 1 automation action: ${action.actionType}`);
  }
}

export async function runAutomationWorkflowTest(id: string, actorUserId: string, triggerPayload: Json = {}) {
  const workflow = await getAutomationWorkflow(id, actorUserId, "automation.workflows.test");
  if (!workflow) throw new AutomationError("Automation workflow not found.", 404);
  const actor = assertActorUserId(actorUserId);
  const supabase = getAutomationSupabase();
  const { data: runRow, error: runError } = await supabase.from("automation_runs").insert({ run_status: "running", run_type: "test", trigger_payload: triggerPayload, triggered_by: actor, workflow_id: workflow.id }).select(runSelect).single();
  if (runError) throw new Error(runError.message);
  const run = runRow as unknown as RunRow;
  try {
    await createRunLog(run.id, workflow.id, "info", `Manual test run started for ${workflow.name}.`, { source: "admin_manual_test" });
    if (shouldSkipAutomationRun(workflow)) {
      await createRunLog(run.id, workflow.id, "warning", "Workflow is paused, disabled, or archived; actions were skipped.", { workflowStatus: workflow.workflowStatus });
      const { data: skippedRun, error } = await supabase.from("automation_runs").update({ completed_at: new Date().toISOString(), run_status: "skipped" }).eq("id", run.id).select(runSelect).single();
      if (error) throw new Error(error.message);
      return mapRun(skippedRun as unknown as RunRow);
    }
    for (const action of workflow.actions) { await createRunLog(run.id, workflow.id, "info", describeAutomationAction(action), { actionType: action.actionType }); await executeAutomationAction(workflow, action, run.id, triggerPayload); }
    const { data: completedRun, error } = await supabase.from("automation_runs").update({ completed_at: new Date().toISOString(), run_status: "completed" }).eq("id", run.id).select(runSelect).single();
    if (error) throw new Error(error.message);
    await safelyLogAudit({ action: "automation.workflow.test_run", actorUserId: actor, metadata: { actionCount: workflow.actions.length, runId: run.id }, resourceId: workflow.id, resourceType: "automation_workflow", scopeId: workflow.scopeId, scopeType: workflow.scopeType });
    return mapRun(completedRun as unknown as RunRow);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation run failed.";
    await createRunLog(run.id, workflow.id, "error", message, { source: "automation_engine" });
    const { data: failedRun, error: updateError } = await supabase.from("automation_runs").update({ completed_at: new Date().toISOString(), error_message: message, run_status: "failed" }).eq("id", run.id).select(runSelect).single();
    if (updateError) console.error("Failed to mark automation run failed", updateError);
    return failedRun ? mapRun(failedRun as unknown as RunRow) : { ...mapRun(run), completedAt: new Date().toISOString(), errorMessage: message, runStatus: "failed" };
  }
}

export async function getAutomationRunLogs(workflowId: string, actorUserId: string) {
  const workflow = await getAutomationWorkflow(workflowId, actorUserId, "automation.logs.view");
  if (!workflow) throw new AutomationError("Automation workflow not found.", 404);
  const supabase = getAutomationSupabase();
  const { data, error } = await supabase.from("automation_run_logs").select(runLogSelect).eq("workflow_id", workflowId).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LogRow[]).map(mapRunLog);
}

export const getAutomationTemplates = () => automationTemplates;
