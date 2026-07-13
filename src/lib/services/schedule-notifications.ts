import { createClient } from "@supabase/supabase-js";
import { sendViaResend } from "./alert-delivery";
import { recordSessionEvent } from "./session-events";

// Schedule-change notifications: when a linked game is rescheduled or moved
// to another field, the guardians of that team season and anyone following
// the game/field with an email hear about it automatically. Best-effort:
// never blocks the schedule edit; without RESEND_API_KEY only the session
// event is recorded.

const MAX_RECIPIENTS = 300;

type TeamSnapshotProfile = {
  people?: Array<{ id: string; email?: string }>;
  players?: Array<{ id: string; guardianPersonIds?: string[] }>;
  memberships?: Array<{ playerId: string; teamSeasonId: string; rosterStatus: string }>;
  guardianRelationships?: Array<{ guardianPersonId: string; playerId: string }>;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function guardianEmailsForSeasons(supabase: NonNullable<ReturnType<typeof getAdminClient>>, seasonIds: string[]): Promise<string[]> {
  const wanted = new Set(seasonIds.filter(Boolean));
  if (!wanted.size) return [];
  const snapshotIds = (process.env.GAMEDAY_TEAM_STATE_IDS || "gameday-team-staging,staging").split(",").map((id) => id.trim()).filter(Boolean);
  const { data: snapshots } = await supabase.from("gameday_os_state_snapshots").select("id,state").in("id", snapshotIds);
  const emails = new Set<string>();
  for (const snapshot of snapshots ?? []) {
    const profile = (snapshot.state as { teamProfile?: TeamSnapshotProfile })?.teamProfile;
    if (!profile) continue;
    const playerIds = new Set((profile.memberships ?? []).filter((m) => wanted.has(m.teamSeasonId) && m.rosterStatus === "active").map((m) => m.playerId));
    if (!playerIds.size) continue;
    const guardianIds = new Set<string>();
    (profile.players ?? []).filter((player) => playerIds.has(player.id)).forEach((player) => (player.guardianPersonIds ?? []).forEach((id) => guardianIds.add(id)));
    (profile.guardianRelationships ?? []).filter((rel) => playerIds.has(rel.playerId)).forEach((rel) => guardianIds.add(rel.guardianPersonId));
    (profile.people ?? []).filter((person) => guardianIds.has(person.id)).forEach((person) => {
      const email = (person.email || "").trim().toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
    });
  }
  return Array.from(emails);
}

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export async function notifyScheduleChange(input: {
  sessionId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  fieldId: string;
  startTime: string;
  previousStartTime: string;
  previousFieldId: string;
}): Promise<{ summary: string; recipients: number } | null> {
  try {
    const timeChanged = new Date(input.previousStartTime).getTime() !== new Date(input.startTime).getTime();
    const fieldChanged = input.previousFieldId !== input.fieldId;
    if (!timeChanged && !fieldChanged) return null;

    const supabase = getAdminClient();
    let fieldNames = new Map<string, string>();
    let teamSeasonId = "";
    if (supabase) {
      const [{ data: fields }, { data: sessionRow }] = await Promise.all([
        supabase.from("fields").select("id,name").in("id", [input.fieldId, input.previousFieldId]),
        supabase.from("sessions").select("gdt_team_season_id").eq("id", input.sessionId).maybeSingle()
      ]);
      fieldNames = new Map((fields ?? []).map((field: { id: string; name: string }) => [field.id, field.name]));
      teamSeasonId = (sessionRow as { gdt_team_season_id?: string | null } | null)?.gdt_team_season_id || "";
    }

    const label = input.title || input.homeTeam + " vs " + input.awayTeam;
    const changes: string[] = [];
    if (timeChanged) changes.push("new time " + formatWhen(input.startTime) + " (was " + formatWhen(input.previousStartTime) + ")");
    if (fieldChanged) changes.push("moved to " + (fieldNames.get(input.fieldId) || "another field") + " (was " + (fieldNames.get(input.previousFieldId) || "previous field") + ")");
    const summary = "Schedule change: " + label + " — " + changes.join("; ") + ".";

    await recordSessionEvent({
      eventMessage: summary,
      eventType: "operations_update",
      sessionId: input.sessionId,
    }).catch(() => undefined);

    if (!supabase) return { summary, recipients: 0 };

    const [guardianEmails, followResult] = await Promise.all([
      teamSeasonId ? guardianEmailsForSeasons(supabase, [teamSeasonId]) : Promise.resolve([] as string[]),
      supabase
        .from("follows")
        .select("email,follow_type,session_id,field_id")
        .not("email", "is", null)
        .or("session_id.eq." + input.sessionId + ",and(field_id.eq." + input.fieldId + ",follow_type.eq.field)")
    ]);
    const followEmails = (followResult.data ?? [])
      .map((row: { email: string | null }) => (row.email || "").trim().toLowerCase())
      .filter((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    const recipients = Array.from(new Set([...guardianEmails, ...followEmails])).slice(0, MAX_RECIPIENTS);
    const subject = "[Schedule change] " + label;
    const text = summary + "\n\nCheck the field page for live status and updates.";
    for (const email of recipients) {
      await sendViaResend(email, subject, text).catch(() => undefined);
    }
    return { summary, recipients: recipients.length };
  } catch (error) {
    console.error("Schedule-change notification failed", error);
    return null;
  }
}
