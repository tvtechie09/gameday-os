import Link from "next/link";
import { getFields } from "@/lib/services/fields";
import { getActivationLabel, getAttachmentOptionLabel, getResourceActivations } from "@/lib/services/resource-activations";
import { getResources } from "@/lib/services/resources";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import type { Field, ResourceActivation, ResourceActivationType, Session, Venue } from "@/lib/types";
import { ActivationStatusButton } from "../activations/status-button";

export const dynamic = "force-dynamic";

type ResourceDashboardProps = {
  searchParams?: Promise<{
    type?: string;
  }>;
};

const dashboardFilters: ResourceActivationType[] = ["parent_camera", "livestream_link", "bluetooth_speaker", "scoreboard_operator", "announcer"];

function readSelectedType(value?: string): ResourceActivationType | "all" {
  return dashboardFilters.find((type) => type === value) ?? "all";
}

function isActiveSession(session: Session, now: Date) {
  if (session.status === "active" || session.gameStatus === "active") {
    return true;
  }

  if (!session.endTime) {
    return false;
  }

  const timestamp = now.getTime();
  return new Date(session.startTime).getTime() <= timestamp && timestamp <= new Date(session.endTime).getTime();
}

function getCurrentSession(field: Field, sessions: Session[], now: Date) {
  return sessions
    .filter((session) => session.fieldId === field.id)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .find((session) => isActiveSession(session, now)) ?? null;
}

function filterByType(activations: ResourceActivation[], selectedType: ResourceActivationType | "all") {
  return selectedType === "all" ? activations : activations.filter((activation) => activation.activationType === selectedType);
}

function SummaryCard({ label, note, value }: { label: string; note: string; value: number }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{note}</p>
    </article>
  );
}

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load resource dashboard ${label}`, error);
    return [];
  }
}

export default async function ResourceUtilizationDashboard({ searchParams }: ResourceDashboardProps) {
  const resolvedSearchParams = await searchParams;
  const selectedType = readSelectedType(resolvedSearchParams?.type);
  const [resources, activations, venues, fields, sessions] = await Promise.all([
    safeLoad("resources", getResources),
    safeLoad("resource activations", getResourceActivations),
    safeLoad("venues", getVenues),
    safeLoad("fields", getFields),
    safeLoad("sessions", getSessions),
  ]);
  const now = new Date();
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const activeActivations = filterByType(activations.filter((activation) => activation.status === "active"), selectedType);
  const pendingActivations = filterByType(activations.filter((activation) => activation.status === "requested"), selectedType);
  const fieldsWithActiveResources = new Set(activeActivations.map((activation) => activation.fieldId));
  const groupedByVenue = venues.map((venue) => ({
    venue,
    fields: fields.filter((field) => field.venueId === venue.id),
    activeCount: activeActivations.filter((activation) => activation.venueId === venue.id).length,
    pendingCount: pendingActivations.filter((activation) => activation.venueId === venue.id).length,
  }));

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Resources</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Resource utilization dashboard</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Track active parent-attached resources and pending requests across every venue and field.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/resources/activations" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Activation queue
          </Link>
          <Link href="/admin/resources" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            Inventory
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Resources" note="Inventory records" value={resources.length} />
        <SummaryCard label="Active Resources" note="Live attachments" value={activeActivations.length} />
        <SummaryCard label="Pending Resource Requests" note="Awaiting approval" value={pendingActivations.length} />
        <SummaryCard label="Fields With Active Resources" note="Fields currently supported" value={fieldsWithActiveResources.size} />
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black">Resource filters</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Filter active and pending resource attachments by type.</p>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            <Link className={selectedType === "all" ? "whitespace-nowrap rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white" : "whitespace-nowrap rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"} href="/admin/resources/dashboard">
              All
            </Link>
            {dashboardFilters.map((type) => (
              <Link
                className={selectedType === type ? "whitespace-nowrap rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white" : "whitespace-nowrap rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"}
                href={`/admin/resources/dashboard?type=${type}`}
                key={type}
              >
                {getAttachmentOptionLabel(type)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Venue overview</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {groupedByVenue.map((group) => (
            <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={group.venue.id}>
              <h3 className="text-lg font-black">{group.venue.name}</h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-800">Total Active Resources</p>
                  <p className="mt-1 text-2xl font-black text-green-800">{group.activeCount}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900">Total Pending Requests</p>
                  <p className="mt-1 text-2xl font-black text-amber-900">{group.pendingCount}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Field resource grid</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => {
            const currentSession = getCurrentSession(field, sessions, now);
            const fieldActive = activeActivations.filter((activation) => activation.fieldId === field.id);
            const fieldPending = pendingActivations.filter((activation) => activation.fieldId === field.id);

            return (
              <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={field.id}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{venuesById.get(field.venueId)?.name ?? "Venue unavailable"}</p>
                  <h3 className="mt-1 text-xl font-black">{field.name}</h3>
                  <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                    {currentSession ? currentSession.title : "No active session"}
                  </p>
                </div>

                <div className="mt-4 rounded-lg bg-[var(--background)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Active Resources</p>
                  {fieldActive.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {fieldActive.map((activation) => (
                        <div className="rounded-lg bg-white p-3" key={activation.id}>
                          <p className="text-sm font-black">✓ {getActivationLabel(activation.activationType)}</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{activation.displayName}</p>
                          {activation.resourceUrl ? <p className="mt-1 break-all text-xs font-bold text-[var(--accent-strong)]">{activation.resourceUrl}</p> : null}
                          <div className="mt-3">
                            <ActivationStatusButton id={activation.id} label="End Active Resource" status="ended" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold text-[var(--muted)]">No Active Resources</p>
                  )}
                </div>

                <div className="mt-3 rounded-lg bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-900">Pending Requests</p>
                  {fieldPending.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {fieldPending.map((activation) => (
                        <div className="rounded-lg bg-white p-3" key={activation.id}>
                          <p className="text-sm font-black">Pending {getAttachmentOptionLabel(activation.activationType)} Request</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{activation.displayName}</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <ActivationStatusButton id={activation.id} label="Approve Request" status="active" />
                            <ActivationStatusButton id={activation.id} label="Reject Request" status="rejected" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold text-[var(--muted)]">No pending requests</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
