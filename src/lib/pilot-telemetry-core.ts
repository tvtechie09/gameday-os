export const pilotEventNames = [
  "pilot_home_opened",
  "pilot_today_opened",
  "pilot_fields_opened",
  "pilot_schedule_opened",
  "pilot_venue_status_opened",
  "pilot_announcements_opened",
  "pilot_work_orders_opened",
  "pilot_field_opened",
  "pilot_field_action_started",
  "pilot_field_action_completed",
  "pilot_field_action_failed",
  "pilot_disruption_review_opened",
  "pilot_move_game_started",
  "pilot_move_game_completed",
  "pilot_move_game_failed",
  "pilot_work_order_opened",
  "pilot_work_order_created",
  "pilot_work_order_claimed",
  "pilot_work_order_acknowledged",
  "pilot_work_order_started",
  "pilot_work_order_resolved",
  "pilot_work_order_failed",
  "pilot_announcement_flow_opened",
  "pilot_announcement_published",
  "pilot_announcement_failed",
] as const;

export type PilotEventName = (typeof pilotEventNames)[number];
export type PilotDurationBucket = "under_10_sec" | "10_30_sec" | "30_60_sec" | "over_60_sec";
export type PilotViewportCategory = "phone" | "tablet" | "desktop";
export type PilotWorkflowSource = "direct" | "fields" | "today" | "schedule" | "work_orders" | "field_disruption" | "game_detail";
export type PilotOutcome = "completed" | "denied" | "conflict" | "failed";

const eventSet = new Set<string>(pilotEventNames);
const sources = new Set<PilotWorkflowSource>(["direct", "fields", "today", "schedule", "work_orders", "field_disruption", "game_detail"]);
const outcomes = new Set<PilotOutcome>(["completed", "denied", "conflict", "failed"]);
const durations = new Set<PilotDurationBucket>(["under_10_sec", "10_30_sec", "30_60_sec", "over_60_sec"]);
const viewports = new Set<PilotViewportCategory>(["phone", "tablet", "desktop"]);

export type PilotEventContext = {
  actionType?: string;
  durationBucket?: PilotDurationBucket;
  outcome?: PilotOutcome;
  source?: PilotWorkflowSource;
  viewport?: PilotViewportCategory;
};

export function isPilotEventName(value: unknown): value is PilotEventName {
  return typeof value === "string" && eventSet.has(value);
}

export function durationBucket(elapsedMs: number): PilotDurationBucket {
  if (elapsedMs < 10_000) return "under_10_sec";
  if (elapsedMs < 30_000) return "10_30_sec";
  if (elapsedMs < 60_000) return "30_60_sec";
  return "over_60_sec";
}

export function viewportCategory(width: number): PilotViewportCategory {
  if (width < 640) return "phone";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function outcomeForFailureCode(code: string | undefined): PilotOutcome {
  if (code === "permission") return "denied";
  if (code === "conflict" || code === "missing") return "conflict";
  return "failed";
}

export function pageEventForPath(pathname: string): PilotEventName | null {
  if (pathname === "/admin") return "pilot_home_opened";
  if (pathname === "/today") return "pilot_today_opened";
  if (/^\/admin\/fields\/work-orders\/[^/]+$/.test(pathname)) return "pilot_work_order_opened";
  if (pathname === "/admin/fields/work-orders") return "pilot_work_orders_opened";
  if (/^\/admin\/fields\/[^/]+\/disruption(?:\/|$)/.test(pathname)) return "pilot_disruption_review_opened";
  if (pathname === "/admin/fields") return "pilot_fields_opened";
  if (/^\/admin\/fields\/[^/]+$/.test(pathname)) return "pilot_field_opened";
  if (pathname === "/admin/sessions") return "pilot_schedule_opened";
  if (pathname === "/admin/operations-center") return "pilot_venue_status_opened";
  if (pathname === "/admin/alerts") return "pilot_announcements_opened";
  if (pathname === "/admin/alerts/new") return "pilot_announcement_flow_opened";
  return null;
}

export function workflowSource(previousPath: string | null): PilotWorkflowSource {
  if (!previousPath) return "direct";
  if (previousPath === "/today") return "today";
  if (previousPath.startsWith("/admin/fields/work-orders")) return "work_orders";
  if (previousPath.includes("/disruption")) return "field_disruption";
  if (previousPath.startsWith("/admin/fields")) return "fields";
  if (previousPath.startsWith("/admin/sessions/")) return "game_detail";
  if (previousPath.startsWith("/admin/sessions")) return "schedule";
  return "direct";
}

export function sanitizePilotContext(value: unknown): PilotEventContext {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const sanitized: PilotEventContext = {};
  if (typeof input.source === "string" && sources.has(input.source as PilotWorkflowSource)) sanitized.source = input.source as PilotWorkflowSource;
  if (typeof input.outcome === "string" && outcomes.has(input.outcome as PilotOutcome)) sanitized.outcome = input.outcome as PilotOutcome;
  if (typeof input.durationBucket === "string" && durations.has(input.durationBucket as PilotDurationBucket)) sanitized.durationBucket = input.durationBucket as PilotDurationBucket;
  if (typeof input.viewport === "string" && viewports.has(input.viewport as PilotViewportCategory)) sanitized.viewport = input.viewport as PilotViewportCategory;
  if (typeof input.actionType === "string" && /^[a-z_]{1,40}$/.test(input.actionType)) sanitized.actionType = input.actionType;
  return sanitized;
}
