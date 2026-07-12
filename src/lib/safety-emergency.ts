export type SafetyNoticeType = "weather" | "emergency" | "medical" | "lost_child" | "evacuation" | "shelter" | "general";
export type SafetyPriority = "low" | "normal" | "high" | "emergency";
export type SafetyNoticeStatus = "draft" | "active" | "resolved" | "expired";
export type EmergencyScenarioType = "lightning_delay" | "tornado_shelter" | "first_aid" | "lost_child" | "medical_incident" | "evacuation" | "shelter_in_place";
export type IncidentReportStatus = "new" | "triaged" | "in_progress" | "resolved" | "closed";

export interface SafetyNotice {
  id: string;
  venueId: string;
  title: string;
  message: string;
  noticeType: SafetyNoticeType;
  priority: SafetyPriority;
  status: SafetyNoticeStatus;
  startsAt: string;
  endsAt?: string | null;
  targetLocations: string[];
  displayTargets: string[];
  futureIntegrationLabel?: string | null;
}

export interface EmergencyScenario {
  id: string;
  venueId: string;
  scenarioType: EmergencyScenarioType;
  title: string;
  publicMessage: string;
  staffInstructions: string;
  recommendedDisplayTargets: string[];
  requiresPartnerApproval: boolean;
}

export interface ShelterLocation {
  id: string;
  venueId: string;
  name: string;
  locationType: "building" | "room" | "hallway" | "restroom" | "staff_area";
  locationId: string;
  capacityNote: string;
  directions: string;
}

export interface IncidentReport {
  id: string;
  venueId: string;
  title: string;
  incidentType: EmergencyScenarioType;
  locationId: string;
  reportedByRole: string;
  status: IncidentReportStatus;
  priority: SafetyPriority;
  createdAt: string;
  notes: string;
}

export function getActiveSafetyNotices(notices: SafetyNotice[], now = new Date()) {
  return notices.filter((notice) => {
    if (notice.status !== "active") return false;
    const startsAt = new Date(notice.startsAt);
    const endsAt = notice.endsAt ? new Date(notice.endsAt) : null;
    return startsAt <= now && (!endsAt || endsAt >= now);
  });
}
