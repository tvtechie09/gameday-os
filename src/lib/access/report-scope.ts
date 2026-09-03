import type {
  Alert,
  ExternalSource,
  Field,
  Resource,
  ResourceActivation,
  Session,
  SessionEvent,
  Sponsor,
  SponsorAssignment,
  SyncJob,
  SyncQueueItem,
  Venue,
  VenueAsset,
  VolunteerRole,
} from "@/lib/types";

export type ReportData = {
  authorizedVenues: Venue[];
  venues: Venue[];
  fields: Field[];
  sessions: Session[];
  sponsors: Sponsor[];
  sponsorAssignments: SponsorAssignment[];
  alerts: Alert[];
  resources: Resource[];
  activations: ResourceActivation[];
  volunteerRoles: VolunteerRole[];
  externalSources: ExternalSource[];
  syncJobs: SyncJob[];
  syncQueueItems: SyncQueueItem[];
  sessionEvents: SessionEvent[];
  venueAssets: VenueAsset[];
  unrestricted: boolean;
};

// This boundary is deliberately pure so a known foreign venue ID cannot be
// smuggled into Reports through a URL, query parameter, or already-loaded row.
export function scopeReportData(data: ReportData): Omit<ReportData, "authorizedVenues" | "unrestricted" | "sponsorAssignments"> {
  if (data.unrestricted) {
    const { authorizedVenues: _authorized, unrestricted: _unrestricted, sponsorAssignments: _assignments, ...rest } = data;
    return rest;
  }
  const venueIds = new Set(data.authorizedVenues.map((venue) => venue.id));
  const organizationIds = new Set(data.authorizedVenues.map((venue) => venue.organizationId).filter((id): id is string => Boolean(id)));
  const venues = data.venues.filter((venue) => venueIds.has(venue.id));
  const fields = data.fields.filter((field) => venueIds.has(field.venueId));
  const fieldIds = new Set(fields.map((field) => field.id));
  const sessions = data.sessions.filter((session) => fieldIds.has(session.fieldId));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const sponsorIds = new Set(data.sponsorAssignments.filter((assignment) =>
    Boolean(
      (assignment.venueId && venueIds.has(assignment.venueId))
      || (assignment.fieldId && fieldIds.has(assignment.fieldId))
      || (assignment.sessionId && sessionIds.has(assignment.sessionId)),
    ),
  ).map((assignment) => assignment.sponsorId));
  const sourceIds = new Set(data.externalSources.filter((source) => venueIds.has(source.venueId)).map((source) => source.id));
  const syncJobs = data.syncJobs.filter((job) => Boolean(job.sourceId && sourceIds.has(job.sourceId)));
  const syncJobIds = new Set(syncJobs.map((job) => job.id));

  return {
    venues,
    fields,
    sessions,
    sponsors: data.sponsors.filter((sponsor) => sponsorIds.has(sponsor.id) && Boolean(sponsor.organizationId && organizationIds.has(sponsor.organizationId))),
    alerts: data.alerts.filter((alert) => venueIds.has(alert.venueId)),
    resources: data.resources.filter((resource) => venueIds.has(resource.venueId)),
    activations: data.activations.filter((activation) => venueIds.has(activation.venueId)),
    volunteerRoles: data.volunteerRoles.filter((role) => venueIds.has(role.venueId)),
    externalSources: data.externalSources.filter((source) => venueIds.has(source.venueId)),
    syncJobs,
    syncQueueItems: data.syncQueueItems.filter((item) => syncJobIds.has(item.syncJobId)),
    sessionEvents: data.sessionEvents.filter((event) => sessionIds.has(event.sessionId)),
    venueAssets: data.venueAssets.filter((asset) => venueIds.has(asset.venueId)),
  };
}
