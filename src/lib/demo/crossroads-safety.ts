import type { EmergencyScenario, IncidentReport, SafetyNotice, ShelterLocation } from "../safety-emergency.ts";
import { getActiveSafetyNotices } from "../safety-emergency.ts";
import { crossroadsVenue } from "./crossroads.ts";
import { crossroadsMaintenanceRequests } from "./crossroads-maintenance.ts";

export const crossroadsSafetyNotices: SafetyNotice[] = [
  notice("safety-lightning-delay", "Lightning Delay", "Lightning delay placeholder. All affected games are paused while venue staff monitors conditions.", "weather", "emergency", "active", ["venue:crossroads", "field:field-4", "play_surface:surface-6b"], ["public_pages", "venue_tv", "bar_tv", "future_push"]),
  notice("safety-tornado-shelter", "Tornado Shelter Guidance", "If shelter guidance is issued, follow staff to marked shelter areas inside the main building.", "shelter", "high", "active", ["venue:crossroads"], ["public_pages", "venue_tv", "main_concourse"]),
  notice("safety-first-aid", "First Aid Request", "First aid support requested near the main building. Families should keep the concourse clear.", "medical", "high", "active", ["poi:first-aid-main"], ["staff_mode", "venue_command"]),
  notice("safety-lost-child-placeholder", "Lost Child Placeholder", "Lost child workflow placeholder. Future emergency communication requires approved venue process.", "lost_child", "emergency", "draft", ["venue:crossroads"], ["venue_command"]),
  notice("safety-medical-placeholder", "Medical Incident Placeholder", "Medical incident workflow placeholder. No automatic emergency dispatch integration is live.", "medical", "emergency", "draft", ["venue:crossroads"], ["venue_command"]),
  notice("safety-shelter-in-place", "Shelter In Place Message", "Shelter-in-place message template for future approved emergency workflows.", "shelter", "emergency", "draft", ["venue:crossroads"], ["venue_tv", "future_push"]),
];

export const crossroadsEmergencyScenarios: EmergencyScenario[] = [
  scenario("scenario-lightning-delay", "lightning_delay", "Lightning Delay", "Lightning delay. All games are paused until venue staff gives the all-clear.", "Pause games, clear exposed areas, monitor restart window, and update displays."),
  scenario("scenario-tornado-shelter", "tornado_shelter", "Tornado Shelter Guidance", "Move calmly to marked shelter areas inside the main building.", "Direct families away from fields and toward marked shelter locations."),
  scenario("scenario-first-aid", "first_aid", "First Aid Request", "First aid support is responding. Please keep the walkway clear.", "Send staff to first aid location and document the incident."),
  scenario("scenario-lost-child", "lost_child", "Lost Child Placeholder", "A venue staff member will assist at the main building.", "Escalate to venue leadership and security process."),
  scenario("scenario-medical", "medical_incident", "Medical Incident Placeholder", "Please follow venue staff instructions and keep the area clear.", "Escalate to approved medical response protocol."),
  scenario("scenario-evacuation", "evacuation", "Evacuation / Shelter In Place", "Follow venue staff instructions for evacuation or shelter-in-place.", "Use only approved emergency scripts and authority chain."),
];

export const crossroadsShelterLocations: ShelterLocation[] = [
  { capacityNote: "Primary staff-directed shelter area.", directions: "Enter through Main Gate and proceed to the main building interior.", id: "shelter-main-building", locationId: "main-building", locationType: "building", name: "Main Building Interior", venueId: crossroadsVenue.id },
  { capacityNote: "Secondary hallway area for nearby families.", directions: "Follow staff from the main concourse to interior hallway space.", id: "shelter-main-hallway", locationId: "infra-concourse-hallway", locationType: "hallway", name: "Main Concourse Interior Hallway", venueId: crossroadsVenue.id },
  { capacityNote: "Staff-directed auxiliary shelter placeholder.", directions: "Use only when directed by venue operations staff.", id: "shelter-staff-area", locationId: "infra-staff-locker-area", locationType: "staff_area", name: "Staff Area Shelter Placeholder", venueId: crossroadsVenue.id },
];

export const crossroadsIncidentReports: IncidentReport[] = [
  incident("incident-first-aid-main", "First aid support near main building", "first_aid", "first-aid-main", "venue_staff", "triaged", "high", "Staff is routing first aid support; no emergency integration is live."),
  incident("incident-field-4-safety", "Wet infield safety check", "medical_incident", "surface-4b", "field_marshal", "in_progress", "normal", "Grounds crew asked to confirm footing before warmups resume."),
];

export const crossroadsStaffRoles = ["maintenance_staff", "concessions_staff", "security_staff", "venue_staff", "event_staff"] as const;

export type CrossroadsStaffRole = typeof crossroadsStaffRoles[number] | "parent" | "family_viewer";

export interface CrossroadsStaffTask {
  id: string;
  title: string;
  role: typeof crossroadsStaffRoles[number];
  locationId: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "new" | "assigned" | "in_progress" | "resolved";
  action: string;
}

export const crossroadsStaffTasks: CrossroadsStaffTask[] = [
  task("task-trash-chill-zone", "Check trash overflow near Chill Zone", "maintenance_staff", "chill-zone", "medium", "assigned", "Mark resolved after bins are cleared."),
  task("task-restroom-supplies", "Restock south restroom supplies", "maintenance_staff", "restroom-south", "high", "new", "Upload photo placeholder after restock."),
  task("task-concession-menu", "Confirm south concession menu board", "concessions_staff", "concession-south", "medium", "assigned", "Confirm menu promo is ready for afternoon games."),
  task("task-security-concourse", "Monitor main concourse crowding", "security_staff", "main-concourse", "medium", "assigned", "Report issue if walkway becomes blocked."),
  task("task-event-welcome", "Confirm tournament welcome message", "event_staff", "main-gate", "low", "assigned", "Send to venue operations if message needs update."),
];

export function canAccessCrossroadsStaffMode(role: CrossroadsStaffRole) {
  return crossroadsStaffRoles.includes(role as typeof crossroadsStaffRoles[number]);
}

export function getCrossroadsSafetyContext() {
  return {
    activeNotices: getActiveSafetyNotices(crossroadsSafetyNotices),
    emergencyScenarios: crossroadsEmergencyScenarios,
    incidentReports: crossroadsIncidentReports,
    notices: crossroadsSafetyNotices,
    shelterLocations: crossroadsShelterLocations,
  };
}

export function getCrossroadsStaffModeContext(role: CrossroadsStaffRole = "venue_staff") {
  const allowed = canAccessCrossroadsStaffMode(role);
  const roleTasks = allowed ? crossroadsStaffTasks.filter((taskItem) => taskItem.role === role || role === "venue_staff") : [];

  return {
    allowed,
    assetIssues: ["Field 6 scoreboard feed offline", "Field 4 lighting maintenance due", "Field 6 horn speaker degraded"],
    incidentReports: crossroadsIncidentReports,
    maintenanceRequests: crossroadsMaintenanceRequests.filter((request) => request.status !== "closed"),
    openIncidents: crossroadsIncidentReports.filter((report) => report.status !== "closed" && report.status !== "resolved"),
    role,
    safetyNotices: getActiveSafetyNotices(crossroadsSafetyNotices),
    tasks: roleTasks,
  };
}

function notice(
  id: string,
  title: string,
  message: string,
  noticeType: SafetyNotice["noticeType"],
  priority: SafetyNotice["priority"],
  status: SafetyNotice["status"],
  targetLocations: string[],
  displayTargets: string[],
): SafetyNotice {
  return {
    displayTargets,
    futureIntegrationLabel: displayTargets.some((target) => target.includes("future")) ? "Future emergency/display integration requires venue and partner approval" : null,
    id,
    message,
    noticeType,
    priority,
    startsAt: "2026-06-30T12:00:00.000Z",
    status,
    targetLocations,
    title,
    venueId: crossroadsVenue.id,
  };
}

function scenario(
  id: string,
  scenarioType: EmergencyScenario["scenarioType"],
  title: string,
  publicMessage: string,
  staffInstructions: string,
): EmergencyScenario {
  return {
    id,
    publicMessage,
    recommendedDisplayTargets: ["public_pages", "venue_tv", "bar_tv", "staff_mode", "future_push"],
    requiresPartnerApproval: true,
    scenarioType,
    staffInstructions,
    title,
    venueId: crossroadsVenue.id,
  };
}

function incident(
  id: string,
  title: string,
  incidentType: IncidentReport["incidentType"],
  locationId: string,
  reportedByRole: string,
  status: IncidentReport["status"],
  priority: IncidentReport["priority"],
  notes: string,
): IncidentReport {
  return {
    createdAt: "2026-06-30T13:15:00.000Z",
    id,
    incidentType,
    locationId,
    notes,
    priority,
    reportedByRole,
    status,
    title,
    venueId: crossroadsVenue.id,
  };
}

function task(
  id: string,
  title: string,
  role: CrossroadsStaffTask["role"],
  locationId: string,
  priority: CrossroadsStaffTask["priority"],
  status: CrossroadsStaffTask["status"],
  action: string,
): CrossroadsStaffTask {
  return { action, id, locationId, priority, role, status, title };
}
