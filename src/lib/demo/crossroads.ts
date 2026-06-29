export type CrossroadsHotspotType =
  | "field"
  | "play_surface"
  | "parking"
  | "gate"
  | "concession"
  | "batting_cage"
  | "landmark"
  | "social"
  | "championship"
  | "hospitality"
  | "playground"
  | "concourse"
  | "seating";

export type CrossroadsGameStatus = "scheduled" | "warmups" | "live" | "delayed" | "final" | "maintenance";
export type CrossroadsEquipmentType = "scoreboard" | "speaker" | "camera_security" | "network" | "lights";
export type CrossroadsReadinessKey = "teamsArrived" | "umpireArrived" | "scorekeeperReady" | "scoreboardReady" | "fieldReady";

export interface CrossroadsHotspot {
  id: string;
  label: string;
  type: CrossroadsHotspotType;
  x: number;
  y: number;
  description: string;
  route: string;
  imageUrl?: string | null;
  status?: CrossroadsGameStatus | "open" | "busy" | "closed" | "restricted";
}

export interface CrossroadsField {
  id: string;
  number: number;
  name: string;
  status: CrossroadsGameStatus | "open";
  mapX: number;
  mapY: number;
  imageUrl?: string | null;
  surfaces: string[];
}

export interface CrossroadsPlaySurface {
  id: string;
  code: string;
  name: string;
  parentFieldId: string;
  layoutName: string;
  status: CrossroadsGameStatus | "open";
  mapX: number;
  mapY: number;
}

export interface CrossroadsGame {
  id: string;
  fieldId: string;
  surfaceId: string;
  surfaceCode: string;
  title: string;
  startTime: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  inning: string;
  status: CrossroadsGameStatus;
  nextGame?: string;
  behindMinutes: number;
  readiness: Record<CrossroadsReadinessKey, boolean>;
}

export interface CrossroadsEquipmentEndpoint {
  id: string;
  fieldId: string;
  surfaceId?: string;
  type: CrossroadsEquipmentType;
  label: string;
  providerKey: "manual" | "future_provider";
  status: "not_configured" | "configured" | "testing" | "active" | "offline";
}

export interface CrossroadsQrEntry {
  id: string;
  label: string;
  type: "venue" | "parking" | "field" | "play_surface" | "concession" | "maintenance";
  route: string;
}

export const crossroadsVenue = {
  id: "crossroads",
  name: "Wintrust Crossroads Sports Complex",
  city: "New Lenox",
  state: "IL",
  location: "New Lenox, IL",
  heroImageUrl: "/demo/crossroads-map.png",
  mapImageUrl: "/demo/crossroads-map.png",
  fallbackMapLabel: "Crossroads demo map placeholder",
};

export const crossroadsParkingLots: CrossroadsHotspot[] = [
  {
    description: "Recommended family parking for the Field 6B demo path.",
    id: "south-lot",
    label: "South Lot",
    route: "/venue/crossroads/parking/south-lot",
    status: "open",
    type: "parking",
    x: 53,
    y: 88,
  },
  {
    description: "Primary north-side parking area near main complex circulation.",
    id: "north-lot",
    label: "North Lot",
    route: "/venue/crossroads/parking/north-lot",
    status: "open",
    type: "parking",
    x: 31,
    y: 28,
  },
  {
    description: "West and southwest parking area for overflow and field access.",
    id: "west-southwest-lot",
    label: "West/Southwest Lot",
    route: "/venue/crossroads/parking/west-southwest-lot",
    status: "busy",
    type: "parking",
    x: 27,
    y: 69,
  },
];

export const crossroadsAmenities: CrossroadsHotspot[] = [
  { description: "Primary pedestrian entry point for the demo venue.", id: "main-gate", label: "Main Gate", route: "/venue/crossroads", status: "open", type: "gate", x: 38, y: 39 },
  { description: "Demo social destination and landmark near central circulation.", id: "beer-garden", label: "Beer Garden", route: "/venue/crossroads", status: "open", type: "social", x: 44, y: 46 },
  { description: "Flagship championship presentation area for finals, sponsor moments, and demo storytelling.", id: "championship-field", imageUrl: "/demo/crossroads-map.png", label: "Championship Field", route: "/venue/crossroads", status: "open", type: "championship", x: 67, y: 41 },
  { description: "Hospitality building concept for directors, sponsors, VIP check-in, and tournament operations hospitality.", id: "chill-zone", label: "Chill Zone / Hospitality", route: "/venue/crossroads", status: "open", type: "hospitality", x: 43, y: 46 },
  { description: "Family area concept for younger siblings and between-game downtime.", id: "playground-family-area", label: "Playground / Family Area", route: "/venue/crossroads", status: "open", type: "playground", x: 42, y: 55 },
  { description: "Primary pedestrian spine connecting Main Gate, concessions, fields, and family areas.", id: "main-concourse", label: "Main Concourse", route: "/venue/crossroads", status: "open", type: "concourse", x: 68, y: 52 },
  { description: "Demo picnic and seating area for families between games.", id: "picnic-seating-north", label: "Picnic / Seating North", route: "/venue/crossroads", status: "open", type: "seating", x: 57, y: 57 },
  { description: "Demo picnic and seating area near the south concession corridor.", id: "picnic-seating-south", label: "Picnic / Seating South", route: "/venue/crossroads", status: "open", type: "seating", x: 72, y: 76 },
  { description: "North concession point between Fields 1 and 2.", id: "concession-north", label: "Concession North", route: "/venue/crossroads/concession/north", status: "open", type: "concession", x: 68, y: 27 },
  { description: "South concession point between Fields 6 and 7.", id: "concession-south", label: "Concession South", route: "/venue/crossroads/concession/south", status: "open", type: "concession", x: 71, y: 79 },
  { description: "North batting cage area beside Field 1.", id: "batting-cages-north", label: "Batting Cages North", route: "/venue/crossroads", status: "open", type: "batting_cage", x: 51, y: 16 },
  { description: "East batting cage area beside Field 2.", id: "batting-cages-east", label: "Batting Cages East", route: "/venue/crossroads", status: "open", type: "batting_cage", x: 90, y: 23 },
  { description: "Non-navigable water landmark. Do not route families through this area.", id: "storm-pond-east", label: "Storm Water Pond East", route: "/venue/crossroads", status: "restricted", type: "landmark", x: 94, y: 78 },
  { description: "Non-navigable water landmark. Do not route families through this area.", id: "storm-pond-south", label: "Storm Water Pond South", route: "/venue/crossroads", status: "restricted", type: "landmark", x: 24, y: 93 },
];

const fieldCoordinates: Array<[number, number, number]> = [
  [1, 60, 18],
  [2, 76, 18],
  [3, 58, 41],
  [4, 77, 41],
  [5, 48, 67],
  [6, 64, 67],
  [7, 79, 67],
  [8, 80, 90],
  [9, 65, 90],
];

export const crossroadsSurfaceCodesByField: Record<number, string[]> = {
  1: ["1A", "1B"],
  2: ["2A", "2B", "2C", "2D"],
  3: ["3A", "3B", "3C"],
  4: ["4A", "4B", "4C"],
  5: ["5A", "5B"],
  6: ["6A", "6B"],
  7: ["7A", "7B"],
  8: ["8A", "8B"],
  9: ["9A", "9B"],
};

export const crossroadsFields: CrossroadsField[] = fieldCoordinates.map(([number, x, y]) => ({
  id: `field-${number}`,
  mapX: x,
  mapY: y,
  imageUrl: number === 6 ? "/demo/crossroads-map.png" : null,
  name: `Field ${number}`,
  number,
  status: number === 4 ? "delayed" : number === 8 ? "maintenance" : "open",
  surfaces: crossroadsSurfaceCodesByField[number]?.map((code) => `surface-${code.toLowerCase()}`) ?? [],
}));

export const crossroadsPlaySurfaces: CrossroadsPlaySurface[] = crossroadsFields.flatMap((field) => {
  const codes = crossroadsSurfaceCodesByField[field.number] ?? [];
  return codes.map((code, index) => ({
    code,
    id: `surface-${code.toLowerCase()}`,
    layoutName: `${field.name} split layout`,
    mapX: field.mapX + (index - (codes.length - 1) / 2) * 4,
    mapY: field.mapY + 5,
    name: `${field.name} ${code}`,
    parentFieldId: field.id,
    status: code === "4C" ? "delayed" : code === "6B" ? "live" : field.status,
  }));
});

export const crossroadsGames: CrossroadsGame[] = [
  game("g-1a", "1A", "8:30 AM", "scheduled", "Falcons", "Storm", 0, 0, "Pregame", 0, "Hawks vs Wolves"),
  game("g-1b", "1B", "9:00 AM", "warmups", "Blue Sox", "Rockets", 0, 0, "Warmups", 0, "Mustangs vs Knights"),
  game("g-2a", "2A", "9:30 AM", "final", "Lions", "Eagles", 6, 4, "Final", 0, "Bandits vs Thunder"),
  game("g-2b", "2B", "10:00 AM", "scheduled", "Coyotes", "Sharks", 0, 0, "Pregame", 0, "Stars vs Jets"),
  game("g-3a", "3A", "10:30 AM", "live", "Celtics", "Panthers", 3, 2, "Top 4", 0, "Warriors vs Hawks"),
  game("g-3b", "3B", "11:00 AM", "scheduled", "Warriors", "Hawks", 0, 0, "Pregame", 0, "Titans vs Bulldogs"),
  game("g-3c", "3C", "11:30 AM", "scheduled", "Titans", "Bulldogs", 0, 0, "Pregame", 0, "Rebels vs Aces"),
  game("g-4a", "4A", "12:00 PM", "delayed", "Rangers", "Aces", 1, 1, "Bottom 2", 20, "Chargers vs Bears"),
  game("g-4c", "4C", "12:30 PM", "delayed", "Chargers", "Bears", 0, 0, "Delay", 35, "Comets vs Cyclones"),
  game("g-5a", "5A", "1:00 PM", "scheduled", "Comets", "Cyclones", 0, 0, "Pregame", 0, "Heat vs Wave"),
  game("g-6a", "6A", "1:30 PM", "warmups", "Heat", "Wave", 0, 0, "Warmups", 0, "Cubs vs Saints"),
  game("g-6b", "6B", "2:00 PM", "live", "Cubs", "Saints", 5, 4, "Bottom 5", 0, "Express vs Crush"),
  game("g-7a", "7A", "2:30 PM", "scheduled", "Express", "Crush", 0, 0, "Pregame", 0, "Spartans vs Outlaws"),
  game("g-8a", "8A", "3:00 PM", "maintenance", "Spartans", "Outlaws", 0, 0, "Maintenance", 0, "Pending field release"),
  game("g-9b", "9B", "3:30 PM", "scheduled", "Pride", "Fire", 0, 0, "Pregame", 0, "Nightcap TBD"),
];

export const crossroadsEquipmentEndpoints: CrossroadsEquipmentEndpoint[] = crossroadsFields.flatMap((field) => [
  equipment(field.id, "scoreboard", "Scoreboard"),
  equipment(field.id, "speaker", "Speaker"),
  equipment(field.id, "camera_security", "Camera/Security"),
  equipment(field.id, "network", "Network"),
  equipment(field.id, "lights", "Lights"),
]);

export const crossroadsQrEntries: CrossroadsQrEntry[] = [
  { id: "qr-venue", label: "Venue Entry", route: "/venue/crossroads", type: "venue" },
  ...crossroadsParkingLots.map((lot) => ({ id: `qr-${lot.id}`, label: lot.label, route: lot.route, type: "parking" as const })),
  ...crossroadsFields.map((field) => ({ id: `qr-${field.id}`, label: field.name, route: `/venue/crossroads/field/${field.number}`, type: "field" as const })),
  ...crossroadsPlaySurfaces.map((surface) => ({ id: `qr-${surface.id}`, label: surface.code, route: `/venue/crossroads/surface/${surface.code}`, type: "play_surface" as const })),
  { id: "qr-concession-north", label: "Concession North", route: "/venue/crossroads/concession/north", type: "concession" },
  { id: "qr-concession-south", label: "Concession South", route: "/venue/crossroads/concession/south", type: "concession" },
];

export const crossroadsFamilyDemo = {
  directions: "Follow the main path from South Lot through Main Gate, then continue northwest to Field 6. Field 6B is the right-side split surface.",
  parkingLotId: "south-lot",
  surfaceCode: "6B",
  walkingTime: "6-8 min",
  welcome: "Welcome to Crossroads",
};

export const crossroadsPermissionScopes = [
  { role: "venue admin", scope: "venue:crossroads", note: "Full venue operations authority." },
  { role: "tournament director", scope: "tournament:crossroads-summer-classic", note: "Tournament schedule and session authority, not infrastructure control." },
  { role: "venue staff", scope: "venue:crossroads", note: "Day-of operations and field status support." },
  { role: "field marshal", scope: "field:field-6", note: "Parent field-level support for Field 6." },
  { role: "scorekeeper", scope: "play_surface:surface-6b", note: "Temporary score access for Field 6B only." },
  { role: "parent/family viewer", scope: "family:demo-family", note: "Read-only family navigation and schedule view." },
];

export const crossroadsHotspots: CrossroadsHotspot[] = [
  ...crossroadsParkingLots,
  ...crossroadsAmenities,
  ...crossroadsFields.map((field) => ({
    description: `${field.name} parent field with ${field.surfaces.length} configured youth play surfaces.`,
    id: field.id,
    label: field.name,
    route: `/venue/crossroads/field/${field.number}`,
    status: field.status,
    type: "field" as const,
    x: field.mapX,
    y: field.mapY,
  })),
  ...crossroadsPlaySurfaces.map((surface) => ({
    description: `${surface.code} schedulable play surface under ${surface.name.split(" ").slice(0, 2).join(" ")}.`,
    id: surface.id,
    label: surface.code,
    route: `/venue/crossroads/surface/${surface.code}`,
    status: surface.status,
    type: "play_surface" as const,
    x: surface.mapX,
    y: surface.mapY,
  })),
];

export function getCrossroadsField(fieldNumber: string | number) {
  return crossroadsFields.find((field) => String(field.number) === String(fieldNumber)) ?? null;
}

export function getCrossroadsSurface(surfaceCode: string) {
  return crossroadsPlaySurfaces.find((surface) => surface.code.toLowerCase() === surfaceCode.toLowerCase()) ?? null;
}

export function getCrossroadsParkingLot(parkingId: string) {
  return crossroadsParkingLots.find((lot) => lot.id === parkingId) ?? null;
}

export function getGamesForField(fieldId: string) {
  return crossroadsGames.filter((gameItem) => gameItem.fieldId === fieldId);
}

export function getGamesForSurface(surfaceCode: string) {
  return crossroadsGames.filter((gameItem) => gameItem.surfaceCode.toLowerCase() === surfaceCode.toLowerCase());
}

export function getFamilyModeContext() {
  const surface = getCrossroadsSurface(crossroadsFamilyDemo.surfaceCode);
  const field = surface ? crossroadsFields.find((item) => item.id === surface.parentFieldId) ?? null : null;
  const parking = getCrossroadsParkingLot(crossroadsFamilyDemo.parkingLotId);
  const games = surface ? getGamesForSurface(surface.code) : [];

  return { field, games, parking, surface, ...crossroadsFamilyDemo };
}

export function getTournamentModeContext() {
  const behindGames = crossroadsGames.filter((gameItem) => gameItem.behindMinutes > 0);
  const delayedGames = crossroadsGames.filter((gameItem) => gameItem.status === "delayed");
  const nextGames = crossroadsGames.filter((gameItem) => gameItem.status === "scheduled" || gameItem.status === "warmups").slice(0, 6);

  return {
    behindGames,
    delayedGames,
    fields: crossroadsFields,
    games: crossroadsGames,
    nextGames,
    surfaces: crossroadsPlaySurfaces,
  };
}

export function getVenueOperationsContext() {
  return {
    activeAlerts: [
      "Weather watch placeholder: monitor west sky and lightning policy.",
      "Announcement center placeholder: championship games may move after 4:00 PM.",
    ],
    delayedFields: crossroadsFields.filter((field) => field.status === "delayed"),
    equipment: crossroadsEquipmentEndpoints,
    fields: crossroadsFields,
    health: {
      activeGames: crossroadsGames.filter((gameItem) => gameItem.status === "live").length,
      delayedGames: crossroadsGames.filter((gameItem) => gameItem.status === "delayed").length,
      equipmentConfigured: crossroadsEquipmentEndpoints.filter((endpoint) => endpoint.status !== "not_configured").length,
      maintenanceFields: crossroadsFields.filter((field) => field.status === "maintenance").length,
      totalFields: crossroadsFields.length,
    },
    maintenanceRequests: getCrossroadsMaintenanceRequests(),
    maintenanceQrEntries: getCrossroadsMaintenanceQrEntries(),
    venue: crossroadsVenue,
  };
}

export function getCrossroadsVenueModeContext() {
  return {
    equipment: crossroadsEquipmentEndpoints,
    fields: crossroadsFields,
    hotspots: crossroadsHotspots,
    mapImageUrl: crossroadsVenue.mapImageUrl,
    qrEntries: crossroadsQrEntries,
    schedules: crossroadsGames,
    surfaces: crossroadsPlaySurfaces,
    venue: crossroadsVenue,
  };
}

function game(
  id: string,
  surfaceCode: string,
  startTime: string,
  status: CrossroadsGameStatus,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  inning: string,
  behindMinutes: number,
  nextGame: string,
): CrossroadsGame {
  const surface = getSurfaceByCodeUnsafe(surfaceCode);
  return {
    awayScore,
    awayTeam,
    behindMinutes,
    fieldId: surface.parentFieldId,
    homeScore,
    homeTeam,
    id,
    inning,
    nextGame,
    readiness: {
      fieldReady: status !== "maintenance",
      scorekeeperReady: status === "live" || status === "final" || status === "warmups",
      scoreboardReady: status !== "maintenance" && status !== "delayed",
      teamsArrived: status !== "scheduled",
      umpireArrived: status === "live" || status === "final",
    },
    startTime,
    status,
    surfaceCode,
    surfaceId: surface.id,
    title: `${homeTeam} vs ${awayTeam}`,
  };
}

function equipment(fieldId: string, type: CrossroadsEquipmentType, label: string): CrossroadsEquipmentEndpoint {
  return {
    fieldId,
    id: `${fieldId}-${type}`,
    label,
    providerKey: "future_provider",
    status: type === "network" ? "configured" : "not_configured",
    type,
  };
}

function getSurfaceByCodeUnsafe(surfaceCode: string) {
  const surface = crossroadsPlaySurfaces.find((item) => item.code === surfaceCode);
  if (!surface) {
    throw new Error(`Missing Crossroads demo surface ${surfaceCode}`);
  }
  return surface;
}

function getCrossroadsMaintenanceRequests() {
  return [
    {
      assignedTo: "Venue Ops",
      category: "trash" as const,
      createdAt: "2026-06-29T09:15:00.000Z",
      description: "Trash bins near the Chill Zone / hospitality building are full before the afternoon games.",
      id: "maintenance-crossroads-trash-chill-zone",
      locationId: "chill-zone",
      locationType: "poi" as const,
      priority: "medium" as const,
      reportedByRole: "venue staff",
      status: "assigned" as const,
      title: "Trash overflow near Chill Zone",
      updatedAt: "2026-06-29T09:22:00.000Z",
      venueId: crossroadsVenue.id,
    },
    {
      assignedTo: "Facilities",
      category: "restroom" as const,
      createdAt: "2026-06-29T10:05:00.000Z",
      description: "South restroom area needs paper towels and soap checked before the next wave of games.",
      id: "maintenance-crossroads-restroom-south",
      locationId: "restroom-south",
      locationType: "poi" as const,
      priority: "high" as const,
      reportedByRole: "field marshal",
      status: "new" as const,
      title: "Restroom supply issue",
      updatedAt: "2026-06-29T10:05:00.000Z",
      venueId: crossroadsVenue.id,
    },
    {
      assignedTo: "Grounds Crew",
      category: "field" as const,
      createdAt: "2026-06-29T11:35:00.000Z",
      description: "Infield dirt on 4B is wet near first base after morning rain. Needs inspection before warmups.",
      id: "maintenance-crossroads-field-4b-wet",
      locationId: "surface-4b",
      locationType: "playSurface" as const,
      priority: "urgent" as const,
      reportedByRole: "tournament director",
      status: "in_progress" as const,
      title: "Field 4B wet infield",
      updatedAt: "2026-06-29T11:48:00.000Z",
      venueId: crossroadsVenue.id,
    },
    {
      assignedTo: "Venue Tech",
      category: "scoreboard" as const,
      createdAt: "2026-06-29T12:10:00.000Z",
      description: "Field 6 scoreboard endpoint is offline in the operations view. Manual scoreboard remains available.",
      externalTicketId: "future-integration-demo-only",
      id: "maintenance-crossroads-field-6-scoreboard",
      locationId: "field-6-scoreboard",
      locationType: "equipment" as const,
      priority: "high" as const,
      reportedByRole: "scorekeeper",
      status: "assigned" as const,
      title: "Scoreboard offline on Field 6",
      updatedAt: "2026-06-29T12:16:00.000Z",
      venueId: crossroadsVenue.id,
    },
  ];
}

function getCrossroadsMaintenanceQrEntries(): CrossroadsQrEntry[] {
  return [
    ...crossroadsFields.map((field) => ({
      id: `qr-maintenance-${field.id}`,
      label: `Maintenance: ${field.name}`,
      route: `/venue/crossroads/maintenance/new?locationType=field&locationId=${field.id}`,
      type: "maintenance" as const,
    })),
    { id: "qr-maintenance-restroom-south", label: "Maintenance: South Restroom", route: "/venue/crossroads/maintenance/new?locationType=poi&locationId=restroom-south", type: "maintenance" },
    { id: "qr-maintenance-concession-south", label: "Maintenance: Concession South", route: "/venue/crossroads/maintenance/new?locationType=poi&locationId=concession-south", type: "maintenance" },
    { id: "qr-maintenance-field-6-scoreboard", label: "Maintenance: Field 6 Scoreboard", route: "/venue/crossroads/maintenance/new?locationType=equipment&locationId=field-6-scoreboard", type: "maintenance" },
  ];
}
