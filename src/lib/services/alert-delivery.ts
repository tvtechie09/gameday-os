import { createClient } from "@supabase/supabase-js";
import type { Alert } from "@/lib/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getOrganizationDataScope } from "./organization-data-scope";
import { buildAlertEmail, dedupeFollowerEmails, shouldDeliverAlert, type AlertDeliverySummary } from "./alert-delivery-core";

export { buildAlertEmail, dedupeFollowerEmails, shouldDeliverAlert } from "./alert-delivery-core";

// Fans an alert out to followers who left an email. Sending uses Resend when
// RESEND_API_KEY is configured; otherwise deliveries are recorded as
// skipped_no_provider so the audience and the pipeline are still visible.

const MAX_DELIVERIES_PER_ALERT = 500;

type FollowerRow = {
  id: string;
  email: string | null;
  email_enabled?: boolean;
  field_id: string;
  manage_token?: string;
  notification_level?: string;
};

function publicAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function sendViaResend(to: string, subject: string, text: string) {
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

type TeamSnapshotProfile = {
  people?: Array<{ id: string; email?: string }>;
  players?: Array<{ id: string; guardianPersonIds?: string[] }>;
  memberships?: Array<{ playerId: string; teamSeasonId: string; rosterStatus: string }>;
  guardianRelationships?: Array<{ guardianPersonId: string; playerId: string }>;
};

/**
 * Guardians of players on team seasons linked (gdt_team_season_id) to
 * sessions on the affected fields. Because a parent is the child's guardian,
 * venue alerts about their child's field reach them automatically — no
 * follow/opt-in required. Reads the shared GameDay Team snapshot.
 */
 
export async function guardianEmailsForFields(supabase: any, fieldIds: string[]): Promise<string[]> {
  try {
    const { data: linked } = await supabase
      .from("sessions")
      .select("gdt_team_season_id")
      .in("field_id", fieldIds)
      .not("gdt_team_season_id", "is", null);
    const seasonIds = new Set((linked ?? []).map((row: { gdt_team_season_id: string | null }) => row.gdt_team_season_id).filter(Boolean) as string[]);
    if (!seasonIds.size) return [];
    const snapshotIds = (process.env.GAMEDAY_TEAM_STATE_IDS || "gameday-team-staging,staging").split(",").map((id) => id.trim()).filter(Boolean);
    const { data: snapshots } = await supabase.from("gameday_os_state_snapshots").select("id,state").in("id", snapshotIds);
    const emails = new Set<string>();
    for (const snapshot of snapshots ?? []) {
      const profile = (snapshot.state as { teamProfile?: TeamSnapshotProfile })?.teamProfile;
      if (!profile) continue;
      const playerIds = new Set((profile.memberships ?? []).filter((m) => seasonIds.has(m.teamSeasonId) && m.rosterStatus === "active").map((m) => m.playerId));
      if (!playerIds.size) continue;
      const guardianIds = new Set<string>();
      (profile.players ?? []).filter((player) => playerIds.has(player.id)).forEach((player) => (player.guardianPersonIds ?? []).forEach((id) => guardianIds.add(id)));
      (profile.guardianRelationships ?? []).filter((rel) => playerIds.has(rel.playerId)).forEach((rel) => guardianIds.add(rel.guardianPersonId));
      (profile.people ?? []).filter((person) => guardianIds.has(person.id)).forEach((person) => {
        const email = (person.email || "").trim().toLowerCase();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
      });
    }
    return Array.from(emails).slice(0, MAX_DELIVERIES_PER_ALERT);
  } catch (error) {
    console.error("Guardian lookup for alert delivery failed", error);
    return [];
  }
}

/**
 * Best-effort fan-out; never throws. Called after an alert is created.
 * Field-scoped alerts notify that field's followers; venue/tournament/global
 * alerts notify followers of every field at the venue. Team guardians of
 * linked sessions on affected fields are included automatically.
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
      .select("id,email,email_enabled,field_id,manage_token,notification_level")
      .in("field_id", fieldIds)
      .eq("email_enabled", true)
      .not("email", "is", null);
    const eligibleFollows = ((follows ?? []) as FollowerRow[]).filter((follow) => shouldDeliverAlert(
      follow.notification_level === "critical_only" ? "critical_only" : "all_updates",
      alert,
    ));
    const followerRecipients = dedupeFollowerEmails(eligibleFollows, MAX_DELIVERIES_PER_ALERT);
    // Team-linked guardians do not have Venue preferences yet. Send only
    // safety/closure alerts until Team exposes an explicit opt-in.
    const guardianEmails = shouldDeliverAlert("critical_only", alert)
      ? await guardianEmailsForFields(supabase, fieldIds)
      : [];
    const seen = new Set(followerRecipients.map((item) => item.email));
    const recipients = [
      ...followerRecipients,
      ...guardianEmails.filter((email) => !seen.has(email)).map((email) => ({ followId: "", email, manageToken: null })),
    ].slice(0, MAX_DELIVERIES_PER_ALERT);
    if (!recipients.length) return { audience: 0, sent: 0 };

    const { data: venue } = await supabase.from("venues").select("name").eq("id", alert.venueId).maybeSingle();
    let sent = 0;
    const rows = [];
    for (const recipient of recipients) {
      const manageUrl = recipient.manageToken && publicAppUrl()
        ? `${publicAppUrl()}/follow/${recipient.manageToken}`
        : undefined;
      const email = buildAlertEmail(alert, venue?.name || "Your venue", manageUrl);
      const result = await sendViaResend(recipient.email, email.subject, email.text);
      if (result.sent) sent += 1;
      rows.push({
        alert_id: alert.id,
        follow_id: recipient.followId || null,
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

export async function getAlertDeliverySummary(): Promise<AlertDeliverySummary> {
  let supabase: ReturnType<typeof getSupabaseAdminClient>;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return { audience: 0, failed: 0, skippedNoProvider: 0, sent: 0 };
  }

  const scope = await getOrganizationDataScope();
  let alertIds: string[] | null = null;
  if (scope) {
    if (scope.venueIds.size === 0) return { audience: 0, failed: 0, skippedNoProvider: 0, sent: 0 };
    const { data: alerts, error: alertError } = await supabase
      .from("alerts")
      .select("id")
      .in("venue_id", [...scope.venueIds]);
    if (alertError) throw new Error(alertError.message);
    alertIds = (alerts ?? []).map((alert) => alert.id);
    if (alertIds.length === 0) return { audience: 0, failed: 0, skippedNoProvider: 0, sent: 0 };
  }

  let query = supabase.from("alert_deliveries").select("status").order("created_at", { ascending: false }).limit(1000);
  if (alertIds) query = query.in("alert_id", alertIds);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const statuses = data ?? [];
  return {
    audience: statuses.length,
    failed: statuses.filter((row) => row.status === "failed").length,
    skippedNoProvider: statuses.filter((row) => row.status === "skipped_no_provider").length,
    sent: statuses.filter((row) => row.status === "sent").length,
  };
}
