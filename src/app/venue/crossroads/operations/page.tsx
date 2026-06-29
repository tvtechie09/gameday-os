import Link from "next/link";
import { AssetRegister } from "@/components/assets/asset-register";
import { CrossroadsEquipmentGrid, CrossroadsPageShell, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import { MaintenanceRequestCenter } from "@/components/maintenance/maintenance-request-center";
import { crossroadsFields, getVenueOperationsContext } from "@/lib/demo/crossroads";
import { crossroadsAssets, getAssetRelatedMaintenance } from "@/lib/demo/crossroads-gm";
import { getCrossroadsMaintenanceLocationLabels } from "@/lib/demo/crossroads-maintenance";

export default function CrossroadsOperationsPage() {
  const context = getVenueOperationsContext();
  const locationLabels = getCrossroadsMaintenanceLocationLabels();
  const relatedMaintenance = Object.fromEntries(crossroadsAssets.map((asset) => [asset.id, getAssetRelatedMaintenance(asset)]));

  return (
    <CrossroadsPageShell eyebrow="Venue Operations Mode" title="Crossroads Operations Center">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Fields" value={context.health.totalFields} />
        <Metric label="Active Games" value={context.health.activeGames} />
        <Metric label="Delayed Games" value={context.health.delayedGames} />
        <Metric label="Maintenance" value={context.health.maintenanceFields} />
        <Metric label="Configured Endpoints" value={context.health.equipmentConfigured} />
      </div>

      <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-950">Weather / Emergency Placeholder</p>
        <h2 className="mt-2 text-2xl font-black text-amber-950">Manual alert center</h2>
        <div className="mt-4 grid gap-3">
          {context.activeAlerts.map((alert) => <p className="rounded-lg bg-white p-3 text-sm font-bold text-amber-950" key={alert}>{alert}</p>)}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Field status grid</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {crossroadsFields.map((field) => (
            <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={field.id}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">{field.name}</h3>
                <CrossroadsStatusBadge status={field.status} />
              </div>
              <p className="mt-3 text-sm font-bold text-[var(--muted)]">{field.surfaces.length} play surfaces</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Equipment endpoint placeholders</p>
        <div className="mt-4"><CrossroadsEquipmentGrid equipment={context.equipment.slice(0, 25)} /></div>
      </section>

      <section className="mt-8">
        <MaintenanceRequestCenter
          locationLabels={locationLabels}
          requests={context.maintenanceRequests}
          venueId={context.venue.id}
        />
      </section>

      <section className="mt-8">
        <AssetRegister
          assets={crossroadsAssets}
          locationLabels={locationLabels}
          relatedMaintenance={relatedMaintenance}
          title="Operations Asset Register"
        />
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Staff QR Maintenance Entry</p>
        <h2 className="mt-2 text-2xl font-black">Field, restroom, concession, and equipment request links</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">These routes are GameDay Venue request intake links. External CMMS ticket creation is labeled as a future integration and is not live.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {context.maintenanceQrEntries.slice(0, 9).map((entry) => (
            <Link className="rounded-lg bg-[var(--background)] p-3 text-sm font-bold hover:bg-[var(--accent-soft)]" href={entry.route} key={entry.id}>
              {entry.label}
              <span className="mt-1 block break-all text-xs text-[var(--muted)]">{entry.route}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Announcement Center Placeholder</p>
        <h2 className="mt-2 text-2xl font-black">Venue-wide message drafting</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Future workflow for parking, weather, tournament, concession, and emergency announcements. No push notifications are sent in this demo.</p>
      </section>
    </CrossroadsPageShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-5">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
