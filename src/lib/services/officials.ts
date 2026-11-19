import { randomBytes } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { canManageSchedule, type AccessContext } from "@/lib/access/capabilities";
import { PermissionDeniedError } from "./identity";
import { getSession } from "./sessions";
import { getField } from "./fields";
import { getVenue } from "./venues";
import { sendViaResend } from "./alert-delivery";
import { classifyOfficialDelivery, officialConflictLabel, officialSessionScopeError, type OfficialDeliveryStatus } from "./officials-safety";

// Umpire/official assignment: the last unstaffed game-day role. Assign an
// official to a session, flag double-bookings, and hand them a tokenized
// confirm link (the scorekeeper-link pattern — no account needed).

export type SessionOfficial = {
  id: string;
  sessionId: string;
  officialName: string;
  officialEmail: string | null;
  officialPhone: string | null;
  role: string;
  status: "assigned" | "confirmed" | "declined";
  confirmToken: string;
};

type OfficialRow = {
  id: string;
  session_id: string;
  official_name: string;
  official_email: string | null;
  official_phone?: string | null;
  role: string;
  status: string;
  confirm_token: string;
};

async function requireOfficialSessionMutation(ctx: AccessContext | null, sessionId: string) {
  if (!canManageSchedule(ctx)) {
    throw new PermissionDeniedError("You do not have permission to manage officials.");
  }
  const session = await getSession(sessionId);
  if (!session) throw new PermissionDeniedError("That game no longer exists.");
  if (ctx?.scopeType === "tournament") {
    const tournamentScopeError = officialSessionScopeError(ctx, session, null);
    if (tournamentScopeError) throw new PermissionDeniedError(tournamentScopeError);
    return session;
  }
  const field = await getField(session.fieldId);
  const venue = field ? await getVenue(field.venueId) : null;
  const scopeError = officialSessionScopeError(ctx, session, venue);
  if (scopeError) throw new PermissionDeniedError(scopeError);
  return session;
}

function mapOfficial(row: OfficialRow): SessionOfficial {
  return {
    id: row.id,
    sessionId: row.session_id,
    officialName: row.official_name,
    officialEmail: row.official_email,
    officialPhone: row.official_phone ?? null,
    role: row.role,
    status: row.status === "confirmed" || row.status === "declined" ? row.status : "assigned",
    confirmToken: row.confirm_token,
  };
}

export async function getOfficialsForSessions(sessionIds: string[]): Promise<SessionOfficial[]> {
  if (!sessionIds.length) return [];
  let supabase: ReturnType<typeof getSupabaseAdminClient>;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return [];
  }
  const { data, error } = await supabase.from("session_officials").select("*").in("session_id", sessionIds);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOfficial);
}

async function conflictScopeError(
  actor: AccessContext | null,
  session: { field_id: string; tournament_id: string | null },
): Promise<string | null> {
  if (actor?.scopeType === "tournament") {
    return officialSessionScopeError(actor, { tournamentId: session.tournament_id }, null);
  }
  const field = await getField(session.field_id);
  const venue = field ? await getVenue(field.venueId) : null;
  return officialSessionScopeError(actor, { tournamentId: session.tournament_id }, venue);
}

// Double-booking check: same email on another session overlapping ±2h.
// A conflict outside the actor's scope remains useful, but its tenant-owned
// session and team labels must not cross the service-role read boundary.
export async function findOfficialConflicts(
  officialEmail: string,
  sessionId: string,
  actor: AccessContext | null,
): Promise<string[]> {
  if (!officialEmail) return [];
  const supabase = getSupabaseAdminClient();
  const { data: target } = await supabase.from("sessions").select("start_time").eq("id", sessionId).maybeSingle();
  if (!target?.start_time) return [];
  const start = new Date(target.start_time).getTime();
  const { data: others } = await supabase
    .from("session_officials")
    .select("session_id,official_email")
    .eq("official_email", officialEmail.toLowerCase())
    .neq("session_id", sessionId)
    .neq("status", "declined");
  const otherIds = (others ?? []).map((row) => row.session_id);
  if (!otherIds.length) return [];
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id,title,home_team,away_team,start_time,field_id,tournament_id")
    .in("id", otherIds);
  const overlapping = (sessions ?? [])
    .filter((session) => Math.abs(new Date(session.start_time).getTime() - start) < 2 * 60 * 60 * 1000);
  const labels = await Promise.all(overlapping.map(async (session) => officialConflictLabel(
    session.title || session.home_team + " vs " + session.away_team,
    await conflictScopeError(actor, session),
  )));
  return [...new Set(labels)];
}

export async function assignOfficial(
  input: { sessionId: string; name: string; email?: string | null; phone?: string | null; role?: string; confirmBaseUrl: string },
  actor: AccessContext | null,
): Promise<{ official: SessionOfficial; conflicts: string[]; confirmUrl: string; deliveryStatus: OfficialDeliveryStatus }> {
  await requireOfficialSessionMutation(actor, input.sessionId);
  const supabase = getSupabaseAdminClient();
  const email = (input.email || "").trim().toLowerCase() || null;
  const phone = (input.phone || "").trim().slice(0, 32) || null;
  const conflicts = email ? await findOfficialConflicts(email, input.sessionId, actor) : [];
  const token = randomBytes(16).toString("hex");
  const { data, error } = await supabase
    .from("session_officials")
    .insert({
      session_id: input.sessionId,
      official_name: input.name.trim().slice(0, 120),
      official_email: email,
      official_phone: phone,
      role: (input.role || "umpire").trim().slice(0, 40),
      confirm_token: token,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const confirmUrl = input.confirmBaseUrl.replace(/\/$/, "") + "/officiate/" + token;
  let deliveryStatus: OfficialDeliveryStatus = "not_requested";
  if (email) {
    const { data: session } = await supabase.from("sessions").select("title,home_team,away_team,start_time").eq("id", input.sessionId).maybeSingle();
    const label = session?.title || (session ? session.home_team + " vs " + session.away_team : "a game");
    const when = session?.start_time ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.start_time)) : "";
    const delivery = await sendViaResend(email, "[GameDay OS] You're assigned: " + label, "You've been assigned as " + (input.role || "umpire") + " for " + label + (when ? " on " + when : "") + ".\n\nConfirm or decline here: " + confirmUrl);
    deliveryStatus = classifyOfficialDelivery(email, delivery);
  }
  return { official: mapOfficial(data), conflicts, confirmUrl, deliveryStatus };
}

export async function removeOfficial(id: string, actor: AccessContext | null): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error: loadError } = await supabase.from("session_officials").select("session_id").eq("id", id).maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!existing?.session_id) throw new PermissionDeniedError("That official assignment no longer exists.");
  await requireOfficialSessionMutation(actor, existing.session_id);
  const { error } = await supabase.from("session_officials").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function respondToAssignment(token: string, response: "confirmed" | "declined"): Promise<{ label: string; when: string } | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const supabase = getSupabaseAdminClient();
  const { data: official } = await supabase.from("session_officials").select("*").eq("confirm_token", token).maybeSingle();
  if (!official) return null;
  await supabase.from("session_officials").update({ status: response, updated_at: new Date().toISOString() }).eq("id", official.id);
  const { data: session } = await supabase.from("sessions").select("title,home_team,away_team,start_time").eq("id", official.session_id).maybeSingle();
  return {
    label: session?.title || (session ? session.home_team + " vs " + session.away_team : "the game"),
    when: session?.start_time ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.start_time)) : "",
  };
}

export async function getAssignment(token: string): Promise<{ officialName: string; role: string; status: string; label: string; when: string; fieldName: string } | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  let supabase: ReturnType<typeof getSupabaseAdminClient>;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return null;
  }
  const { data: official } = await supabase.from("session_officials").select("*").eq("confirm_token", token).maybeSingle();
  if (!official) return null;
  const { data: session } = await supabase.from("sessions").select("title,home_team,away_team,start_time,field_id").eq("id", official.session_id).maybeSingle();
  let fieldName = "";
  if (session?.field_id) {
    const { data: field } = await supabase.from("fields").select("name").eq("id", session.field_id).maybeSingle();
    fieldName = field?.name || "";
  }
  return {
    officialName: official.official_name,
    role: official.role,
    status: official.status,
    label: session?.title || (session ? session.home_team + " vs " + session.away_team : "the game"),
    when: session?.start_time ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.start_time)) : "",
    fieldName,
  };
}
