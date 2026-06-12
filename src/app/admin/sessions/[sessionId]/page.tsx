import Link from "next/link";
import { getField } from "@/lib/services/fields";
import { getSession } from "@/lib/services/sessions";
import { getVenue } from "@/lib/services/venues";
import { getVolunteerRolesBySessionId } from "@/lib/services/volunteer-roles";
import type { VolunteerRole } from "@/lib/types";
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

export const dynamic = "force-dynamic";

export default async function SessionDashboardPage({ params }: SessionDashboardPageProps) {
  const { sessionId } = await params;
  let errorMessage: string | null = null;
  let session: Awaited<ReturnType<typeof getSession>> = null;
  let field: Awaited<ReturnType<typeof getField>> = null;
  let venue: Awaited<ReturnType<typeof getVenue>> = null;
  let volunteerRoles: VolunteerRole[] = [];

  try {
    session = await getSession(sessionId);
    if (session) {
      [field, volunteerRoles] = await Promise.all([getField(session.fieldId), getVolunteerRolesBySessionId(session.id)]);
      venue = field ? await getVenue(field.venueId) : null;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load session dashboard.";
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
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            {venue?.name ?? "Venue unavailable"} · {field?.name ?? "Field unavailable"} · {formatSessionTime(session.startTime)}
          </p>
        </div>
        {field ? (
          <Link
            href={`/fields/${field.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold"
          >
            View public field
          </Link>
        ) : null}
      </div>

      <LiveSessionDashboard session={session} volunteerRoles={volunteerRoles} />
    </section>
  );
}
