export type VenueModeFieldLike = {
  id: string;
  name: string;
  venueId: string;
  organizationId?: string | null;
  zoneId?: string | null;
  parentFieldId?: string | null;
  sportType: string;
  surfaceCode?: string | null;
  layoutRole?: string;
  status: string;
  mapLabel?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  updatedAt: string;
};

export type VenueModePlaySurfaceLike = {
  id: string;
  organizationId?: string | null;
  venueId: string;
  zoneId: string | null;
  parentFieldId: string | null;
  fieldId: string | null;
  name: string;
  surfaceCode: string | null;
  sportTypes: string[];
  surfaceType: string;
  layoutRole: string;
  status: string;
  mapLabel: string | null;
  mapX: number | null;
  mapY: number | null;
  capacity: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type VenueModeSessionLike = {
  id: string;
  fieldId: string;
  playSurfaceId: string | null;
  title: string;
  startTime: string;
  status: string;
  gameStatus?: string;
};

export type VenueModeVenueLike = {
  id: string;
  name: string;
};

export type VenueModeEndpointLike = {
  id: string;
  endpointType: string;
  endpointLabel: string;
  endpointUrl: string | null;
};

export type VenueModeScheduleGroupLike<
  TSession extends VenueModeSessionLike = VenueModeSessionLike,
  TStatus extends string = string,
> = {
  surfaceId: string;
  surfaceName: string;
  surfaceCode: string | null;
  fieldId: string | null;
  status: TStatus;
  sessions: TSession[];
};

export type VenueModeQrEntryLike = {
  label: string;
  url: string;
  entryType: "venue" | "venue_display" | "parent_field" | "field" | "play_surface" | "endpoint";
  fieldId?: string;
  playSurfaceId?: string;
  endpointId?: string;
};

const validSportTypes = ["baseball", "softball", "soccer", "football", "lacrosse", "basketball", "volleyball", "other"];

export function buildFallbackPlaySurfaces<TField extends VenueModeFieldLike>(fields: TField[]): VenueModePlaySurfaceLike[] {
  return fields.map((field, index) => ({
    id: `field:${field.id}`,
    organizationId: field.organizationId ?? null,
    venueId: field.venueId,
    zoneId: field.zoneId ?? null,
    parentFieldId: field.parentFieldId ?? null,
    fieldId: field.id,
    name: field.surfaceCode ? `${field.name} ${field.surfaceCode}` : field.name,
    surfaceCode: field.surfaceCode ?? null,
    sportTypes: [validSportTypes.find((sportType) => sportType === field.sportType) ?? "other"],
    surfaceType: "field",
    layoutRole: field.layoutRole ?? "standalone",
    status: field.status,
    mapLabel: field.mapLabel ?? null,
    mapX: field.mapX ?? null,
    mapY: field.mapY ?? null,
    capacity: null,
    sortOrder: index,
    createdAt: field.updatedAt,
    updatedAt: field.updatedAt,
  }));
}

export function getSessionsForVenueOnDate<TSession extends VenueModeSessionLike, TField extends VenueModeFieldLike>(
  fields: TField[],
  sessions: TSession[],
  date = new Date(),
): TSession[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const fieldIds = new Set(fields.map((field) => field.id));

  return sessions
    .filter((session) => {
      const startTime = new Date(session.startTime);
      return fieldIds.has(session.fieldId) && startTime >= start && startTime < end;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export function buildScheduleBySurface<TSurface extends VenueModePlaySurfaceLike, TSession extends VenueModeSessionLike>(
  surfaces: TSurface[],
  sessionsToday: TSession[],
): VenueModeScheduleGroupLike<TSession, TSurface["status"]>[] {
  const grouped = surfaces.map((surface) => {
    const sessions = sessionsToday.filter((session) => {
      if (session.playSurfaceId) {
        return session.playSurfaceId === surface.id;
      }
      return surface.fieldId ? session.fieldId === surface.fieldId : session.fieldId === surface.parentFieldId;
    });

    return {
      fieldId: surface.fieldId,
      sessions,
      status: surface.status,
      surfaceCode: surface.surfaceCode,
      surfaceId: surface.id,
      surfaceName: surface.name,
    };
  });

  const assignedSessionIds = new Set(grouped.flatMap((group) => group.sessions.map((session) => session.id)));
  const unassignedGroups = sessionsToday
    .filter((session) => !assignedSessionIds.has(session.id))
    .map((session) => ({
      fieldId: session.fieldId,
      sessions: [session],
      status: "open" as TSurface["status"],
      surfaceCode: null,
      surfaceId: `session:${session.id}`,
      surfaceName: "Unmapped surface",
    }));

  return [...grouped, ...unassignedGroups]
    .filter((group) => group.sessions.length > 0 || surfaces.length > 0)
    .sort((a, b) => a.surfaceName.localeCompare(b.surfaceName));
}

export function buildVenueModeQrEntries(
  venue: VenueModeVenueLike,
  fields: VenueModeFieldLike[],
  surfaces: VenueModePlaySurfaceLike[],
  endpoints: VenueModeEndpointLike[],
  urls: {
    fieldUrl: (fieldId: string) => string;
    venueDisplayUrl: (venueId: string) => string;
    venueUrl: (venueId: string) => string;
  },
): VenueModeQrEntryLike[] {
  const fieldById = new Map(fields.map((field) => [field.id, field]));

  return [
    { entryType: "venue", label: `${venue.name} public venue page`, url: urls.venueUrl(venue.id) },
    { entryType: "venue_display", label: `${venue.name} venue display board`, url: urls.venueDisplayUrl(venue.id) },
    ...fields.map((field) => ({
      entryType: field.layoutRole === "parent" ? "parent_field" as const : "field" as const,
      fieldId: field.id,
      label: `${field.name} public field page`,
      url: urls.fieldUrl(field.id),
    })),
    ...surfaces
      .filter((surface) => surface.fieldId || surface.parentFieldId)
      .map((surface) => {
        const targetFieldId = surface.fieldId ?? surface.parentFieldId ?? "";
        const parentFieldName = targetFieldId ? fieldById.get(targetFieldId)?.name : null;
        const labelPrefix = surface.layoutRole === "split_child" && parentFieldName ? `${parentFieldName} ${surface.name}` : surface.name;
        return {
          entryType: "play_surface" as const,
          fieldId: targetFieldId,
          label: `${labelPrefix} play surface page`,
          playSurfaceId: surface.id,
          url: `${urls.fieldUrl(targetFieldId)}?surface=${surface.id}`,
        };
      }),
    ...endpoints
      .filter((endpoint) => endpoint.endpointType === "qr_entry" && endpoint.endpointUrl)
      .map((endpoint) => ({
        endpointId: endpoint.id,
        entryType: "endpoint" as const,
        label: endpoint.endpointLabel,
        url: endpoint.endpointUrl ?? "",
      })),
  ];
}

export function buildVenueModeLiveStatus(surfaces: VenueModePlaySurfaceLike[], sessionsToday: VenueModeSessionLike[]) {
  return {
    totalSurfaces: surfaces.length,
    openSurfaces: surfaces.filter((surface) => surface.status === "open").length,
    activeSurfaces: surfaces.filter((surface) => surface.status === "active").length,
    delayedSurfaces: surfaces.filter((surface) => surface.status === "delayed").length,
    closedSurfaces: surfaces.filter((surface) => surface.status === "closed").length,
    maintenanceSurfaces: surfaces.filter((surface) => surface.status === "maintenance").length,
    activeSessions: sessionsToday.filter((session) => session.status === "active" || session.gameStatus === "active").length,
  };
}
