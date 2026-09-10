export type FriendlyNetworkFailure = "network_unavailable" | "request_timeout" | "permission_denied" | "state_changed" | "server_unavailable" | "upload_failed";

export function browserIsOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function offlineMutationMessage(subject = "change"): string | null {
  return browserIsOffline() ? `Connection lost. The ${subject} was not saved. Reconnect and try again.` : null;
}

export function friendlyNetworkMessage(category: FriendlyNetworkFailure): string {
  if (category === "network_unavailable") return "Connection lost. Reconnect and try again.";
  if (category === "request_timeout") return "This is taking too long. Check your connection and try again.";
  if (category === "permission_denied") return "You don't have permission to make this change.";
  if (category === "state_changed") return "Someone else changed this item. The latest information has been loaded.";
  if (category === "upload_failed") return "The record is safe, but the photo did not upload. Try the photo again.";
  return "GameDay is temporarily unavailable. Try again.";
}
