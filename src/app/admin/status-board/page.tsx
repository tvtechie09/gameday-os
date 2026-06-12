import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getPublicFieldUrl } from "@/lib/public-url";
import { filterAlertsForFieldPage, getActiveAlerts } from "@/lib/services/alerts";
import { fieldStatuses, getFields, getFieldStatusClass, getFieldStatusLabel, readFieldStatus, updateFieldStatus } from "@/lib/services/fields";
import { getResources } from "@/lib/services/resources";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import type { Alert, Field, Resource, Session, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

type StatusBoardField = {
  field: Field;
  activeSession: Session | null;
  nextSession: Session | null;
  activeAlertsCount: number;
  activeResourcesCount: number;
};

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load status board ${label}`, error);
    return [];
  }
}

function isSessionActive(session: Session, now: Date) {
  if (session.status === "active" || session.gameStatus === "active") {
    return true;
  }

  if (!session.endTime) {
    return false;
  }

  const timestamp = now.getTime();
  return new Date(session.startTime).getTime() <= timestamp && timestamp <= new Date(session.endTime).getTime();
}

function isSessionUpcoming(session: Session, now: Date) {
  return session.status === "scheduled" && new Date(session.startTime).getTime() > now.getTime();
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatScore(session: Session) {
  return `${session.homeTeam} ${session.homeScore} - ${session.awayScore} ${session.awayTeam}`;
}

function getFieldSessions(field: Field, sessions: Session[]) {
  return sessions
    .filter((session) => session.fieldId === field.id)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function buildVenueBoard({
  activeAlerts,
  fields,
  resources,
  sessions,
  venues,
}: {
  activeAlerts: Alert[];
  fields: Field[];
  resources: Resource[];
  sessions: Session[];
  venues: Venue[];
}) {
  const now = new Date();

  return venues.map((venue) => {
    const venueFields = fields.filter((field) => field.venueId === venue.id);
    const boardFields: StatusBoardField[] = venueFields.map((field) => {
      const fieldSessions = getFieldSessions(field, sessions);
      const activeSession = fieldSessions.find((session) => isSessionActive(session, now)) ?? null;
      const nextSession = fieldSessions.find((session) => isSessionUpcoming(session, now)) ?? null;
      const activeAlertsCount = filterAlertsForFieldPage({
        alerts: activeAlerts,
        venueId: venue.id,
        fieldId: field.id,
        tournamentId: activeSession?.tournamentId ?? nextSession?.tournamentId,
      }).length;
      const activeResourcesCount = resources.filter(
        (resource) => resource.status === "active" && resource.venueId === venue.id && (!resource.fieldId || resource.fieldId === field.id),
      ).length;

      return {
        field,
        activeSession,
        nextSession,
        activeAlertsCount,
        activeResourcesCount,
      };
    });

    return {
      venue,
      fields: boardFields,
    };
  });
}

function getFieldCardClass(field: Field) {
  if (field.status === "delayed") {
    return "border-amber-300 bg-amber-50";
  }

  if (field.status === "closed") {
    return "border-red-300 bg-red-50";
  }

  if (field.status === "maintenance") {
    return "border-slate-300 bg-slate-100";
  }

  if (field.status === "active") {
    return "border-green-500 bg-green-50";
  }

  return "border-[var(--line)] bg-white";
}

export default async function StatusBoardPage() {
  async function updateStatusAction(formData: FormData) {
    "use server";

    const fieldId = String(formData.get("field_id") ?? "").trim();
    const status = readFieldStatus(String(formData.get("status") ?? "open"));

    if (!fieldId) {
      return;
    }

    try {
      await updateFieldStatus(fieldId, status);
      revalidatePath("/admin/status-board");
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin/fields");
      revalidatePath(`/fields/${fieldId}`);
    } catch (error) {
      console.error("Failed to update status board field status", error);
    }
  }

  const [venues, fields, sessions, activeAlerts, resources] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Session>("sessions", getSessions),
    safeLoad<Alert>("active alerts", getActiveAlerts),
    safeLoad<Resource>("resources", getResources),
  ]);

  const board = buildVenueBoard({
    activeAlerts,
    fields,
    resources,
    sessions,
    venues,
  });
  const totalFields = fields.length;
  const issueFields = fields.filter((field) => field.status === "delayed" || field.status === "closed" || field.status === "maintenance").length;
  const liveFields = board.reduce((total, group) => total + group.fields.filter((item) => item.activeSession).length, 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Status board</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Venue-wide field status</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            A tablet-friendly command view for every field, live session, alert, resource, and quick status update.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
          <div className="rounded-lg border border-[var(--line)] bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Fields</p>
            <p className="mt-1 text-2xl font-black">{totalFields}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-800">Live</p>
            <p className="mt-1 text-2xl font-black text-green-800">{liveFields}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900">Needs attention</p>
            <p className="mt-1 text-2xl font-black text-amber-900">{issueFields}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8">
        {board.map((group) => (
          <section key={group.venue.id}>
            <div className="flex flex-col gap-2 border-b border-[var(--line)] pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">{group.venue.name}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{group.venue.address || "No address listed"}</p>
              </div>
              <p className="text-sm font-black text-[var(--muted)]">{group.fields.length} fields</p>
            </div>

            {group.fields.length > 0 ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.fields.map((item) => (
                  <article key={item.field.id} className={`rounded-lg border p-4 shadow-sm ${getFieldCardClass(item.field)}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-black">{item.field.name}</h3>
                        <span className={`mt-2 inline-flex w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(item.field.status)}`}>
                          {getFieldStatusLabel(item.field.status)}
                        </span>
                      </div>
                      <Link href={getPublicFieldUrl(item.field.id)} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-black">
                        Public
                      </Link>
                    </div>

                    {(item.field.status === "delayed" || item.field.status === "closed" || item.field.status === "maintenance") ? (
                      <div className="mt-4 rounded-lg border border-current/20 bg-white/70 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.12em]">Attention</p>
                        <p className="mt-1 text-sm font-semibold">This field status is visible as a warning banner on the public field page.</p>
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Current/active session</p>
                        {item.activeSession ? (
                          <>
                            <p className="mt-1 text-base font-black">{item.activeSession.title}</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatScore(item.activeSession)}</p>
                          </>
                        ) : (
                          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">No active session</p>
                        )}
                      </div>

                      <div className="rounded-lg bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Next session</p>
                        {item.nextSession ? (
                          <>
                            <p className="mt-1 text-base font-black">{item.nextSession.title}</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatTime(item.nextSession.startTime)}</p>
                          </>
                        ) : (
                          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">No upcoming session</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Alerts</p>
                          <p className="mt-1 text-xl font-black">{item.activeAlertsCount}</p>
                        </div>
                        <div className="rounded-lg bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Resources</p>
                          <p className="mt-1 text-xl font-black">{item.activeResourcesCount}</p>
                        </div>
                      </div>
                    </div>

                    <form action={updateStatusAction} className="mt-4 grid gap-2 rounded-lg border border-[var(--line)] bg-white p-3 sm:grid-cols-[1fr_auto]">
                      <input name="field_id" type="hidden" value={item.field.id} />
                      <label className="grid gap-1">
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Quick status</span>
                        <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={item.field.status} name="status">
                          {fieldStatuses.map((status) => (
                            <option key={status} value={status}>
                              {getFieldStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="min-h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white sm:self-end" type="submit">
                        Update
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">
                No fields have been added for this venue.
              </p>
            )}
          </section>
        ))}

        {board.length === 0 ? (
          <section className="rounded-lg border border-[var(--line)] bg-white p-6">
            <h2 className="text-xl font-black">No venues or fields yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Create venues and fields before using the status board.</p>
            <Link href="/admin/fields/new" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-white">
              Create field
            </Link>
          </section>
        ) : null}
      </div>
    </section>
  );
}
