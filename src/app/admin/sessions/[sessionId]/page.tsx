import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { venueInScope } from "@/lib/access/capabilities";
import { publicErrorMessage } from "@/lib/public-error";
import { CopyLinkButton } from "@/components/copy-link-button";
import { getPublicAppUrl, getPublicScoreboardUrl } from "@/lib/public-url";
import { getField } from "@/lib/services/fields";
import { getFollowCountForSession } from "@/lib/services/follows";
import { getActiveResourceActivationsForField } from "@/lib/services/resource-activations";
import { getSessionEvents, getSessionEventTypeLabel } from "@/lib/services/session-events";
import { getSession } from "@/lib/services/sessions";
import { ensureScorekeeperAccess } from "@/lib/services/scorekeeper";
import { getVenue } from "@/lib/services/venues";
import { getVolunteerRolesBySessionId } from "@/lib/services/volunteer-roles";
import type { ResourceActivation, SessionEvent, VolunteerRole } from "@/lib/types";
import { DemoScoreboardControls } from "@/components/demo-scoreboard-controls";
import { LiveSessionDashboard } from "./live-session-dashboard";

type SessionDashboardPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTimelineTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function SessionDashboardPage({ params }: SessionDashboardPageProps) {
  const { sessionId } = await params;
  let errorMessage: string | null = null;
  let session: Awaited<ReturnType<typeof getSession>> = null;
  let scorekeeper: { token: string; pin: string } | null = null;
  let field: Awaited<ReturnType<typeof getField>> = null;
  let venue: Awaited<ReturnType<typeof getVenue>> = null;
  let volunteerRoles: VolunteerRole[] = [];
  let activeResources: ResourceActivation[] = [];
  let sessionEvents: SessionEvent[] = [];
  let followCount = 0;

  try {
    session = await getSession(sessionId);
    if (session) {
      scorekeeper = await ensureScorekeeperAccess(session.id).catch(() => null);
      [field, volunteerRoles, followCount, sessionEvents] = await Promise.all([
        getField(session.fieldId),
        getVolunteerRolesBySessionId(session.id),
        getFollowCountForSession(session.id),
        getSessionEvents(session.id),
      ]);
      activeResources = await getActiveResourceActivationsForField({ fieldId: session.fieldId, sessionId: session.id });
      venue = field ? await getVenue(field.venueId) : null;
    }
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load session dashboard.");
  }

  // Object-level authorization: don't expose another venue's session by URL.
  if (session && venue && !venueInScope(await getSessionContext(), venue)) {
    notFound();
  }

  if (errorMessage) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/sessions" className="text-sm font-bold text-[var(--accent-strong)]">
          Back to sessions
        </Link>
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-black text-red-950">Unable to load session dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/sessions" className="text-sm font-bold text-[var(--accent-strong)]">
          Back to sessions
        </Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Session not found</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            This live dashboard is not available. Check the session link or create a new session.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/sessions" className="text-sm font-bold text-[var(--accent-strong)]">
            Back to sessions
          </Link>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Live session dashboard
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{session.title}</h1>
          <p className="mt-3 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            {session.sportType}
          </p>
          {session.isDemo ? (
            <p className="mt-2 w-fit rounded-md bg-amber-100 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-900">
              Demo Session
            </p>
          ) : null}
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            {venue?.name ?? "Venue unavailable"} · {field?.name ?? "Field unavailable"} · {formatSessionTime(session.startTime)}
          </p>
        </div>
        {field ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/admin/sessions/${session.id}/command-center`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white"
            >
              Open Command Center
            </Link>
            <Link
              href="#score-entry"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold"
            >
              Open Score Control
            </Link>
            <Link
              href={getPublicScoreboardUrl(session.id)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--black-soft)] px-5 py-3 text-sm font-bold text-white"
            >
              Open Public Scoreboard
            </Link>
            <CopyLinkButton label="Copy Scoreboard Link" value={getPublicScoreboardUrl(session.id)} />
            {scorekeeper ? <CopyLinkButton label={"Copy Scorekeeper Link (PIN " + scorekeeper.pin + ")"} value={getPublicAppUrl() + "/score/" + scorekeeper.token} /> : null}
            <Link
              href={`/fields/${field.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold"
            >
              View Field Page
            </Link>
            <Link
              href={`/admin/scoreboards/display?session=${session.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold"
            >
              Display controls
            </Link>
          </div>
        ) : null}
      </div>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Parent Follow Mode</p>
        <p className="mt-2 text-3xl font-black">{followCount}</p>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Anonymous follows for this session.</p>
      </section>

      <section className="mt-5 rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Session Timeline</p>
          <h2 className="text-xl font-black">Recent events</h2>
          <p className="text-sm font-semibold text-[var(--muted)]">Newest events appear first.</p>
        </div>
        {sessionEvents.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {sessionEvents.map((event) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={event.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="inline-flex rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                      {getSessionEventTypeLabel(event.eventType)}
                    </span>
                    <p className="mt-2 text-sm font-black">{event.eventMessage}</p>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{formatTimelineTime(event.createdAt)}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
            No timeline events have been recorded for this session yet.
          </p>
        )}
      </section>

      <div className="mt-5">
        <DemoScoreboardControls session={session} />
      </div>

      <div id="score-entry">
        <LiveSessionDashboard activeResources={activeResources} session={session} volunteerRoles={volunteerRoles} />
      </div>
    </section>
  );
}
