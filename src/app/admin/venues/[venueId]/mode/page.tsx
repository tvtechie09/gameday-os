import Image from "next/image";
import Link from "next/link";
import { CopyLinkButton } from "@/components/copy-link-button";
import { redirect } from "next/navigation";
import { getVenueModeData, type VenueModeScheduleGroup } from "@/lib/services/venue-mode";
import { venueModeProviderDefinitions } from "@/lib/venue-mode-providers";
import { getSessionContext } from "@/lib/access/session";
import { venueInScope } from "@/lib/access/capabilities";
import type { FieldStatus, VenueModeEndpoint } from "@/lib/types";

type VenueModePageProps = {
  params: Promise<{ venueId: string }>;
};

export const dynamic = "force-dynamic";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: FieldStatus) {
  const classes: Record<FieldStatus, string> = {
    active: "bg-green-600 text-white",
    closed: "bg-red-100 text-red-900 ring-1 ring-red-200",
    delayed: "bg-amber-100 text-amber-950 ring-1 ring-amber-200",
    maintenance: "bg-slate-200 text-slate-900 ring-1 ring-slate-300",
    open: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  };

  return classes[status];
}

function endpointStatusClass(endpoint: VenueModeEndpoint) {
  if (endpoint.status === "active") {
    return "bg-green-600 text-white";
  }

  if (endpoint.status === "error" || endpoint.status === "offline") {
    return "bg-red-100 text-red-900 ring-1 ring-red-200";
  }

  if (endpoint.status === "configured") {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ScheduleGroupCard({ group }: { group: VenueModeScheduleGroup }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">{group.surfaceName}</h3>
          {group.surfaceCode ? <p className="text-sm font-bold text-[var(--muted)]">Surface {group.surfaceCode}</p> : null}
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${statusClass(group.status)}`}>
          {group.status}
        </span>
      </div>

      {group.sessions.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {group.sessions.map((session) => (
            <div key={session.id} className="rounded-lg bg-[var(--background)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black">{session.title}</p>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-[var(--accent-strong)]">{formatTime(session.startTime)}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                {session.homeTeam} vs {session.awayTeam}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{session.sportType}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No sessions scheduled on this surface today.</p>
      )}
    </article>
  );
}

export default async function VenueModePage({ params }: VenueModePageProps) {
  const { venueId } = await params;
  const data = await getVenueModeData(venueId);

  // Venue-scoped roles may only manage their own venue.
  if (data && !venueInScope(await getSessionContext(), data.venue)) {
    redirect("/admin/venues");
  }

  if (!data) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/venues" className="text-sm font-bold text-[var(--accent-strong)]">
          Back to venues
        </Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Venue not found</h1>
        </div>
      </section>
    );
  }

  const equipmentEndpoints = data.endpoints.filter((endpoint) => endpoint.endpointType !== "qr_entry");
  const mapMarkers = [
    ...data.zones.map((zone) => ({
      id: `zone:${zone.id}`,
      label: zone.mapLabel ?? zone.name,
      mapX: zone.mapX,
      mapY: zone.mapY,
      tone: "bg-black text-white",
    })),
    ...data.playSurfaces.map((surface) => ({
      id: `surface:${surface.id}`,
      label: surface.mapLabel ?? surface.surfaceCode ?? surface.name,
      mapX: surface.mapX,
      mapY: surface.mapY,
      tone: surface.status === "delayed" || surface.status === "closed" || surface.status === "maintenance" ? "bg-amber-500 text-black" : "bg-[var(--accent)] text-white",
    })),
  ].filter((marker) => typeof marker.mapX === "number" && typeof marker.mapY === "number");

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/venues" className="text-sm font-bold text-[var(--accent-strong)]">
            Back to venues
          </Link>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Venue Mode</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{data.venue.name}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Complex venue operations shell for zones, parent fields, split play surfaces, QR entry points, and future equipment endpoints.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={`/api/venues/${data.venue.id}/mode`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
            Open API
          </Link>
          <Link href={`/venues/${data.venue.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white">
            Public Venue
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold text-[var(--muted)]">Play surfaces</p>
          <p className="mt-2 text-3xl font-black">{data.liveStatus.totalSurfaces}</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold text-[var(--muted)]">Active sessions</p>
          <p className="mt-2 text-3xl font-black">{data.liveStatus.activeSessions}</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold text-[var(--muted)]">Delayed</p>
          <p className="mt-2 text-3xl font-black">{data.liveStatus.delayedSurfaces}</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold text-[var(--muted)]">Closed</p>
          <p className="mt-2 text-3xl font-black">{data.liveStatus.closedSurfaces}</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold text-[var(--muted)]">Endpoints</p>
          <p className="mt-2 text-3xl font-black">{data.endpoints.length}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Venue Map</p>
              <h2 className="mt-1 text-2xl font-black">Zones and play surfaces</h2>
            </div>
            <span className="text-sm font-bold text-[var(--muted)]">{data.zones.length} zones</span>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)]">
            {data.venue.mapImageUrl ? (
              <div className="relative aspect-[4/3] min-h-[280px]">
                <Image
                  alt={`${data.venue.name} venue map`}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1280px) 55vw, 100vw"
                  src={data.venue.mapImageUrl}
                  unoptimized
                />
                {mapMarkers.map((marker) => (
                  <span
                    className={`absolute min-h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-center text-xs font-black shadow-sm ${marker.tone}`}
                    key={marker.id}
                    style={{ left: `${marker.mapX}%`, top: `${marker.mapY}%` }}
                  >
                    {marker.label}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[280px] flex-col justify-center p-6 text-center">
                <h3 className="text-xl font-black">No venue map configured</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                  Add a venue map image and coordinates to plot zones, parent fields, and split play surfaces.
                </p>
              </div>
            )}
          </div>

          {data.venue.mapNotes ? <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">{data.venue.mapNotes}</p> : null}
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-5 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Field Layouts</p>
          <h2 className="mt-1 text-2xl font-black">Parent fields and splits</h2>
          {data.fieldLayouts.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {data.fieldLayouts.map((layout) => (
                <article key={layout.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-black">{layout.layoutName}</h3>
                    <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-black uppercase tracking-[0.1em]">{titleCase(layout.layoutType)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white/70">{layout.playSurfaceIds.length} linked play surfaces</p>
                  {layout.notes ? <p className="mt-3 text-sm leading-6 text-white/75">{layout.notes}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg bg-white/5 p-4 text-sm leading-6 text-white/70">
              No field layouts yet. Use this foundation for layouts like Field 3 full field or Field 3 split into 3A, 3B, and 3C.
            </p>
          )}
        </section>
      </div>

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Today</p>
            <h2 className="mt-1 text-2xl font-black">Schedule by play surface</h2>
          </div>
          <span className="text-sm font-bold text-[var(--muted)]">{data.sessionsToday.length} sessions today</span>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.scheduleBySurface.length > 0 ? (
            data.scheduleBySurface.map((group) => <ScheduleGroupCard group={group} key={group.surfaceId} />)
          ) : (
            <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm font-semibold text-[var(--muted)]">No play surfaces or sessions are configured for today.</p>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">QR Entry Points</p>
          <h2 className="mt-1 text-2xl font-black">Public access links</h2>
          <div className="mt-5 grid gap-3">
            {data.qrEntries.map((entry) => (
              <div key={`${entry.entryType}:${entry.fieldId ?? entry.endpointId ?? entry.url}`} className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
                <p className="text-sm font-black">{entry.label}</p>
                <code className="mt-2 block break-all text-xs font-bold text-[var(--muted)]">{entry.url}</code>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <CopyLinkButton label="Copy Link" value={entry.url} />
                  <Link href={entry.url} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Equipment Endpoints</p>
          <h2 className="mt-1 text-2xl font-black">Provider-ready shell</h2>
          {equipmentEndpoints.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {equipmentEndpoints.map((endpoint) => (
                <article key={endpoint.id} className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-black">{endpoint.endpointLabel}</h3>
                    <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${endpointStatusClass(endpoint)}`}>
                      {titleCase(endpoint.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                    {titleCase(endpoint.providerKey)} · {titleCase(endpoint.endpointType)}
                  </p>
                  {endpoint.endpointUrl ? <code className="mt-3 block break-all text-xs font-bold text-[var(--muted)]">{endpoint.endpointUrl}</code> : null}
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Updated {formatDateTime(endpoint.updatedAt)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
              No equipment endpoints configured. This is ready for future scoreboard, camera, location, display, and API endpoints.
            </p>
          )}

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-black text-amber-950">Provider implementation status</h3>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Meraki and Cisco Spaces are represented as future provider contracts only. Venue Mode does not call external provider APIs yet.
            </p>
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Future Providers</p>
        <h2 className="mt-1 text-2xl font-black">Interface registry</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {venueModeProviderDefinitions.map((provider) => (
            <article key={provider.key} className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-black">{provider.name}</h3>
                <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${provider.implemented ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-200 text-slate-800"}`}>
                  {provider.implemented ? "Ready" : "Future"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{provider.description}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{provider.capabilities.length} capabilities</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
