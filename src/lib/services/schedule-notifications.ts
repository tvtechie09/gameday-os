import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
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

type TeamScheduleAudience = { stateId: string; guardianPersonIds: string[]; guardianEmails: string[] };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function teamScheduleAudiencesForSeasons(supabase: NonNullable<ReturnType<typeof getAdminClient>>, seasonIds: string[]): Promise<TeamScheduleAudience[]> {
  const wanted = new Set(seasonIds.filter(Boolean));
  if (!wanted.size) return [];
  const snapshotIds = (process.env.GAMEDAY_TEAM_STATE_IDS || "gameday-team-staging,staging").split(",").map((id) => id.trim()).filter(Boolean);
  const { data: snapshots } = await supabase.from("gameday_os_state_snapshots").select("id,state").in("id", snapshotIds);
  const audiences: TeamScheduleAudience[] = [];
  for (const snapshot of snapshots ?? []) {
    const profile = (snapshot.state as { teamProfile?: TeamSnapshotProfile })?.teamProfile;
    if (!profile) continue;
    const playerIds = new Set((profile.memberships ?? []).filter((m) => wanted.has(m.teamSeasonId) && m.rosterStatus === "active").map((m) => m.playerId));
    if (!playerIds.size) continue;
    const guardianIds = new Set<string>();
    (profile.players ?? []).filter((player) => playerIds.has(player.id)).forEach((player) => (player.guardianPersonIds ?? []).forEach((id) => guardianIds.add(id)));
    (profile.guardianRelationships ?? []).filter((rel) => playerIds.has(rel.playerId)).forEach((rel) => guardianIds.add(rel.guardianPersonId));
    const emails = new Set<string>();
    (profile.people ?? []).filter((person) => guardianIds.has(person.id)).forEach((person) => {
      const email = (person.email || "").trim().toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
    });
    if (guardianIds.size) audiences.push({ stateId: snapshot.id, guardianPersonIds: Array.from(guardianIds), guardianEmails: Array.from(emails) });
  }
  return audiences;
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
  organizationId?: string | null;
  teamSeasonId?: string | null;
  sourceProvider?: string | null;
  sourceEventId?: string | null;
}): Promise<{ summary: string; recipients: number } | null> {
  try {
    const timeChanged = new Date(input.previousStartTime).getTime() !== new Date(input.startTime).getTime();
    const fieldChanged = input.previousFieldId !== input.fieldId;
    if (!timeChanged && !fieldChanged) return null;

    const supabase = getAdminClient();
    let fieldNames = new Map<string, string>();
    let teamSeasonId = input.teamSeasonId || "";
    let organizationId = input.organizationId || "";
    let sourceProvider = input.sourceProvider || "";
    let sourceEventId = input.sourceEventId || "";
    if (supabase) {
      const [{ data: fields }, { data: sessionRow }] = await Promise.all([
        supabase.from("fields").select("id,name").in("id", [input.fieldId, input.previousFieldId]),
        supabase.from("sessions").select("organization_id,gdt_team_season_id,external_source,external_source_id").eq("id", input.sessionId).maybeSingle()
      ]);
      fieldNames = new Map((fields ?? []).map((field: { id: string; name: string }) => [field.id, field.name]));
      const linkedSession = sessionRow as { organization_id?: string | null; gdt_team_season_id?: string | null; external_source?: string | null; external_source_id?: string | null } | null;
      teamSeasonId ||= linkedSession?.gdt_team_season_id || "";
      organizationId ||= linkedSession?.organization_id || "";
      sourceProvider ||= linkedSession?.external_source || "";
      sourceEventId ||= linkedSession?.external_source_id || "";
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

    const [audiences, followResult] = await Promise.all([
      teamSeasonId ? teamScheduleAudiencesForSeasons(supabase, [teamSeasonId]) : Promise.resolve([] as TeamScheduleAudience[]),
      supabase
        .from("follows")
        .select("email,follow_type,session_id,field_id")
        .not("email", "is", null)
        .or("session_id.eq." + input.sessionId + ",and(field_id.eq." + input.fieldId + ",follow_type.eq.field)")
    ]);
    const followEmails = (followResult.data ?? [])
      .map((row: { email: string | null }) => (row.email || "").trim().toLowerCase())
      .filter((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    const guardianEmails = audiences.flatMap((audience) => audience.guardianEmails);
    const recipients = Array.from(new Set([...guardianEmails, ...followEmails])).slice(0, MAX_RECIPIENTS);

    for (const audience of audiences) {
      await persistFamilyScheduleChange(supabase, {
        audience,
        eventId: input.sessionId,
        fieldChanged,
        label,
        newField: fieldNames.get(input.fieldId) || input.fieldId,
        newStartTime: input.startTime,
        organizationId,
        previousField: fieldNames.get(input.previousFieldId) || input.previousFieldId,
        previousStartTime: input.previousStartTime,
        sourceEventId,
        sourceProvider,
        summary,
        teamSeasonId,
        timeChanged,
      });
    }
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

async function persistFamilyScheduleChange(
  supabase: NonNullable<ReturnType<typeof getAdminClient>>,
  input: {
    audience: TeamScheduleAudience;
    eventId: string;
    fieldChanged: boolean;
    label: string;
    newField: string;
    newStartTime: string;
    organizationId: string;
    previousField: string;
    previousStartTime: string;
    sourceEventId: string;
    sourceProvider: string;
    summary: string;
    teamSeasonId: string;
    timeChanged: boolean;
  },
) {
  const fingerprint = createHash("sha256").update(JSON.stringify([
    input.audience.stateId,
    input.eventId,
    input.previousStartTime,
    input.newStartTime,
    input.previousField,
    input.newField,
  ])).digest("hex").slice(0, 24);
  const changeType = input.fieldChanged && !input.timeChanged ? "relocated" : input.timeChanged && !input.fieldChanged ? "rescheduled" : "updated";
  const items = [
    ...(input.timeChanged ? [{ fieldName: "start_time", previousValue: input.previousStartTime, newValue: input.newStartTime }] : []),
    ...(input.fieldChanged ? [{ fieldName: "field", previousValue: input.previousField, newValue: input.newField }] : []),
  ];
  const change = {
    groupKey: `venue-provider:${input.eventId}:${fingerprint}`,
    stateId: input.audience.stateId,
    organizationId: input.organizationId || undefined,
    teamSeasonId: input.teamSeasonId,
    eventSource: "venue",
    eventId: input.eventId,
    sourceProvider: input.sourceProvider || undefined,
    sourceEventId: input.sourceEventId || undefined,
    changeType,
    priority: "team",
    title: input.label,
    summary: input.summary,
    changedAt: new Date().toISOString(),
    reason: input.sourceProvider ? `Schedule refreshed from ${input.sourceProvider}.` : "Venue schedule updated.",
    items,
  };
  const { data: changeId, error: changeError } = await supabase.rpc("persist_schedule_change_event", { p_change: change });
  if (changeError) throw new Error("Family schedule change failed: " + changeError.message);
  if (typeof changeId !== "string") throw new Error("Family schedule change returned an invalid identifier.");
  const markGenerated = () => supabase.from("gdt_schedule_change_events").update({ notification_status: "generated" }).eq("id", changeId);

  const personIds = Array.from(new Set(input.audience.guardianPersonIds.filter(Boolean)));
  if (!personIds.length) { await markGenerated(); return; }
  const uuidIds = personIds.filter(isUuid);
  const [personMembers, authMembers] = await Promise.all([
    supabase.from("gdt_family_members").select("family_id,auth_user_id").in("person_id", personIds).eq("status", "active"),
    uuidIds.length ? supabase.from("gdt_family_members").select("family_id,auth_user_id").in("auth_user_id", uuidIds).eq("status", "active") : Promise.resolve({ data: [], error: null }),
  ]);
  if (personMembers.error) throw new Error("Family recipients failed: " + personMembers.error.message);
  if (authMembers.error) throw new Error("Family auth recipients failed: " + authMembers.error.message);
  const members = Array.from(new Map([...(personMembers.data ?? []), ...(authMembers.data ?? [])].map((member) => [`${member.family_id}:${member.auth_user_id}`, member])).values());
  const familyIds = Array.from(new Set(members.map((member) => member.family_id)));
  if (!familyIds.length) { await markGenerated(); return; }
  const { data: familyScopes, error: familyScopeError } = await supabase.from("gdt_family_participants").select("family_id").eq("state_id", input.audience.stateId).eq("status", "active").in("family_id", familyIds);
  if (familyScopeError) throw new Error("Family tenant scope failed: " + familyScopeError.message);
  const allowedFamilies = new Set((familyScopes ?? []).map((row) => row.family_id));
  const recipients = members.filter((member) => allowedFamilies.has(member.family_id) && isUuid(member.auth_user_id));
  if (!recipients.length) { await markGenerated(); return; }
  const authUserIds = recipients.map((member) => member.auth_user_id);
  const { data: preferences, error: preferenceError } = await supabase.from("gdt_family_notification_preferences").select("auth_user_id,enabled").in("auth_user_id", authUserIds).eq("category", "team").eq("channel", "in_app");
  if (preferenceError) throw new Error("Family notification preferences failed: " + preferenceError.message);
  const preferenceByUser = new Map((preferences ?? []).map((preference) => [preference.auth_user_id, Boolean(preference.enabled)]));
  const rows = recipients.filter((recipient) => preferenceByUser.get(recipient.auth_user_id) !== false).map((recipient) => ({
    family_id: recipient.family_id,
    recipient_auth_user_id: recipient.auth_user_id,
    category: "team",
    notification_type: "schedule_change",
    title: changeType === "relocated" ? "Game moved" : changeType === "rescheduled" ? "Game rescheduled" : "Game updated",
    message: input.summary,
    state_id: input.audience.stateId,
    event_source: "venue",
    event_id: input.eventId,
    team_season_id: input.teamSeasonId,
    context_label: input.label,
    schedule_change_id: changeId,
    action_url: `/family/changes/${encodeURIComponent(changeId)}`,
    dedupe_key: `schedule-change:${changeId}`,
  }));
  if (rows.length) {
    const { error: notificationError } = await supabase.from("gdt_family_notifications").upsert(rows, { onConflict: "recipient_auth_user_id,dedupe_key", ignoreDuplicates: true });
    if (notificationError) throw new Error("Family notification creation failed: " + notificationError.message);
  }
  await markGenerated();
}
