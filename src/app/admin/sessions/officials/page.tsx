import Link from "next/link";
import { publicErrorMessage } from "@/lib/public-error";
import { getSessions } from "@/lib/services/sessions";
import { getOfficialsForSessions, type SessionOfficial } from "@/lib/services/officials";
import { removeOfficialAction } from "./actions";
import { AssignOfficialForm } from "./assign-form";

export const dynamic = "force-dynamic";

const STATUS_CLASSES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  assigned: "bg-amber-100 text-amber-900",
};

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function OfficialsPage() {
  let errorMessage: string | null = null;
  let upcoming: Array<{ id: string; label: string; when: string; startTime: string }> = [];
  let officials: SessionOfficial[] = [];

  try {
    const sessions = await getSessions();
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    upcoming = sessions
      .filter((session) => new Date(session.startTime).getTime() >= cutoff)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 100)
      .map((session) => ({ id: session.id, label: session.title || session.homeTeam + " vs. " + session.awayTeam, when: formatWhen(session.startTime), startTime: session.startTime }));
    officials = await getOfficialsForSessions(upcoming.map((session) => session.id));
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load officials.");
  }

  const officialsBySession = new Map<string, SessionOfficial[]>();
  for (const official of officials) {
    const list = officialsBySession.get(official.sessionId) ?? [];
    list.push(official);
    officialsBySession.set(official.sessionId, list);
  }
  const unstaffed = upcoming.filter((session) => !(officialsBySession.get(session.id) ?? []).some((official) => official.status !== "declined"));

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Schedule &amp; Games</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Umpires &amp; officials</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        Assign officials to upcoming games. Each assignment gets a confirm link (emailed when an
        address is given); double-bookings within two hours are flagged.
      </p>
      <p className="mt-2 text-sm">
        <Link className="font-bold text-[var(--accent-strong)] underline" href="/admin/sessions">
          Back to Schedule &amp; Games
        </Link>
      </p>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6">
          <AssignOfficialForm sessions={upcoming} />

          <section className="rounded-lg border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-black">Coverage ({unstaffed.length} unstaffed of {upcoming.length} upcoming)</h2>
            <div className="mt-3 grid gap-3">
              {upcoming.map((session) => {
                const assigned = officialsBySession.get(session.id) ?? [];
                return (
                  <article key={session.id} className="rounded-lg border border-[var(--line)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-black">{session.label}</h3>
                        <p className="text-sm text-[var(--muted)]">{session.when}</p>
                      </div>
                      {assigned.length === 0 ? <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-black uppercase text-red-800">Unstaffed</span> : null}
                    </div>
                    {assigned.length ? (
                      <ul className="mt-3 grid gap-2 text-sm">
                        {assigned.map((official) => (
                          <li key={official.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              <span className="font-bold">{official.officialName}</span> · {official.role}
                              {official.officialEmail ? " · " + official.officialEmail : ""}
                              <span className={"ml-2 rounded-md px-2 py-0.5 text-xs font-black uppercase " + (STATUS_CLASSES[official.status] ?? STATUS_CLASSES.assigned)}>
                                {official.status}
                              </span>
                            </span>
                            <form action={removeOfficialAction}>
                              <input name="id" type="hidden" value={official.id} />
                              <button className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-bold" type="submit">
                                Remove
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
