import type { Alert, Field, Resource, ScoreboardProfile, Session, Sponsor, SponsorAssignment, Venue } from "@/lib/types";

export type AiRecommendationType =
  | "operations"
  | "scheduling"
  | "weather"
  | "field_status"
  | "scoreboard"
  | "sponsor"
  | "system_health";

export type AiRecommendationSeverity = "info" | "warning" | "urgent";
export type AiRecommendationStatus = "open" | "reviewed" | "dismissed" | "resolved";

export type AiRecommendationActionType =
  | "create_alert"
  | "open_operations_center"
  | "open_field_control"
  | "open_session"
  | "mark_reviewed"
  | "dismiss";

export interface AiRecommendationAction {
  actionType: AiRecommendationActionType;
  href?: string;
  label: string;
}

export interface AiRecommendation {
  id: string;
  organizationId: string | null;
  venueId: string | null;
  recommendationType: AiRecommendationType;
  title: string;
  message: string;
  severity: AiRecommendationSeverity;
  status: AiRecommendationStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
  actions: AiRecommendationAction[];
}

export interface AiRecommendationContext {
  activeAlerts?: Alert[];
  alerts?: Alert[];
  fields?: Field[];
  resources?: Resource[];
  schemaAudit?: {
    missingColumns?: number;
    missingIndexes?: number;
    missingPolicies?: number;
    missingTables?: number;
  };
  scoreboards?: ScoreboardProfile[];
  sessions?: Session[];
  sponsorAssignments?: SponsorAssignment[];
  sponsors?: Sponsor[];
  systemHealth?: {
    errors?: number;
    score?: number;
    warnings?: number;
  };
  venues?: Venue[];
}

function nowIso() {
  return new Date().toISOString();
}

function isActiveSession(session: Session, now = new Date()) {
  if (session.status === "active" || session.gameStatus === "active") return true;
  if (!session.endTime) return false;

  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  const current = now.getTime();

  return !Number.isNaN(start) && !Number.isNaN(end) && current >= start && current <= end;
}

function isUpcomingSession(session: Session, now = new Date()) {
  const start = new Date(session.startTime).getTime();

  return session.status === "scheduled" && !Number.isNaN(start) && start > now.getTime();
}

function isActiveAlert(alert: Alert, now = new Date()) {
  if (!alert.isActive) return false;

  const start = new Date(alert.startTime).getTime();
  const end = new Date(alert.endTime).getTime();
  const current = now.getTime();

  return (Number.isNaN(start) || start <= current) && (Number.isNaN(end) || end >= current);
}

function includesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();

  return terms.some((term) => normalized.includes(term));
}

function fieldName(fieldId: string, fields: Field[]) {
  return fields.find((field) => field.id === fieldId)?.name ?? "A field";
}

function venueForField(field: Field, venues: Venue[]) {
  return venues.find((venue) => venue.id === field.venueId) ?? null;
}

function makeRecommendation(input: {
  actions: AiRecommendationAction[];
  id: string;
  message: string;
  organizationId?: string | null;
  recommendationType: AiRecommendationType;
  severity: AiRecommendationSeverity;
  source: string;
  title: string;
  venueId?: string | null;
}): AiRecommendation {
  const timestamp = nowIso();

  return {
    actions: input.actions,
    createdAt: timestamp,
    id: input.id,
    message: input.message,
    organizationId: input.organizationId ?? null,
    recommendationType: input.recommendationType,
    severity: input.severity,
    source: input.source,
    status: "open",
    title: input.title,
    updatedAt: timestamp,
    venueId: input.venueId ?? null,
  };
}

export function generateAiRecommendations(context: AiRecommendationContext): AiRecommendation[] {
  const now = new Date();
  const venues = context.venues ?? [];
  const fields = context.fields ?? [];
  const sessions = context.sessions ?? [];
  const alerts = context.alerts ?? [];
  const activeAlerts = (context.activeAlerts ?? alerts.filter((alert) => isActiveAlert(alert, now))).filter((alert) => isActiveAlert(alert, now));
  const scoreboards = context.scoreboards ?? [];
  const sponsors = context.sponsors ?? [];
  const sponsorAssignments = context.sponsorAssignments ?? [];
  const recommendations: AiRecommendation[] = [];

  for (const field of fields) {
    const venue = venueForField(field, venues);
    const fieldSessions = sessions.filter((session) => session.fieldId === field.id);
    const upcomingOrActiveSessions = fieldSessions.filter((session) => isActiveSession(session, now) || isUpcomingSession(session, now));

    if (field.status === "delayed") {
      recommendations.push(makeRecommendation({
        actions: [
          { actionType: "create_alert", href: `/admin/alerts/new?venueId=${field.venueId}&fieldId=${field.id}`, label: "Create Alert" },
          { actionType: "open_operations_center", href: `/admin/operations-center?venueId=${field.venueId}`, label: "Open Venue Status" },
          { actionType: "open_field_control", href: `/admin/fields/${field.id}/control`, label: "Open Field Control" },
        ],
        id: `field-delay-${field.id}`,
        message: `${field.name} is delayed. Consider notifying parents and coaches if a public alert has not already been posted.`,
        organizationId: field.organizationId ?? venue?.organizationId ?? null,
        recommendationType: "operations",
        severity: "warning",
        source: "fields.field_status",
        title: `${field.name} is delayed`,
        venueId: field.venueId,
      }));
    }

    if ((field.status === "closed" || field.status === "maintenance") && upcomingOrActiveSessions.length > 0) {
      recommendations.push(makeRecommendation({
        actions: [
          { actionType: "open_field_control", href: `/admin/fields/${field.id}/control`, label: "Open Field Control" },
          { actionType: "open_session", href: `/admin/sessions/${upcomingOrActiveSessions[0].id}`, label: "Open Session" },
          { actionType: "open_operations_center", href: `/admin/operations-center?venueId=${field.venueId}`, label: "Open Venue Status" },
        ],
        id: `closed-field-sessions-${field.id}`,
        message: `${field.name} is ${field.status}, but ${upcomingOrActiveSessions.length} active or upcoming session${upcomingOrActiveSessions.length === 1 ? "" : "s"} are still scheduled there.`,
        organizationId: field.organizationId ?? venue?.organizationId ?? null,
        recommendationType: "scheduling",
        severity: "urgent",
        source: "fields.sessions",
        title: `${field.name} has scheduled sessions while unavailable`,
        venueId: field.venueId,
      }));
    }
  }

  const delayedFields = fields.filter((field) => field.status === "delayed");
  const publicDelayAlertExists = activeAlerts.some((alert) => (
    alert.alertVisibility === "public"
    && (alert.alertType === "delay" || alert.alertType === "weather" || includesAny(`${alert.title} ${alert.message}`, ["delay", "lightning", "weather"]))
  ));

  if (delayedFields.length > 0 && !publicDelayAlertExists) {
    const firstVenueId = delayedFields[0].venueId;
    recommendations.push(makeRecommendation({
      actions: [
        { actionType: "create_alert", href: `/admin/alerts/new?venueId=${firstVenueId}`, label: "Create Alert" },
        { actionType: "open_operations_center", href: `/admin/operations-center?venueId=${firstVenueId}`, label: "Open Venue Status" },
      ],
      id: "delayed-venue-missing-public-alert",
      message: `${delayedFields.length} field${delayedFields.length === 1 ? " is" : "s are"} delayed, but no active public delay alert was found.`,
      organizationId: delayedFields[0].organizationId ?? null,
      recommendationType: "operations",
      severity: "urgent",
      source: "fields.alerts",
      title: "Venue delay needs a public alert",
      venueId: firstVenueId,
    }));
  }

  for (const alert of activeAlerts) {
    if (alert.alertType === "weather" && includesAny(`${alert.title} ${alert.message}`, ["lightning", "thunder", "storm"])) {
      recommendations.push(makeRecommendation({
        actions: [
          { actionType: "open_operations_center", href: `/admin/operations-center?venueId=${alert.venueId}`, label: "Open Venue Status" },
          { actionType: "create_alert", href: `/admin/alerts/new?venueId=${alert.venueId}&weather_delay=true`, label: "Create Alert" },
        ],
        id: `lightning-delay-${alert.id}`,
        message: "A lightning or storm-related alert is active. Confirm restart timing and keep public updates current.",
        organizationId: alert.organizationId ?? null,
        recommendationType: "weather",
        severity: "urgent",
        source: "alerts.weather",
        title: "Lightning delay is active",
        venueId: alert.venueId,
      }));
    }
  }

  for (const assignment of sponsorAssignments) {
    const sponsor = sponsors.find((item) => item.id === assignment.sponsorId);
    if (sponsor && !sponsor.websiteUrl) {
      recommendations.push(makeRecommendation({
        actions: [
          { actionType: "open_operations_center", href: "/admin/sponsors", label: "Open Sponsors" },
        ],
        id: `sponsor-missing-url-${assignment.id}`,
        message: `${sponsor.name} is assigned as a ${assignment.placementLabel}, but no website URL is configured.`,
        organizationId: sponsor.organizationId ?? null,
        recommendationType: "sponsor",
        severity: "info",
        source: "sponsors.sponsor_assignments",
        title: "Sponsor assigned without URL",
        venueId: assignment.venueId ?? fields.find((field) => field.id === assignment.fieldId)?.venueId ?? null,
      }));
    }
  }

  for (const scoreboard of scoreboards) {
    const hasActiveSession = sessions.some((session) => session.fieldId === scoreboard.fieldId && isActiveSession(session, now));

    if (!hasActiveSession && (scoreboard.scoreboardStatus === "configured" || scoreboard.scoreboardStatus === "active" || scoreboard.scoreboardStatus === "testing")) {
      recommendations.push(makeRecommendation({
        actions: [
          { actionType: "open_field_control", href: `/admin/fields/${scoreboard.fieldId}/control`, label: "Open Field Control" },
          { actionType: "open_operations_center", href: "/admin/scoreboards/display", label: "Open Scoreboard Controls" },
        ],
        id: `scoreboard-no-active-session-${scoreboard.id}`,
        message: `${fieldName(scoreboard.fieldId, fields)} has a scoreboard profile, but no active session is currently driving the display.`,
        organizationId: scoreboard.organizationId ?? fields.find((field) => field.id === scoreboard.fieldId)?.organizationId ?? null,
        recommendationType: "scoreboard",
        severity: "info",
        source: "scoreboards.sessions",
        title: "Scoreboard has no active session",
        venueId: scoreboard.venueId,
      }));
    }
  }

  const maintenanceResources = (context.resources ?? []).filter((resource) => resource.status === "maintenance" || resource.status === "unknown");
  if (maintenanceResources.length > 0) {
    recommendations.push(makeRecommendation({
      actions: [
        { actionType: "open_operations_center", href: "/admin/resources", label: "Open Resources" },
      ],
      id: "resources-need-review",
      message: `${maintenanceResources.length} resource${maintenanceResources.length === 1 ? "" : "s"} are in maintenance or unknown status.`,
      organizationId: maintenanceResources[0].organizationId ?? null,
      recommendationType: "operations",
      severity: "warning",
      source: "resources.status",
      title: "Resources need operations review",
      venueId: maintenanceResources[0].venueId,
    }));
  }

  if (context.systemHealth?.score !== undefined && context.systemHealth.score < 90) {
    recommendations.push(makeRecommendation({
      actions: [
        { actionType: "open_operations_center", href: "/admin/system-health", label: "Open System Health" },
      ],
      id: "system-health-score-low",
      message: `System health is ${context.systemHealth.score}%. Review ${context.systemHealth.errors ?? 0} error${context.systemHealth.errors === 1 ? "" : "s"} and ${context.systemHealth.warnings ?? 0} warning${context.systemHealth.warnings === 1 ? "" : "s"}.`,
      recommendationType: "system_health",
      severity: (context.systemHealth.errors ?? 0) > 0 ? "urgent" : "warning",
      source: "system_health",
      title: "System health needs attention",
    }));
  }

  const missingSchemaItems = (context.schemaAudit?.missingTables ?? 0)
    + (context.schemaAudit?.missingColumns ?? 0)
    + (context.schemaAudit?.missingIndexes ?? 0)
    + (context.schemaAudit?.missingPolicies ?? 0);
  if (missingSchemaItems > 0) {
    recommendations.push(makeRecommendation({
      actions: [
        { actionType: "open_operations_center", href: "/admin/schema-audit", label: "Open Schema Audit" },
      ],
      id: "schema-audit-missing-items",
      message: `${missingSchemaItems} expected schema item${missingSchemaItems === 1 ? "" : "s"} may be missing. Run the schema audit before field testing.`,
      recommendationType: "system_health",
      severity: "warning",
      source: "schema_audit",
      title: "Schema audit has missing items",
    }));
  }

  return recommendations
    .filter((recommendation, index, list) => list.findIndex((item) => item.id === recommendation.id) === index)
    .sort((a, b) => {
      const severityRank: Record<AiRecommendationSeverity, number> = { urgent: 0, warning: 1, info: 2 };
      return severityRank[a.severity] - severityRank[b.severity] || a.title.localeCompare(b.title);
    });
}
