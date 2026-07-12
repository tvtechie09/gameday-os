export type PresentationAudience = "family" | "team" | "tournament" | "venue" | "future";
export type PresentationScenario = "normal" | "weather_delay" | "championship";
export type FutureVisionStatus = "foundation ready" | "future integration" | "partner opportunity" | "roadmap";
export type FutureVisionCategory =
  | "venue operations"
  | "family experience"
  | "tournament operations"
  | "equipment"
  | "safety"
  | "revenue"
  | "integrations"
  | "intelligence";

export interface DemoStateOverride {
  alertMessage?: string | null;
  announcementStatus?: "none" | "pending" | "sent";
  delayedFieldIds?: string[];
  delayedSurfaceCodes?: string[];
  equipmentOfflineIds?: string[];
  field6BLive?: boolean;
  gamesBehindSchedule?: boolean;
  weatherAlertIssued?: boolean;
}

export interface PresentationScene {
  id: string;
  title: string;
  time?: string;
  audience: PresentationAudience;
  description: string;
  narrative?: string;
  visualState?: string;
  view: string;
  demoStateOverride?: DemoStateOverride;
  talkingPoints: string[];
  cta?: {
    label: string;
    href: string;
  };
}

export interface FutureVisionItem {
  title: string;
  description: string;
  category: FutureVisionCategory;
  status: FutureVisionStatus;
  valueToVenue: string;
  valueToFamiliesTournaments?: string;
  requiresPartnerApproval?: boolean;
}

export interface PresentationDemoState {
  scenario: PresentationScenario;
  field6BStatus: "scheduled" | "warmups" | "live" | "delayed" | "final";
  field4Status: "scheduled" | "live" | "delayed" | "maintenance";
  weatherAlertIssued: boolean;
  announcementStatus: "none" | "pending" | "sent";
  gamesBehindSchedule: boolean;
  equipmentPlaceholders: Array<{
    id: string;
    label: string;
    status: "not_configured" | "configured" | "testing" | "active" | "offline";
  }>;
  delayedSurfaceCodes: string[];
  activeAlert: string | null;
}

export interface PresentationModel {
  title: string;
  subtitle: string;
  heroImageUrl: string;
  route: string;
  scenarios: Array<{
    id: PresentationScenario;
    label: string;
    description: string;
  }>;
  scenes: PresentationScene[];
  futureVision: FutureVisionItem[];
  baseState: PresentationDemoState;
}

export function getSceneIndex(scenes: PresentationScene[], sceneId: string) {
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  return index >= 0 ? index : 0;
}

export function getNextSceneIndex(currentIndex: number, sceneCount: number) {
  return Math.min(currentIndex + 1, Math.max(sceneCount - 1, 0));
}

export function getPreviousSceneIndex(currentIndex: number) {
  return Math.max(currentIndex - 1, 0);
}

export function getScenarioLabel(scenario: PresentationScenario) {
  const labels: Record<PresentationScenario, string> = {
    championship: "Championship Sunday",
    normal: "Normal Tournament Day",
    weather_delay: "Weather Delay",
  };

  return labels[scenario];
}

export function applyDemoStateOverride(baseState: PresentationDemoState, override?: DemoStateOverride): PresentationDemoState {
  return {
    ...baseState,
    activeAlert: override?.alertMessage ?? baseState.activeAlert,
    announcementStatus: override?.announcementStatus ?? baseState.announcementStatus,
    delayedSurfaceCodes: override?.delayedSurfaceCodes ? [...override.delayedSurfaceCodes] : [...baseState.delayedSurfaceCodes],
    equipmentPlaceholders: baseState.equipmentPlaceholders.map((endpoint) => ({
      ...endpoint,
      status: override?.equipmentOfflineIds?.includes(endpoint.id) ? "offline" : endpoint.status,
    })),
    field4Status: override?.delayedFieldIds?.includes("field-4") ? "delayed" : baseState.field4Status,
    field6BStatus: override?.field6BLive === true ? "live" : baseState.field6BStatus,
    gamesBehindSchedule: override?.gamesBehindSchedule ?? baseState.gamesBehindSchedule,
    weatherAlertIssued: override?.weatherAlertIssued ?? baseState.weatherAlertIssued,
  };
}

export function applyScenario(baseState: PresentationDemoState, scenario: PresentationScenario): PresentationDemoState {
  if (scenario === "weather_delay") {
    return {
      ...baseState,
      activeAlert: "Weather delay: Fields 4A, 4C, and 6B are paused while staff monitors conditions.",
      announcementStatus: "pending",
      delayedSurfaceCodes: ["4A", "4C", "6B"],
      equipmentPlaceholders: baseState.equipmentPlaceholders.map((endpoint) => endpoint.id.includes("network") ? endpoint : { ...endpoint, status: endpoint.id.includes("field-4") ? "offline" : endpoint.status }),
      field4Status: "delayed",
      field6BStatus: "delayed",
      gamesBehindSchedule: true,
      scenario,
      weatherAlertIssued: true,
    };
  }

  if (scenario === "championship") {
    return {
      ...baseState,
      activeAlert: "Championship Sunday: championship field presentation mode is active.",
      announcementStatus: "sent",
      delayedSurfaceCodes: [],
      equipmentPlaceholders: baseState.equipmentPlaceholders.map((endpoint) => endpoint.id.includes("network") || endpoint.id.includes("scoreboard") ? { ...endpoint, status: "configured" } : endpoint),
      field4Status: "live",
      field6BStatus: "live",
      gamesBehindSchedule: false,
      scenario,
      weatherAlertIssued: false,
    };
  }

  return {
    ...baseState,
    activeAlert: null,
    announcementStatus: "none",
    delayedSurfaceCodes: [...baseState.delayedSurfaceCodes],
    equipmentPlaceholders: baseState.equipmentPlaceholders.map((endpoint) => ({ ...endpoint })),
    field4Status: "scheduled",
    field6BStatus: "live",
    gamesBehindSchedule: false,
    scenario,
    weatherAlertIssued: false,
  };
}

export function getCurrentDemoState(baseState: PresentationDemoState, scenario: PresentationScenario, scene?: PresentationScene) {
  if (scenario === "championship" && scene?.id === "weather-delay") {
    return applyScenario(baseState, scenario);
  }

  return applyDemoStateOverride(applyScenario(baseState, scenario), scene?.demoStateOverride);
}

export function splitFutureVisionItems(items: FutureVisionItem[]) {
  return {
    architected: items.filter((item) => item.status === "foundation ready"),
    future: items.filter((item) => item.status === "future integration" || item.status === "roadmap"),
    partnerApproval: items.filter((item) => item.requiresPartnerApproval || item.status === "partner opportunity"),
  };
}
