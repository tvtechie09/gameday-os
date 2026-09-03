export type AlertDeliverySummary = {
  audience: number;
  failed: number;
  skippedNoProvider: number;
  sent: number;
};

type AlertForDelivery = {
  alertPriority: "low" | "normal" | "high" | "urgent";
  alertType: "info" | "weather" | "delay" | "emergency" | "parking" | "concession" | "field_closure";
};

type FollowerForDelivery = {
  email: string | null;
  field_id: string;
  id: string;
  manage_token?: string;
};

export function shouldDeliverAlert(notificationLevel: "critical_only" | "all_updates", alert: AlertForDelivery) {
  if (notificationLevel === "all_updates") return true;
  return alert.alertPriority === "high"
    || alert.alertPriority === "urgent"
    || alert.alertType === "emergency"
    || alert.alertType === "field_closure";
}

export function dedupeFollowerEmails(rows: FollowerForDelivery[], limit = 500) {
  const seen = new Set<string>();
  const result: Array<{ email: string; followId: string; manageToken: string | null }> = [];
  for (const row of rows) {
    const email = (row.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) continue;
    seen.add(email);
    result.push({ followId: row.id, email, manageToken: row.manage_token ?? null });
  }
  return result.slice(0, limit);
}

export function buildAlertEmail(
  alert: AlertForDelivery & { message: string; title: string },
  venueName: string,
  manageUrl?: string,
) {
  const prefix = alert.alertPriority === "urgent" ? "[URGENT] " : alert.alertType === "weather" ? "[Weather] " : "";
  return {
    subject: prefix + alert.title + " — " + venueName,
    text: alert.message
      + "\n\n— " + venueName + " via GameDay OS"
      + "\nYou get these because you followed a field at this venue."
      + (manageUrl ? "\nManage or stop emails: " + manageUrl : ""),
  };
}
