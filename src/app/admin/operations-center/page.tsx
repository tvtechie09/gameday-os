import Link from "next/link";
import { redirect } from "next/navigation";
import { canViewCommandCenter, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { getActiveAlerts } from "@/lib/services/alerts";
import { PageShell, PageTitle, StatusChip, buttonStyles, type StatusTone } from "@/components/ui/gameday-ui";
import type { Alert, FieldStatus } from "@/lib/types";
import { createVenueStatusAction, type VenueOperationType } from "./actions";

export const dynamic = "force-dynamic";

type OperationsCenterPageProps = {
  searchParams?: Promise<{ venueId?: string }>;
};

type VenueStateOption = {
  description: string;
  label: string;
  operationType: VenueOperationType;
  tone: string;
};

const venueStateOptions: VenueStateOption[] = [
  { label: "Return to normal", description: "Clear active operations alerts and reopen every field.", operationType: "normal_operations", tone: "border-emerald-200 bg-emerald-50 text-emerald-950" },
  { label: "Weather delay", description: "Mark all fields delayed and publish a weather update.", operationType: "weather_delay", tone: "border-amber-200 bg-amber-50 text-amber-950" },
  { label: "Schedule delay", description: "Mark all fields delayed and publish a schedule update.", operationType: "schedule_delay", tone: "border-amber-200 bg-amber-50 text-amber-950" },
  { label: "Close venue", description: "Close every field and publish a venue closure.", operationType: "closed", tone: "border-red-200 bg-red-50 text-red-950" },
  { label: "Emergency", description: "Publish an urgent venue-wide safety update without guessing field state.", operationType: "emergency", tone: "border-red-300 bg-red-100 text-red-950" },
  { label: "Maintenance", description: "Mark all fields unavailable and publish a maintenance update.", operationType: "maintenance", tone: "border-slate-300 bg-slate-100 text-slate-950" },
];

function inferVenueStatus(activeAlerts: Alert[], fields: Array<{ status: FieldStatus }>) {
  if (activeAlerts.some((alert) => alert.alertType === "emergency")) return { label: "Emergency", tone: "danger" as StatusTone };
  if (fields.some((field) => field.status === "maintenance")) return { label: "Maintenance", tone: "danger" as StatusTone };
  if (fields.some((field) => field.status === "closed")) return { label: "Closed", tone: "danger" as StatusTone };
  if (activeAlerts.some((alert) => alert.alertType === "weather")) return { label: "Weather delay", tone: "warning" as StatusTone };
  if (fields.some((field) => field.status === "delayed")) return { label: "Schedule delay", tone: "warning" as StatusTone };
  return { label: "Normal operations", tone: "success" as StatusTone };
}

export default async function OperationsCenterPage({ searchParams }: OperationsCenterPageProps) {
  const ctx = await getSessionContext();
  if (!ctx || !canViewCommandCenter(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));

  const [{ venues, fields }, activeAlerts] = await Promise.all([
    getScopedVenuesAndFields(),
    getActiveAlerts().catch(() => [] as Alert[]),
  ]);
  const requestedVenueId = (await searchParams)?.venueId;
  const selectedVenue = venues.find((venue) => venue.id === requestedVenueId) ?? venues[0] ?? null;
  const venueFields = selectedVenue ? fields.filter((field) => field.venueId === selectedVenue.id) : [];
  const venueAlerts = selectedVenue ? activeAlerts.filter((alert) => alert.venueId === selectedVenue.id) : [];
  const status = inferVenueStatus(venueAlerts, venueFields);

  return (
    <PageShell>
      <PageTitle
        actions={<div className="flex flex-wrap gap-2"><Link className={buttonStyles("secondary")} href="/today">Today</Link><Link className={buttonStyles("secondary")} href="/admin/fields">Fields</Link><Link className={buttonStyles("secondary")} href="/admin/alerts">Announcements</Link></div>}
        description="Set the official venue-wide operating condition. Use Fields for one location and Announcements for a custom message."
        eyebrow="More · Venue operations"
        title="Venue status"
      />

      {venues.length > 1 ? (
        <form className="mt-6 grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" method="get">
          <label className="grid gap-2 text-sm font-black" htmlFor="venue-status-select">Venue
            <select className="ui-input" defaultValue={selectedVenue?.id ?? ""} id="venue-status-select" name="venueId">
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          </label>
          <button className={buttonStyles("secondary")} type="submit">Load venue</button>
        </form>
      ) : null}

      {!selectedVenue ? (
        <section className="mt-7 rounded-xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">No venue available</h2>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">Your account does not currently resolve to a venue you can operate.</p>
        </section>
      ) : (
        <>
          <section className="mt-7 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{selectedVenue.name}</p>
                <h2 className="mt-2 text-2xl font-black">Official operating state</h2>
              </div>
              <StatusChip tone={status.tone}>{status.label}</StatusChip>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-[var(--background)] p-3"><dt className="text-xs font-black text-[var(--muted)]">Fields</dt><dd className="mt-1 text-2xl font-black">{venueFields.length}</dd></div>
              <div className="rounded-lg bg-[var(--background)] p-3"><dt className="text-xs font-black text-[var(--muted)]">Flagged</dt><dd className="mt-1 text-2xl font-black">{venueFields.filter((field) => ["closed", "delayed", "maintenance"].includes(field.status)).length}</dd></div>
              <div className="rounded-lg bg-[var(--background)] p-3"><dt className="text-xs font-black text-[var(--muted)]">Updates</dt><dd className="mt-1 text-2xl font-black">{venueAlerts.length}</dd></div>
            </dl>
          </section>

          <section className="mt-7">
            <div>
              <h2 className="text-xl font-black">Change the whole venue</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">These actions affect every configured field and publish the matching public operating update.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {venueStateOptions.map((option) => (
                <form action={createVenueStatusAction} className={`flex min-w-0 flex-col rounded-xl border p-4 ${option.tone}`} key={option.operationType}>
                  <input name="venue_id" type="hidden" value={selectedVenue.id} />
                  <input name="operation_type" type="hidden" value={option.operationType} />
                  <input name="scope_mode" type="hidden" value="all" />
                  {venueFields.map((field) => <input key={field.id} name="all_field_ids" type="hidden" value={field.id} />)}
                  <h3 className="text-lg font-black">{option.label}</h3>
                  <p className="mt-2 flex-1 text-sm font-semibold leading-6 opacity-80">{option.description}</p>
                  <button className="mt-4 min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" type="submit">{option.label}</button>
                </form>
              ))}
            </div>
          </section>

          <p className="mt-7 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold leading-6 text-sky-950">
            Need a different message or publish window? Use <Link className="font-black underline" href="/admin/alerts">Announcements</Link>. Need to change one field? Use <Link className="font-black underline" href="/admin/fields">Fields</Link>.
          </p>
        </>
      )}
    </PageShell>
  );
}
