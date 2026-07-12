import type { Json } from "@/lib/supabase/types";
import type { IdentityScopeType } from "@/lib/types";

export type AutomationWorkflowStatus = "active" | "paused" | "disabled" | "archived";
export type AutomationRunStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type AutomationRunType = "manual" | "event" | "test";
export type AutomationLogLevel = "debug" | "info" | "warning" | "error";
export type AutomationSeverity = "info" | "warning" | "urgent";
export type AutomationWorkflowType = "weather_delay" | "lightning_delay" | "field_closed" | "game_final" | "schedule_changed" | "team_arrival" | "field_turnover" | "game_start";

export type AutomationEvent = {
  id?: string;
  eventType: string;
  eventSource?: "weather" | "field" | "session" | "schedule" | "admin";
  eventPayload?: Json;
  conditions?: Json;
  triggerType?: string;
};

export type AutomationCondition = {
  id?: string;
  conditionType: string;
  conditionConfig: Json;
  sortOrder: number;
};

export type AutomationAction = {
  id?: string;
  actionType: string;
  actionConfig: Json;
  sortOrder: number;
};

export type AutomationWorkflow = {
  id: string;
  templateId?: string | null;
  templateKey?: string | null;
  organizationId: string | null;
  venueId: string | null;
  fieldId?: string | null;
  tournamentId: string | null;
  name: string;
  description: string | null;
  workflowType?: AutomationWorkflowType;
  workflowStatus?: AutomationWorkflowStatus;
  eventType?: string;
  ruleStatus?: AutomationWorkflowStatus;
  triggerConditions?: Json;
  triggerEvent?: string;
  scopeType: IdentityScopeType;
  scopeId: string;
  createdBy: string | null;
  notificationAudience?: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  events?: AutomationEvent[];
  conditions?: AutomationCondition[];
  triggers?: AutomationEvent[];
  actions: AutomationAction[];
};

export type AutomationRun = {
  id: string;
  workflowId?: string;
  ruleId?: string;
  runStatus: AutomationRunStatus;
  runType: AutomationRunType;
  triggeredBy: string | null;
  triggerPayload: Json;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

export type AutomationRunLog = {
  id: string;
  runId: string;
  workflowId?: string;
  ruleId?: string;
  logLevel: AutomationLogLevel;
  message: string;
  metadata: Json;
  createdAt: string;
};

export type AutomationTemplate = {
  id: string;
  databaseId?: string;
  name: string;
  description: string;
  requiredConfiguration: string[];
  defaultNotificationAudience: string;
  workflowType: AutomationWorkflowType;
  event: Omit<AutomationEvent, "id">;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  severity: AutomationSeverity;
  templateStatus?: "approved" | "disabled";
  isInstalled?: boolean;
  installedWorkflowIds?: string[];
};

export const automationPermissionKeys = [
  "automation.workflows.view",
  "automation.workflows.manage",
  "automation.workflows.test",
  "automation.workflows.pause",
  "automation.logs.view",
  "automation.templates.install",
] as const;

export const automationManagerRoleKeys = [
  "platform_admin",
  "organization_owner",
  "organization_admin",
  "venue_director",
  "tournament_director",
  "league_director",
] as const;

export const automationTemplates: AutomationTemplate[] = [
  {
    id: "weather-delay",
    name: "Weather Delay",
    description: "When severe weather, lightning, or rain delay is triggered, mark affected fields delayed and publish a venue alert.",
    defaultNotificationAudience: "venue_admins",
    workflowType: "weather_delay",
    requiredConfiguration: ["Venue", "Affected fields", "Notification audience"],
    severity: "urgent",
    event: {
      eventPayload: { weatherStatus: "delay" },
      eventSource: "weather",
      eventType: "weather.delay_started",
    },
    conditions: [{ conditionConfig: { values: ["severe_weather", "lightning", "rain_delay"] }, conditionType: "weather_status", sortOrder: 0 }],
    actions: [
      { actionType: "mark_fields_delayed", actionConfig: { status: "delayed" }, sortOrder: 0 },
      { actionType: "create_venue_alert", actionConfig: { alertType: "weather", message: "Weather delay is active. Please watch for updates.", priority: "urgent", title: "Weather Delay", visibility: "public" }, sortOrder: 1 },
      { actionType: "notify_admins", actionConfig: { channel: "admin_dashboard" }, sortOrder: 2 },
    ],
  },
  {
    id: "lightning-delay",
    name: "Lightning Delay",
    description: "When lightning delay is issued, pause affected fields, publish an urgent venue alert, and notify admins.",
    defaultNotificationAudience: "venue_admins",
    workflowType: "lightning_delay",
    requiredConfiguration: ["Venue", "Affected fields", "Notification audience"],
    severity: "urgent",
    event: {
      eventPayload: { weatherStatus: "lightning_delay" },
      eventSource: "weather",
      eventType: "weather.lightning_delay_started",
    },
    conditions: [{ conditionConfig: { value: "lightning_delay" }, conditionType: "weather_status", sortOrder: 0 }],
    actions: [
      { actionType: "mark_fields_delayed", actionConfig: { reason: "lightning", status: "delayed" }, sortOrder: 0 },
      { actionType: "create_venue_alert", actionConfig: { alertType: "weather", message: "Lightning delay is active. Please clear fields and wait for updates.", priority: "urgent", title: "Lightning Delay", visibility: "public" }, sortOrder: 1 },
      { actionType: "notify_admins", actionConfig: { channel: "operations_center" }, sortOrder: 2 },
    ],
  },
  {
    id: "field-closed",
    name: "Field Closed",
    description: "When an admin closes a field, notify affected games and mark the schedule impacted.",
    defaultNotificationAudience: "venue_admins",
    workflowType: "field_closed",
    requiredConfiguration: ["Field", "Venue", "Notification audience"],
    severity: "urgent",
    event: {
      eventPayload: { fieldStatus: "closed" },
      eventSource: "field",
      eventType: "field.status_closed",
    },
    conditions: [{ conditionConfig: { value: "closed" }, conditionType: "field_status", sortOrder: 0 }],
    actions: [
      { actionType: "create_venue_alert", actionConfig: { alertType: "field_closure", message: "This field is closed. Schedule updates may follow.", priority: "urgent", title: "Field Closed", visibility: "public" }, sortOrder: 0 },
      { actionType: "mark_schedule_impacted", actionConfig: { impactType: "field_closed" }, sortOrder: 1 },
      { actionType: "notify_admins", actionConfig: { channel: "venue_dashboard" }, sortOrder: 2 },
    ],
  },
  {
    id: "game-final",
    name: "Game Final",
    description: "When a game becomes final, update field availability, prep next game workflow, and log the result.",
    defaultNotificationAudience: "venue_admins",
    workflowType: "game_final",
    requiredConfiguration: ["Session", "Field"],
    severity: "info",
    event: {
      eventPayload: { status: "final" },
      eventSource: "session",
      eventType: "session.game_final",
    },
    conditions: [{ conditionConfig: { value: "final" }, conditionType: "game_status", sortOrder: 0 }],
    actions: [
      { actionType: "record_session_timeline", actionConfig: { eventType: "game_final" }, sortOrder: 0 },
      { actionType: "prep_next_game", actionConfig: { nextGameStatus: "ready_check" }, sortOrder: 1 },
      { actionType: "update_field_availability", actionConfig: { status: "open" }, sortOrder: 2 },
    ],
  },
  {
    id: "schedule-changed",
    name: "Schedule Changed",
    description: "When game time or field changes, update venue dashboards and log the schedule change.",
    defaultNotificationAudience: "venue_admins",
    workflowType: "schedule_changed",
    requiredConfiguration: ["Session or field", "Notification audience"],
    severity: "warning",
    event: {
      eventPayload: { changed: true },
      eventSource: "schedule",
      eventType: "schedule.changed",
    },
    conditions: [{ conditionConfig: { fields: ["start_time", "field_id"] }, conditionType: "schedule_change", sortOrder: 0 }],
    actions: [
      { actionType: "mark_schedule_impacted", actionConfig: { impactType: "schedule_changed" }, sortOrder: 0 },
      { actionType: "notify_admins", actionConfig: { channel: "venue_dashboard" }, sortOrder: 1 },
      { actionType: "record_session_timeline", actionConfig: { eventType: "schedule_changed" }, sortOrder: 2 },
    ],
  },
  {
    id: "team-arrival",
    name: "Team Arrival",
    description: "When a team checks in, notify operations staff and write a session timeline update.",
    defaultNotificationAudience: "venue_staff",
    workflowType: "team_arrival",
    requiredConfiguration: ["Session", "Notification audience"],
    severity: "info",
    event: { eventPayload: { teamArrived: true }, eventSource: "admin", eventType: "team.arrived" },
    conditions: [{ conditionConfig: { value: "arrived" }, conditionType: "team_check_in", sortOrder: 0 }],
    actions: [
      { actionType: "record_session_timeline", actionConfig: { eventType: "team_arrival" }, sortOrder: 0 },
      { actionType: "notify_admins", actionConfig: { channel: "operations_center" }, sortOrder: 1 },
    ],
  },
  {
    id: "field-turnover",
    name: "Field Turnover",
    description: "When a field turnover begins, flag the field for prep and notify operations staff.",
    defaultNotificationAudience: "venue_staff",
    workflowType: "field_turnover",
    requiredConfiguration: ["Field", "Notification audience"],
    severity: "warning",
    event: { eventPayload: { turnover: true }, eventSource: "field", eventType: "field.turnover_started" },
    conditions: [{ conditionConfig: { value: "turnover" }, conditionType: "field_turnover", sortOrder: 0 }],
    actions: [
      { actionType: "update_field_availability", actionConfig: { status: "maintenance" }, sortOrder: 0 },
      { actionType: "notify_admins", actionConfig: { channel: "operations_center" }, sortOrder: 1 },
    ],
  },
  {
    id: "game-start",
    name: "Game Start",
    description: "When a game starts, mark the field active, write a timeline event, and notify the venue dashboard.",
    defaultNotificationAudience: "venue_admins",
    workflowType: "game_start",
    requiredConfiguration: ["Session", "Field"],
    severity: "info",
    event: { eventPayload: { status: "active" }, eventSource: "session", eventType: "session.game_started" },
    conditions: [{ conditionConfig: { value: "active" }, conditionType: "game_status", sortOrder: 0 }],
    actions: [
      { actionType: "record_session_timeline", actionConfig: { eventType: "game_started" }, sortOrder: 0 },
      { actionType: "update_field_availability", actionConfig: { status: "active" }, sortOrder: 1 },
      { actionType: "notify_admins", actionConfig: { channel: "venue_dashboard" }, sortOrder: 2 },
    ],
  },
];

export function getAutomationTemplate(templateId: string) {
  return automationTemplates.find((template) => template.id === templateId) ?? null;
}

export function canRoleManageAutomation(roleKey: string) {
  return automationManagerRoleKeys.some((allowedRole) => allowedRole === roleKey);
}

export function buildAutomationWorkflowFromTemplate(templateId: string, scopeType: IdentityScopeType, scopeId: string) {
  const template = getAutomationTemplate(templateId);
  if (!template) return null;

  return {
    actions: template.actions,
    conditions: template.conditions,
    description: template.description,
    event: template.event,
    eventType: template.event.eventType,
    fieldId: null,
    name: template.name,
    notificationAudience: template.defaultNotificationAudience,
    organizationId: null,
    workflowStatus: "active" as AutomationWorkflowStatus,
    workflowType: template.workflowType,
    templateKey: template.id,
    scopeId,
    scopeType,
    tournamentId: null,
    venueId: null,
  };
}

export function shouldSkipAutomationRun(workflow: { workflowStatus?: AutomationWorkflowStatus; ruleStatus?: AutomationWorkflowStatus }) {
  return (workflow.workflowStatus ?? workflow.ruleStatus) !== "active";
}

export function describeAutomationAction(action: Pick<AutomationAction, "actionType" | "actionConfig">) {
  const label = action.actionType.replaceAll("_", " ");
  return `Executed ${label} action inside the GameDay OS automation engine.`;
}

export const buildAutomationRuleFromTemplate = buildAutomationWorkflowFromTemplate;
export type AutomationRule = AutomationWorkflow;
export type AutomationRuleStatus = AutomationWorkflowStatus;
export type AutomationTrigger = AutomationEvent;
