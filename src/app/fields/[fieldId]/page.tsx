import { getField } from "@/lib/services/fields";
import { getPublicFieldUrl } from "@/lib/public-url";
import { getSessionsByFieldId } from "@/lib/services/sessions";
import { getSponsorPlacementsForFieldPage } from "@/lib/services/sponsors";
import { getVenue } from "@/lib/services/venues";
import type { Field, Session, SponsorPlacement, Venue } from "@/lib/types";

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

function formatInning(session: Session) {
  return `${session.inningHalf === "top" ? "Top" : "Bottom"} ${session.inning}`;
}

function getGameLinks(session: Session) {
  const links: { label: string; url: string }[] = [];
  const candidates = [
    { label: session.primaryLinkLabel, url: session.primaryLinkUrl },
    { label: session.secondaryLinkLabel, url: session.secondaryLinkUrl },
  ];

  for (const link of candidates) {
    if (link.label && link.url) {
      links.push({ label: link.label, url: link.url });
    }
  }

  return links;
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
          <p className="mt-2 text-base font-black">
            {session.homeTeam} {session.homeScore} · {session.awayTeam} {session.awayScore}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            {formatInning(session)} · Count {session.balls}-{session.strikes} · Outs {session.outs}
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
  const publicFieldUrl = getPublicFieldUrl(fieldId);
  let field: Field | null = null;
  let venue: Venue | null = null;
  let sessions: Session[] = [];
  let sponsorPlacements: SponsorPlacement[] = [];
  let errorMessage: string | null = null;

  try {
    field = await getField(fieldId);
    if (field) {
      const [venueResult, sessionResults] = await Promise.all([
        getVenue(field.venueId),
        getSessionsByFieldId(fieldId),
      ]);
      venue = venueResult;
      sessions = sessionResults;
      sponsorPlacements = await getSponsorPlacementsForFieldPage({
        venueId: field.venueId,
        fieldId,
        sessionId: getActiveOrNextSession(sessionResults)?.id,
      });
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load field page.";
  }

  const currentSession = getActiveOrNextSession(sessions);
  const upcomingSessions = getUpcomingSessions(sessions);
  const gameLinks = currentSession ? getGameLinks(currentSession) : [];

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
              <span className="w-fit rounded-md bg-white/15 px-2 py-1 text-xs font-bold">{field?.status ?? "Not found"}</span>
            </div>
          </header>

          <main className="grid gap-4 p-4 sm:p-5">
            {errorMessage ? (
              <section className="rounded-lg border border-red-200 bg-red-50 p-5">
                <h2 className="text-lg font-black text-red-950">Unable to load field page</h2>
                <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
              </section>
            ) : null}

            {!errorMessage && !field ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5">
                <h2 className="text-xl font-black">Field not found</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  This public field page is not available yet. Check the link or ask the venue for an updated QR code.
                </p>
              </section>
            ) : null}

            <section className="rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">Current or next session</p>
              {currentSession ? (
                <div className="mt-4">
                  <h2 className="text-2xl font-black">{currentSession.title}</h2>
                  <div className="mt-4 rounded-lg bg-white p-4">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Home</p>
                        <p className="mt-1 truncate text-base font-black">{currentSession.homeTeam}</p>
                      </div>
                      <p className="rounded-lg bg-[var(--black-soft)] px-4 py-3 text-center text-3xl font-black leading-none text-white">
                        {currentSession.homeScore}-{currentSession.awayScore}
                      </p>
                      <div className="min-w-0 text-right">
                        <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Away</p>
                        <p className="mt-1 truncate text-base font-black">{currentSession.awayTeam}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Inning</p>
                        <p className="mt-1 text-sm font-black">{formatInning(currentSession)}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Count</p>
                        <p className="mt-1 text-sm font-black">
                          {currentSession.balls}-{currentSession.strikes}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Outs</p>
                        <p className="mt-1 text-sm font-black">{currentSession.outs}</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatSessionTime(currentSession.startTime)}</p>
                  <span className="mt-4 inline-flex rounded-md bg-white px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                    {currentSession.gameStatus}
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

            {sponsorPlacements.length > 0 ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5">
                <h2 className="text-lg font-black">Sponsors</h2>
                <div className="mt-4 grid gap-3">
                  {sponsorPlacements.map((placement) => (
                    <article key={placement.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">{placement.placementLabel}</p>
                      <div className="mt-3 flex gap-3">
                        {placement.sponsor.logoUrl ? (
                          <img
                            alt=""
                            className="h-14 w-14 rounded-lg border border-[var(--line)] bg-white object-contain p-1"
                            src={placement.sponsor.logoUrl}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <h3 className="text-base font-black">{placement.sponsor.name}</h3>
                          {placement.sponsor.websiteUrl ? (
                            <a
                              className="mt-2 inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 py-2 text-sm font-bold text-white"
                              href={placement.sponsor.websiteUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Visit sponsor
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {currentSession && (gameLinks.length > 0 || currentSession.notes) ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5">
                {gameLinks.length > 0 ? (
                  <div>
                    <h2 className="text-lg font-black">Game Links</h2>
                    <div className="mt-4 grid gap-3">
                      {gameLinks.map((link) => (
                        <a
                          key={link.label}
                          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 py-3 text-center text-sm font-black text-white"
                          href={link.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {currentSession.notes ? (
                  <div className={gameLinks.length > 0 ? "mt-5 border-t border-[var(--line)] pt-5" : ""}>
                    <h2 className="text-lg font-black">Game Notes</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{currentSession.notes}</p>
                  </div>
                ) : null}
              </section>
            ) : null}

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

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h2 className="text-lg font-black">Share Field Link</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Use this public URL for QR code sharing.
              </p>
              <div className="mt-4 overflow-x-auto rounded-lg bg-[var(--background)] p-4">
                <code className="whitespace-nowrap text-sm font-bold text-[var(--foreground)]">{publicFieldUrl}</code>
              </div>
            </section>
          </main>
        </div>
      </div>
    </section>
  );
}
