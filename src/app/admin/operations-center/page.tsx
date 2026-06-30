import Link from "next/link";
import type { ReactNode } from "react";
import { AiRecommendationsPanel } from "@/components/ai/ai-recommendations-panel";
import { generateAiRecommendations } from "@/lib/ai-recommendations";
import { getActiveAlerts, getAlerts, getAlertLabel, getAlertTone, sortAlertsForDisplay } from "@/lib/services/alerts";
import { getFields, getFieldStatusClass, getFieldStatusLabel } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import type { Alert, Field, Venue } from "@/lib/types";
import { clearActiveOperationsAlertsAction, clearAnnouncementAction, createDelayUpdateAction, createVenueAnnouncementAction, createVenueStatusAction, reopenAllClosedFieldsAction, resetAllFieldDelaysAction, resetSelectedFieldDelayAction, type VenueOperationType } from "./actions";

export const dynamic = "force-dynamic";

type OperationsCenterPageProps = {
  searchParams?: Promise<{
    venueId?: string;
  }>;
};

type OperationTemplate = {
  description: string;
  message: string;
  title: string;
  type: VenueOperationType;
};

const venueStatusTemplates: OperationTemplate[] = [
  {
    description: "Use when the venue is operating normally.",
    message: "Normal operations. Games are proceeding as scheduled.",
    title: "Normal Operations",
    type: "normal_operations",
  },
  {
    description: "Use when all or selected fields are behind schedule.",
    message: "Venue delay. Please wait for updated game times.",
    title: "Delay",
    type: "delay",
  },
  {
    description: "Use when the venue or selected fields are closed.",
    message: "Venue closed. Please check updated schedule.",
    title: "Closed",
    type: "closed",
  },
  {
    description: "Use for urgent venue-wide safety messages.",
    message: "Emergency alert. Follow venue staff instructions.",
    title: "Emergency",
    type: "emergency",
  },
];

const delayOptions = [
  { label: "On Time", value: "on_time" },
  { label: "15 min behind", value: "15_min" },
  { label: "30 min behind", value: "30_min" },
  { label: "45 min behind", value: "45_min" },
  { label: "60+ min behind", value: "60_plus_min" },
  { label: "Closed", value: "closed" },
];

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load operations center ${label}`, error);
    return [];
  }
}

function StatusCard({ label, tone, value }: { label: string; tone?: string; value: string | number }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tone ?? ""}`}>{value}</p>
    </article>
  );
}

function SectionShell({
  children,
  eyebrow,
  note,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  note?: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black">{title}</h2>
        {note ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FieldScopeInputs({ fields }: { fields: Field[] }) {
  return (
    <div className="grid gap-3 rounded-lg bg-[var(--background)] p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Affected fields</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex min-h-11 items-center gap-3 rounded-lg bg-white px-3 text-sm font-bold">
          <input className="h-5 w-5 accent-[var(--accent)]" defaultChecked name="scope_mode" type="radio" value="all" />
          All fields
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-lg bg-white px-3 text-sm font-bold">
          <input className="h-5 w-5 accent-[var(--accent)]" name="scope_mode" type="radio" value="selected" />
          Selected fields
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <label className="flex min-h-11 items-center gap-3 rounded-lg bg-white px-3 text-sm font-bold" key={field.id}>
            <input className="h-5 w-5 accent-[var(--accent)]" name="field_ids" type="checkbox" value={field.id} />
            {field.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function HiddenFieldInputs({ fields, venueId }: { fields: Field[]; venueId: string }) {
  return (
    <>
      <input name="venue_id" type="hidden" value={venueId} />
      {fields.map((field) => <input key={field.id} name="all_field_ids" type="hidden" value={field.id} />)}
    </>
  );
}

function OperationForm({ fields, template, venueId }: { fields: Field[]; template: OperationTemplate; venueId: string }) {
  return (
    <form action={createVenueStatusAction} className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
      <HiddenFieldInputs fields={fields} venueId={venueId} />
      <input name="operation_type" type="hidden" value={template.type} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black">{template.title}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{template.description}</p>
        </div>
        <button className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" type="submit">
          Run Action
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Title</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={template.title} name="title" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Message</span>
          <textarea className="min-h-24 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" defaultValue={template.message} name="message" />
        </label>
        <FieldScopeInputs fields={fields} />
      </div>
    </form>
  );
}

function AnnouncementForm({ fields, venueId }: { fields: Field[]; venueId: string }) {
  return (
    <form action={createVenueAnnouncementAction} className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
      <HiddenFieldInputs fields={fields} venueId={venueId} />
      <div className="mt-4 grid gap-3">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Announcement type</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base font-bold" name="announcement_type">
            <option value="general">General</option>
            <option value="weather">Weather</option>
            <option value="parking">Parking</option>
            <option value="tournament">Tournament</option>
            <option value="emergency">Emergency</option>
            <option value="concessions">Concessions</option>
            <option value="field_change">Field Change</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Title</span>
          <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" name="title" placeholder="Venue Announcement" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Message</span>
          <textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-base" name="message" placeholder="Lightning detected. Play suspended." required />
        </label>
        <FieldScopeInputs fields={fields} />
        <button className="min-h-12 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white" type="submit">
          Post Announcement
        </button>
      </div>
    </form>
  );
}

function getFieldDelayAmount(field: Field, activeAlerts: Alert[]) {
  if (field.status === "closed") return "Closed";
  if (field.status !== "delayed") return "On Time";

  const fieldAlert = activeAlerts.find((alert) => alert.fieldId === field.id && alert.alertType === "delay");
  const message = fieldAlert?.message.toLowerCase() ?? "";

  if (message.includes("60")) return "60+ min behind";
  if (message.includes("45")) return "45 min behind";
  if (message.includes("30")) return "30 min behind";
  if (message.includes("15")) return "15 min behind";
  return "Delayed";
}

function DelayTracking({ activeAlerts, fields, venueId }: { activeAlerts: Alert[]; fields: Field[]; venueId: string }) {
  return (
    <div className="grid gap-3">
        {fields.length > 0 ? fields.map((field) => (
          <form action={createDelayUpdateAction} className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] p-3 sm:grid-cols-[1fr_220px_auto] sm:items-center" key={field.id}>
            <input name="venue_id" type="hidden" value={venueId} />
            <input name="field_id" type="hidden" value={field.id} />
            <input name="field_name" type="hidden" value={field.name} />
            <div>
              <p className="font-black">{field.name}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                Current delay: {getFieldDelayAmount(field, activeAlerts)}
              </p>
              <span className={`mt-2 inline-flex w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(field.status)}`}>
                {getFieldStatusLabel(field.status)}
              </span>
            </div>
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" name="delay_status">
              {delayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <button className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" type="submit">
              Update
            </button>
          </form>
        )) : (
          <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No fields yet. Add your first field.</p>
        )}
    </div>
  );
}

function ResetControls({ fields, venueId }: { fields: Field[]; venueId: string }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Field Conditions Reset</p>
        <h2 className="mt-1 text-2xl font-black">Quick resets</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use these when the venue returns to normal or field conditions are corrected.</p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <form action={resetAllFieldDelaysAction}>
          <input name="venue_id" type="hidden" value={venueId} />
          {fields.map((field) => <input key={field.id} name="all_field_ids" type="hidden" value={field.id} />)}
          <button className="min-h-14 w-full rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" type="submit">
            Reset all field delays to On Time
          </button>
        </form>
        <form action={reopenAllClosedFieldsAction}>
          <input name="venue_id" type="hidden" value={venueId} />
          {fields.filter((field) => field.status === "closed").map((field) => <input key={field.id} name="all_field_ids" type="hidden" value={field.id} />)}
          <button className="min-h-14 w-full rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" type="submit">
            Reopen all closed fields
          </button>
        </form>
        <form action={clearActiveOperationsAlertsAction}>
          <input name="venue_id" type="hidden" value={venueId} />
          {fields.map((field) => <input key={field.id} name="all_field_ids" type="hidden" value={field.id} />)}
          <button className="min-h-14 w-full rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black" type="submit">
            Clear active operations alerts
          </button>
        </form>
        <form action={createVenueStatusAction}>
          <input name="venue_id" type="hidden" value={venueId} />
          <input name="operation_type" type="hidden" value="all_clear" />
          <input name="title" type="hidden" value="All Clear" />
          <input name="message" type="hidden" value="All clear. Games may resume." />
          <input name="scope_mode" type="hidden" value="all" />
          {fields.map((field) => <input key={field.id} name="all_field_ids" type="hidden" value={field.id} />)}
          <button className="min-h-14 w-full rounded-lg border border-green-200 bg-green-50 px-4 text-sm font-black text-green-900" type="submit">
            All Clear
          </button>
        </form>
      </div>
      <div className="mt-5 grid gap-3">
        {fields.map((field) => (
          <form action={resetSelectedFieldDelayAction} className="grid gap-2 rounded-lg bg-[var(--background)] p-3 sm:grid-cols-[1fr_auto] sm:items-center" key={field.id}>
            <input name="field_id" type="hidden" value={field.id} />
            <p className="font-black">{field.name}</p>
            <button className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black" type="submit">
              Reset selected field delay
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}

function inferVenueStatus(activeAlerts: Alert[], closedFields: number, delayedFields: number) {
  if (activeAlerts.some((alert) => alert.alertType === "emergency")) return "Emergency";
  if (closedFields > 0 || activeAlerts.some((alert) => alert.alertType === "field_closure")) return "Closed";
  if (delayedFields > 0 || activeAlerts.some((alert) => alert.alertType === "delay" || alert.alertType === "weather")) return "Delay";
  return "Normal Operations";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getHistoryStatusChange(alert: Alert) {
  if (alert.title === "All Clear" || alert.title === "Normal Operations") return "Normal Operations";
  if (alert.alertType === "emergency") return "Emergency";
  if (alert.alertType === "field_closure") return "Closed";
  if (alert.alertType === "delay" || alert.alertType === "weather") return "Delay";
  return "Announcement";
}

function getHistoryUser(alert: Alert) {
  return alert.title === "All Clear" ? "Operations Center" : "Venue Operator";
}

function PublicImpactPreview({ activeAlerts, delayedFields, venueStatus }: { activeAlerts: Alert[]; delayedFields: number; venueStatus: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[
        "Public Venue Page",
        "Public Field Pages",
        "Venue Display Board",
        "Game Day Center",
        "Status Board",
        "Pilot Launch Dashboard",
      ].map((target) => (
        <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={target}>
          <p className="text-sm font-black">{target}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{venueStatus}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {activeAlerts.length} active alerts · {delayedFields} delayed fields
          </p>
        </article>
      ))}
    </div>
  );
}

function AutomationTargets() {
  const targets = ["Venue Displays", "Scoreboards", "Audio / PA", "Public Pages", "Push Notifications"];

  return (
    <section className="mt-8 rounded-lg border border-dashed border-[var(--line)] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Automation Targets</p>
      <h2 className="mt-1 text-2xl font-black">Future control surfaces</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Placeholder only. GameDay OS does not control hardware, PA, scoreboards, or push notifications yet.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {targets.map((target) => (
          <article className="rounded-lg bg-[var(--background)] p-4" key={target}>
            <p className="text-sm font-black">{target}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Future</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function OperationsCenterPage({ searchParams }: OperationsCenterPageProps) {
  const resolvedSearchParams = await searchParams;
  const [venues, fields, activeAlerts, allAlerts] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Alert>("active alerts", getActiveAlerts),
    safeLoad<Alert>("alert history", getAlerts),
  ]);
  const selectedVenue = venues.find((venue) => venue.id === resolvedSearchParams?.venueId) ?? venues[0] ?? null;
  const venueFields = selectedVenue ? fields.filter((field) => field.venueId === selectedVenue.id) : [];
  const venueActiveAlerts = selectedVenue ? sortAlertsForDisplay(activeAlerts.filter((alert) => alert.venueId === selectedVenue.id)) : [];
  const history = selectedVenue ? allAlerts.filter((alert) => alert.venueId === selectedVenue.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10) : [];
  const activeAnnouncements = venueActiveAlerts.filter((alert) => alert.alertScope === "venue" || alert.alertScope === "global").length;
  const closedFields = venueFields.filter((field) => field.status === "closed").length;
  const delayedFields = venueFields.filter((field) => field.status === "delayed").length;
  const venueStatus = inferVenueStatus(venueActiveAlerts, closedFields, delayedFields);
  const aiRecommendations = generateAiRecommendations({
    activeAlerts: venueActiveAlerts,
    alerts: history,
    fields: venueFields,
    venues: selectedVenue ? [selectedVenue] : venues,
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Operations</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Venue Operations Center</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            A venue-wide layer for status, announcements, delays, closures, and field safety decisions across every field.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/weather" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
            Weather Profiles
          </Link>
          <Link href="/admin/status-board" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white">
            Status Board
          </Link>
        </div>
      </div>

      <form className="mt-8 grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end" method="get">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Venue</span>
          <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-base font-bold" defaultValue={selectedVenue?.id ?? ""} name="venueId">
            {venues.length === 0 ? <option value="">No venues found</option> : null}
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </label>
        <button className="min-h-12 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white" type="submit">
          Load Venue
        </button>
      </form>

      {!selectedVenue ? (
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h2 className="text-xl font-black">No venue selected</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Create a venue before using the operations center.</p>
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatusCard label="Venue Status" value={venueStatus} tone={venueStatus === "Emergency" || venueStatus === "Closed" ? "text-red-700" : venueStatus === "Delay" ? "text-amber-800" : "text-[var(--accent-strong)]"} />
            <StatusCard label="Active Announcements" value={activeAnnouncements} />
            <StatusCard label="Delayed Fields" value={delayedFields} tone={delayedFields > 0 ? "text-amber-800" : undefined} />
            <StatusCard label="Closed Fields" value={closedFields} tone={closedFields > 0 ? "text-red-700" : undefined} />
            <StatusCard label="Active Alerts" value={venueActiveAlerts.length} />
          </section>

          <div className="mt-8">
            <AiRecommendationsPanel compact recommendations={aiRecommendations} title="Operations Suggestions" />
          </div>

          <div className="mt-8 grid gap-8">
            <SectionShell
              eyebrow="Venue Status"
              note="Set the official venue-wide operating condition. These actions drive public pages, displays, dashboards, and field state."
              title="Official operations state"
            >
              <div className="grid gap-4 xl:grid-cols-2">
                {venueStatusTemplates.map((template) => (
                  <OperationForm fields={venueFields} key={template.type} template={template} venueId={selectedVenue.id} />
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <form action={createVenueStatusAction}>
                  <HiddenFieldInputs fields={venueFields} venueId={selectedVenue.id} />
                  <input name="operation_type" type="hidden" value="delay" />
                  <input name="scope_mode" type="hidden" value="all" />
                  <button className="min-h-14 w-full rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-950" type="submit">
                    Start Delay
                  </button>
                </form>
                <form action={createVenueStatusAction}>
                  <HiddenFieldInputs fields={venueFields} venueId={selectedVenue.id} />
                  <input name="operation_type" type="hidden" value="normal_operations" />
                  <input name="scope_mode" type="hidden" value="all" />
                  <button className="min-h-14 w-full rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black" type="submit">
                    End Delay
                  </button>
                </form>
                <form action={createVenueStatusAction}>
                  <HiddenFieldInputs fields={venueFields} venueId={selectedVenue.id} />
                  <input name="operation_type" type="hidden" value="all_clear" />
                  <input name="scope_mode" type="hidden" value="all" />
                  <button className="min-h-14 w-full rounded-lg border border-green-200 bg-green-50 px-4 text-sm font-black text-green-900" type="submit">
                    All Clear
                  </button>
                </form>
                <form action={createVenueStatusAction}>
                  <HiddenFieldInputs fields={venueFields} venueId={selectedVenue.id} />
                  <input name="operation_type" type="hidden" value="closed" />
                  <input name="scope_mode" type="hidden" value="all" />
                  <button className="min-h-14 w-full rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-black text-red-900" type="submit">
                    Close Venue
                  </button>
                </form>
                <form action={createVenueStatusAction}>
                  <HiddenFieldInputs fields={venueFields} venueId={selectedVenue.id} />
                  <input name="operation_type" type="hidden" value="normal_operations" />
                  <input name="scope_mode" type="hidden" value="all" />
                  <button className="min-h-14 w-full rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" type="submit">
                    Reopen Venue
                  </button>
                </form>
              </div>
            </SectionShell>

            <SectionShell
              eyebrow="Venue Announcements"
              note="Post official public communications for weather, parking, tournaments, concessions, field changes, and emergencies."
              title="Announcements and communications"
            >
              <AnnouncementForm fields={venueFields} venueId={selectedVenue.id} />
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {venueActiveAlerts.length > 0 ? venueActiveAlerts.map((alert) => (
                  <article className={`rounded-lg border p-4 ${getAlertTone(alert.alertType)}`} key={alert.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em]">{getAlertLabel(alert.alertType)} · {alert.alertPriority.toUpperCase()}</p>
                        <h3 className="mt-1 text-lg font-black">{alert.title}</h3>
                        <p className="mt-2 text-sm leading-6">{alert.message}</p>
                        <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] opacity-75">{formatDateTime(alert.createdAt)}</p>
                      </div>
                      <form action={clearAnnouncementAction}>
                        <input name="alert_id" type="hidden" value={alert.id} />
                        <input name="venue_id" type="hidden" value={selectedVenue.id} />
                        {venueFields.map((field) => <input key={field.id} name="all_field_ids" type="hidden" value={field.id} />)}
                        <button className="min-h-11 rounded-lg border border-current bg-white/80 px-4 text-sm font-black" type="submit">
                          Clear Announcement
                        </button>
                      </form>
                    </div>
                  </article>
                )) : (
                  <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No active operations announcements for this venue.</p>
                )}
              </div>
            </SectionShell>

            <SectionShell
              eyebrow="Field Delay Management"
              note="Manage field-level delay amounts and closures. Updates create timeline records and change public field status."
              title="Field timing and closures"
            >
              <DelayTracking activeAlerts={venueActiveAlerts} fields={venueFields} venueId={selectedVenue.id} />
              <div className="mt-5">
                <ResetControls fields={venueFields} venueId={selectedVenue.id} />
              </div>
            </SectionShell>

            <SectionShell
              eyebrow="Recent Operations Timeline"
              note="Records status changes, announcements, delay updates, all clear events, and field closures."
              title="Operations timeline"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Current Status</p>
                  <h3 className="mt-1 text-xl font-black">{venueStatus}</h3>
                </div>
                <p className="text-sm font-bold text-[var(--muted)]">Recent Updates</p>
              </div>
              <div className="mt-4 grid gap-3">
                {history.length > 0 ? history.map((alert) => (
                  <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={alert.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{getAlertLabel(alert.alertType)}</span>
                          <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{getHistoryStatusChange(alert)}</span>
                        </div>
                        <h3 className="mt-1 text-base font-black">{alert.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{alert.message}</p>
                        <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">User: {getHistoryUser(alert)}</p>
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{formatDateTime(alert.createdAt)}</p>
                    </div>
                  </article>
                )) : (
                  <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No operations history yet.</p>
                )}
              </div>
            </SectionShell>

            <SectionShell
              eyebrow="Public Impact Preview"
              note="These are the public and operator surfaces affected by the current Operations Center state."
              title="What parents and operators will see"
            >
              <PublicImpactPreview activeAlerts={venueActiveAlerts} delayedFields={delayedFields} venueStatus={venueStatus} />
            </SectionShell>
          </div>

          <AutomationTargets />
        </>
      )}
    </section>
  );
}
