import { getField } from "@/lib/services/fields";
import { getSessionsByFieldId } from "@/lib/services/sessions";
import { getVenue } from "@/lib/services/venues";
import type { Field, Session, Venue } from "@/lib/types";

type FieldPageProps = {
  params: Promise<{
    fieldId: string;
  }>;
};

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getActiveOrNextSession(sessions: Session[]) {
  return sessions.find((session) => session.status === "active") ?? sessions.find((session) => session.status === "scheduled") ?? null;
}

function getUpcomingSessions(sessions: Session[]) {
  return sessions.filter((session) => session.status === "scheduled").slice(0, 5);
}

function SessionCard({ session }: { session: Session }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black">{session.title}</h3>
          <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
            {session.homeTeam} vs. {session.awayTeam}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatSessionTime(session.startTime)}</p>
        </div>
        <span className="w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
          {session.status}
        </span>
      </div>
    </article>
  );
}

export default async function PublicFieldPage({ params }: FieldPageProps) {
  const { fieldId } = await params;
  let field: Field | null = null;
  let venue: Venue | null = null;
  let sessions: Session[] = [];
  let errorMessage: string | null = null;

  try {
    field = await getField(fieldId);
    const [venueResult, sessionResults] = await Promise.all([
      field ? getVenue(field.venueId) : Promise.resolve(null),
      getSessionsByFieldId(fieldId),
    ]);
    venue = venueResult;
    sessions = sessionResults;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load field page.";
  }

  const currentSession = getActiveOrNextSession(sessions);
  const upcomingSessions = getUpcomingSessions(sessions);

  return (
    <section className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-sm">
          <header className="bg-[var(--black-soft)] p-5 text-white sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">{venue?.name ?? "GameDay OS"}</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-black leading-none">{field?.name ?? "Field unavailable"}</h1>
                <p className="mt-3 text-sm font-semibold text-white/70">{field?.sportType ?? "Sport type unavailable"}</p>
              </div>
              <span className="w-fit rounded-md bg-white/15 px-2 py-1 text-xs font-bold">{field?.status ?? "Pending"}</span>
            </div>
          </header>

          <main className="grid gap-4 p-4 sm:p-5">
            {errorMessage ? (
              <section className="rounded-lg border border-red-200 bg-red-50 p-5">
                <h2 className="text-lg font-black text-red-950">Unable to load field page</h2>
                <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
              </section>
            ) : null}

            <section className="rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">Current session</p>
              {currentSession ? (
                <div className="mt-4">
                  <h2 className="text-2xl font-black">{currentSession.title}</h2>
                  <p className="mt-2 text-base font-black">
                    {currentSession.homeTeam} vs. {currentSession.awayTeam}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatSessionTime(currentSession.startTime)}</p>
                  <span className="mt-4 inline-flex rounded-md bg-white px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                    {currentSession.status}
                  </span>
                </div>
              ) : (
                <div className="mt-4 rounded-lg bg-white p-4">
                  <h2 className="text-xl font-black">No session scheduled</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    There is no active or upcoming session listed for this field yet.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="text-lg font-black">Upcoming sessions</h2>
              <div className="mt-4 grid gap-3">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session) => <SessionCard key={session.id} session={session} />)
                ) : (
                  <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
                    No session scheduled.
                  </p>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </section>
  );
}
