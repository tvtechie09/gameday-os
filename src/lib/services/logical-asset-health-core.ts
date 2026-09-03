import type { VenueAsset } from "@/lib/types";

export type LogicalAssetHealth = {
  status: "online" | "degraded" | "offline" | "unknown" | "not_configured";
  label: string;
  message: string;
  lastSeenMinutes: number | null;
};

export function logicalAssetHealth(asset: VenueAsset, now = Date.now()): LogicalAssetHealth {
  const lastSeenMs = asset.lastSeenAt ? Date.parse(asset.lastSeenAt) : NaN;
  const lastSeenMinutes = Number.isNaN(lastSeenMs) ? null : Math.max(0, Math.round((now - lastSeenMs) / 60_000));
  let status: LogicalAssetHealth["status"] = asset.connectionHealth
    ?? (asset.status === "healthy" ? "online" : asset.status === "offline" ? "offline" : asset.status === "maintenance_needed" ? "degraded" : "unknown");
  if (status === "online" && lastSeenMinutes !== null && lastSeenMinutes > 10) status = "offline";
  else if (status === "online" && lastSeenMinutes !== null && lastSeenMinutes > 2) status = "degraded";
  if (asset.status === "offline") status = "offline";
  else if (asset.status === "maintenance_needed" && status !== "offline") status = "degraded";

  if (status === "online") return { status, label: "Online", message: "Working normally.", lastSeenMinutes };
  if (status === "degraded") return { status, label: "Needs attention", message: asset.healthMessage || "Reporting is intermittent. Check power and connection when practical.", lastSeenMinutes };
  if (status === "offline") return { status, label: "Offline", message: asset.healthMessage || "Not responding. Check power and the local connection.", lastSeenMinutes };
  if (status === "not_configured") return { status, label: "Manual / not connected", message: "This asset is operated locally and does not report health.", lastSeenMinutes };
  return { status: "unknown", label: "Not yet verified", message: asset.healthMessage || "No health report has been received yet.", lastSeenMinutes };
}
