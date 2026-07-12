import { createClient } from "@supabase/supabase-js";
import type { Alert } from "@/lib/types";

// Fans an alert out to followers who left an email. Sending uses Resend when
// RESEND_API_KEY is configured; otherwise deliveries are recorded as
// skipped_no_provider so the audience and the pipeline are still visible.

const MAX_DELIVERIES_PER_ALERT = 500;

type FollowerRow = { id: string; email: string | null; field_id: string };

export function dedupeFollowerEmails(rows: FollowerRow[]) {
  const seen = new Set<string>();
  const result: Array<{ followId: string; email: string }> = [];
  for (const row of rows) {
    const email = (row.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) continue;
    seen.add(email);
    result.push({ followId: row.id, email });
  }
  return result.slice(0, MAX_DELIVERIES_PER_ALERT);
}

export function buildAlertEmail(alert: Pick<Alert, "title" | "message" | "alertType" | "alertPriority">, venueName: string) {
  const prefix = alert.alertPriority === "urgent" ? "[URGENT] " : alert.alertType === "weather" ? "[Weather] " : "";
  return {
    subject: prefix + alert.title + " — " + venueName,
    text: alert.message + "\n\n— " + venueName + " via GameDay OS\nYou get these because you followed a field at this venue."
  };
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sendViaResend(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false as const, provider: "", error: "" };
  const from = process.env.ALERT_EMAIL_FROM || "GameDay OS Alerts <onboarding@resend.dev>";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { sent: false as const, provider: "resend", error: ("HTTP " + response.status + " " + detail).slice(0, 300) };
    }
    return { sent: true as const, provider: "resend", error: "" };
  } catch (error) {
    return { sent: false as const, provider: "resend", error: error instanceof Error ? error.message.slice(0, 300) : "send failed" };
  }
}

/**
 * Best-effort fan-out; never throws. Called after an alert is created.
 * Field-scoped alerts notify that field's followers; venue/tournament/global
 * alerts notify followers of every field at the venue.
 */
export async function deliverAlertToFollowers(alert: Alert): Promise<{ audience: number; sent: number }> {
  try {
    const supabase = getAdminClient();
    if (!supabase) return { audience: 0, sent: 0 };

    let fieldIds: string[] = [];
    if (alert.alertScope === "field" && alert.fieldId) {
      fieldIds = [alert.fieldId];
    } else {
      const { data: fields } = await supabase.from("fields").select("id").eq("venue_id", alert.venueId);
      fieldIds = (fields ?? []).map((field) => field.id);
    }
    if (!fieldIds.length) return { audience: 0, sent: 0 };

    const { data: follows } = await supabase
      .from("follows")
      .select("id,email,field_id")
      .in("field_id", fieldIds)
      .not("email", "is", null);
    const recipients = dedupeFollowerEmails((follows ?? []) as FollowerRow[]);
    if (!recipients.length) return { audience: 0, sent: 0 };

    const { data: venue } = await supabase.from("venues").select("name").eq("id", alert.venueId).maybeSingle();
    const email = buildAlertEmail(alert, venue?.name || "Your venue");

    let sent = 0;
    const rows = [];
    for (const recipient of recipients) {
      const result = await sendViaResend(recipient.email, email.subject, email.text);
      if (result.sent) sent += 1;
      rows.push({
        alert_id: alert.id,
        follow_id: recipient.followId,
        email: recipient.email,
        status: result.sent ? "sent" : result.provider ? "failed" : "skipped_no_provider",
        provider: result.provider,
        error: result.error,
        sent_at: result.sent ? new Date().toISOString() : null
      });
    }
    await supabase.from("alert_deliveries").insert(rows);
    return { audience: recipients.length, sent };
  } catch (error) {
    console.error("Alert delivery fan-out failed", error);
    return { audience: 0, sent: 0 };
  }
}
