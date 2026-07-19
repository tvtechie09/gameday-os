import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createScoreboardDevice, getLatestScoreboardReadings, getScoreboardAdapterLogs, getScoreboardDevices, type ScoreboardConnectionType } from "@/lib/services/daktronics-scoreboard";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";

export const dynamic = "force-dynamic";

const connectionTypes: ScoreboardConnectionType[] = ["local_adapter", "network", "serial", "controller_bridge", "unknown"];

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function stateLine(reading: Awaited<ReturnType<typeof getLatestScoreboardReadings>>[number]["latestReading"]) {
  if (!reading) return "No readings yet";
  const inning = reading.periodLabel ?? (reading.inning ? `Inning ${reading.inning}${reading.topBottom ? ` ${reading.topBottom}` : ""}` : "Period not set");
  return `${reading.homeScore} - ${reading.awayScore} · ${inning} · ${reading.status}`;
}

export default async function DaktronicsIntegrationPage() {
  const actorUserId = process.env.NEXT_PUBLIC_GAMEDAY_ADMIN_ACTOR_USER_ID ?? "";

  async function createDeviceAction(formData: FormData) {
    "use server";

    const actor = process.env.NEXT_PUBLIC_GAMEDAY_ADMIN_ACTOR_USER_ID ?? "";
    const venueId = String(formData.get("venue_id") ?? "").trim();
    const model = String(formData.get("model") ?? "").trim();
    const connectionType = String(formData.get("connection_type") ?? "local_adapter") as ScoreboardConnectionType;
    if (!venueId || !model || !actor) return;

    await createScoreboardDevice({
      adapterKey: String(formData.get("adapter_key") ?? "").trim() || null,
      connectionType,
      controllerModel: String(formData.get("controller_model") ?? "").trim() || null,
      fieldId: String(formData.get("field_id") ?? "").trim() || null,
      ipAddress: String(formData.get("ip_address") ?? "").trim() || null,
      manufacturer: String(formData.get("manufacturer") ?? "Daktronics").trim() || "Daktronics",
      model,
      serialPort: String(formData.get("serial_port") ?? "").trim() || null,
      sport: String(formData.get("sport") ?? "baseball").trim() || "baseball",
      venueId,
    }, actor);
    revalidatePath("/admin/integrations/daktronics");
  }

  const [scoped, allDevices, latest, logs] = await Promise.all([
    getScopedVenuesAndFields().catch((error) => { console.error("Failed to load venues/fields for Daktronics", error); return { venues: [], fields: [] }; }),
    actorUserId ? getScoreboardDevices(actorUserId).catch((error) => { console.error("Failed to load scoreboard devices", error); return []; }) : Promise.resolve([]),
    getLatestScoreboardReadings().catch((error) => { console.error("Failed to load latest scoreboard readings", error); return []; }),
    actorUserId ? getScoreboardAdapterLogs(actorUserId).catch((error) => { console.error("Failed to load scoreboard adapter logs", error); return []; }) : Promise.resolve([]),
  ]);

  const { venues, fields } = scoped;
  const venueIds = new Set(venues.map((venue) => venue.id));
  // Confine devices to in-scope venues.
  const devices = allDevices.filter((device) => venueIds.has(device.venueId));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const latestByDeviceId = new Map(latest.map((item) => [item.device.id, item]));

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
        <Link className="text-sm font-bold text-[var(--accent-strong)]" href="/admin/integrations">Back to integrations</Link>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Read-only integration</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Daktronics Scoreboard Read Integration</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">
              Receive Daktronics All Sport-style readings from a local venue adapter and normalize them into GameDay OS dashboards, overlays, and automation hooks. This phase is read-only and never sends physical scoreboard control commands.
            </p>
          </div>
          <span className="inline-flex min-h-11 items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">Read-only safe</span>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black">Scoreboard devices</h2>
            <div className="mt-4 grid gap-3">
              {devices.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--line)] p-4 text-sm font-semibold text-[var(--muted)]">No Daktronics devices registered yet. Add a read-only device and assign it to a venue or field.</p>
              ) : devices.map((device) => {
                const latestItem = latestByDeviceId.get(device.id);
                const field = device.fieldId ? fieldsById.get(device.fieldId) : null;
                const venue = venuesById.get(device.venueId);
                return (
                  <article className="rounded-lg border border-[var(--line)] p-4" key={device.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black">{device.manufacturer} {device.model}</h3>
                          <span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${latestItem?.isStale ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>{latestItem?.isStale ? "Stale" : device.status}</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venue?.name ?? "Venue"}{field ? ` · ${field.name}` : ""}</p>
                        <p className="mt-2 text-sm font-black">{stateLine(latestItem?.latestReading ?? null)}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Last seen: {formatDate(device.lastSeenAt)} · Adapter key: {device.adapterKey ?? "Not set"}</p>
                      </div>
                      <Link className="ui-button ui-button-secondary min-h-11" href="/admin/scoreboards">Scoreboard Profiles</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black">Adapter logs</h2>
            <div className="mt-3 grid gap-2">
              {logs.length === 0 ? <p className="text-sm font-semibold text-[var(--muted)]">No adapter logs yet.</p> : logs.slice(0, 12).map((log) => (
                <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-semibold" key={log.id}><span className="font-black uppercase">{log.log_level}</span> · {log.message} <span className="text-[var(--muted)]">{formatDate(log.created_at)}</span></p>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm xl:sticky xl:top-32 xl:self-start">
          <h2 className="text-xl font-black">Add read-only device</h2>
          <form action={createDeviceAction} className="mt-4 grid gap-3">
            <label className="grid gap-2"><span className="text-sm font-bold">Venue</span><select className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" name="venue_id" required><option value="">Select venue</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Field</span><select className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" name="field_id"><option value="">Venue-level device</option>{fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Manufacturer</span><input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" defaultValue="Daktronics" name="manufacturer" /></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Model</span><input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" name="model" placeholder="Scoreboard model" required /></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Controller model</span><input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" name="controller_model" placeholder="All Sport 5000" /></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Sport</span><input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" defaultValue="baseball" name="sport" /></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Connection type</span><select className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" name="connection_type">{connectionTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Adapter key</span><input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" name="adapter_key" placeholder="field-6b-controller" /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2"><span className="text-sm font-bold">IP address</span><input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" name="ip_address" /></label><label className="grid gap-2"><span className="text-sm font-bold">Serial port</span><input className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" name="serial_port" placeholder="COM3" /></label></div>
            <button className="ui-button ui-button-primary min-h-11" type="submit">Add Read-Only Device</button>
          </form>
        </aside>
      </section>
    </main>
  );
}
