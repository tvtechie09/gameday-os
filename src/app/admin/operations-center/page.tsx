import Link from "next/link";
import { getActiveAlerts, getAlerts, getAlertLabel, getAlertTone, sortAlertsForDisplay } from "@/lib/services/alerts";
import { getFields, getFieldStatusClass, getFieldStatusLabel } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import { getWeatherProfiles, getWeatherSourceLabel, getWeatherStatusClass, getWeatherStatusLabel } from "@/lib/services/weather-profiles";
import type { Alert, Field, Venue, WeatherProfile } from "@/lib/types";
import { clearActiveOperationsAlertsAction, createDelayUpdateAction, createVenueAnnouncementAction, createVenueStatusAction, reopenAllClosedFieldsAction, resetAllFieldDelaysAction, resetSelectedFieldDelayAction, type VenueOperationType } from "./actions";

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

const weatherTemplates: OperationTemplate[] = [
  {
    description: "Pause all or selected fields for rain and field playability.",
    message: "Rain delay. Games will resume when fields are playable.",
    title: "Rain Delay",
    type: "rain_delay",
  },
  {
    description: "Pause games immediately because lightning is in the area.",
    message: "Lightning delay. All games are paused.",
    title: "Lightning Delay",
    type: "lightning_delay",
  },
  {
    description: "Pause games while heat safety is reviewed.",
    message: "Heat delay. Games are paused while venue staff monitors player safety.",
    title: "Heat Delay",
    type: "heat_delay",
  },
  {
    description: "Close all or selected fields.",
    message: "Field closed. Please check updated schedule.",
    title: "Field Closure",
    type: "field_closure",
  },
  {
    description: "Post all clear and set affected fields open.",
    message: "All clear. Games may resume.",
    title: "All Clear",
    type: "all_clear",
  },
];

const delayOptions = [
  { label: "On Time", value: "on_time" },
  { label: "15 min behind", value: "15_min" },
  { label: "30 min behind", value: "30_min" },
  { label: "45 min behind", value: "45_min" },
  { label: "60+ min behind", value: "60_plus_min" },
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

function WeatherProfileCard({ profile, venue }: { profile: WeatherProfile | null; venue: Venue }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Weather Section</p>
          <h2 className="mt-1 text-2xl font-black">{profile?.locationName ?? venue.name}</h2>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
            Source: {profile ? getWeatherSourceLabel(profile.weatherSource) : "Manual placeholder"}
          </p>
        </div>
        {profile ? (
          <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getWeatherStatusClass(profile.status)}`}>
            {getWeatherStatusLabel(profile.status)}
          </span>
        ) : (
          <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Not configured
          </span>
        )}
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        Manual operations only. No weather API, automatic lightning detection, push notifications, or new integrations.
      </p>
    </article>
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
    <form action={createVenueAnnouncementAction} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <HiddenFieldInputs fields={fields} venueId={venueId} />
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Operations Message</p>
        <h2 className="mt-1 text-2xl font-black">Venue announcement</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Post free-form venue-wide messages such as parking, tournament, concession, weather, or emergency updates.</p>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Announcement type</span>
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base font-bold" name="announcement_type">
            <option value="general">General</option>
            <option value="weather">Weather</option>
            <option value="parking">Parking</option>
            <option value="tournament">Tournament</option>
            <option value="emergency">Emergency</option>
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

function DelayTracking({ fields, venueId }: { fields: Field[]; venueId: string }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Delay Tracking</p>
        <h2 className="mt-1 text-2xl font-black">Field timing</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Track whether each field is on time or running behind. Updates create field-level announcements and adjust field status.</p>
      </div>
      <div className="mt-5 grid gap-3">
        {fields.length > 0 ? fields.map((field) => (
          <form action={createDelayUpdateAction} className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] p-3 sm:grid-cols-[1fr_220px_auto] sm:items-center" key={field.id}>
            <input name="venue_id" type="hidden" value={venueId} />
            <input name="field_id" type="hidden" value={field.id} />
            <input name="field_name" type="hidden" value={field.name} />
            <div>
              <p className="font-black">{field.name}</p>
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
    </section>
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
          {fields.map((field) => <input key={field.id} name="all_field_ids" type="hidden" value={field.id} />)}
          <button className="min-h-14 w-full rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" type="submit">
            Reset all field delays to On Time
          </button>
        </form>
        <form action={reopenAllClosedFieldsAction}>
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

export default async function OperationsCenterPage({ searchParams }: OperationsCenterPageProps) {
  const resolvedSearchParams = await searchParams;
  const [venues, fields, weatherProfiles, activeAlerts, allAlerts] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<WeatherProfile>("weather profiles", getWeatherProfiles),
    safeLoad<Alert>("active alerts", getActiveAlerts),
    safeLoad<Alert>("alert history", getAlerts),
  ]);
  const selectedVenue = venues.find((venue) => venue.id === resolvedSearchParams?.venueId) ?? venues[0] ?? null;
  const venueFields = selectedVenue ? fields.filter((field) => field.venueId === selectedVenue.id) : [];
  const weatherProfile = selectedVenue ? weatherProfiles.find((profile) => profile.venueId === selectedVenue.id) ?? null : null;
  const venueActiveAlerts = selectedVenue ? sortAlertsForDisplay(activeAlerts.filter((alert) => alert.venueId === selectedVenue.id)) : [];
  const history = selectedVenue ? allAlerts.filter((alert) => alert.venueId === selectedVenue.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10) : [];
  const activeAnnouncements = venueActiveAlerts.filter((alert) => alert.alertScope === "venue" || alert.alertScope === "global").length;
  const closedFields = venueFields.filter((field) => field.status === "closed").length;
  const delayedFields = venueFields.filter((field) => field.status === "delayed").length;
  const venueStatus = inferVenueStatus(venueActiveAlerts, closedFields, delayedFields);

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

          <section className="mt-8 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <AnnouncementForm fields={venueFields} venueId={selectedVenue.id} />
            <WeatherProfileCard profile={weatherProfile} venue={selectedVenue} />
          </section>

          <section className="mt-8">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Venue Status</p>
              <h2 className="mt-1 text-2xl font-black">Status controls</h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {venueStatusTemplates.map((template) => (
                <OperationForm fields={venueFields} key={template.type} template={template} venueId={selectedVenue.id} />
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Weather Section</p>
              <h2 className="mt-1 text-2xl font-black">Weather and safety controls</h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {weatherTemplates.map((template) => (
                <OperationForm fields={venueFields} key={template.type} template={template} venueId={selectedVenue.id} />
              ))}
            </div>
          </section>

          <div className="mt-8">
            <DelayTracking fields={venueFields} venueId={selectedVenue.id} />
          </div>

          <div className="mt-8">
            <ResetControls fields={venueFields} venueId={selectedVenue.id} />
          </div>

          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Active announcements and alerts</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">These messages appear on public venue pages, public field pages, venue display boards, Game Day Center, and Pilot Launch.</p>
              </div>
              <Link href="/admin/alerts" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                View Alerts
              </Link>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {venueActiveAlerts.length > 0 ? venueActiveAlerts.map((alert) => (
                <article className={`rounded-lg border p-4 ${getAlertTone(alert.alertType)}`} key={alert.id}>
                  <p className="text-xs font-black uppercase tracking-[0.14em]">{getAlertLabel(alert.alertType)} · {alert.alertPriority.toUpperCase()}</p>
                  <h3 className="mt-1 text-lg font-black">{alert.title}</h3>
                  <p className="mt-2 text-sm leading-6">{alert.message}</p>
                </article>
              )) : (
                <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No active operations announcements for this venue.</p>
              )}
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Current Status</p>
                <h2 className="mt-1 text-xl font-black">{venueStatus}</h2>
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
          </section>
        </>
      )}
    </section>
  );
}
