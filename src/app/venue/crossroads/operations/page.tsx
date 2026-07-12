import Link from "next/link";
import { AssetRegister } from "@/components/assets/asset-register";
import { CrossroadsEquipmentGrid, CrossroadsPageShell, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import { CommunityDashboard, FutureVisionPhasesPanel, OperationsTabSummary } from "@/components/crossroads/mayor-demo-panels";
import { MaintenanceRequestCenter } from "@/components/maintenance/maintenance-request-center";
import { crossroadsFields, getVenueOperationsContext } from "@/lib/demo/crossroads";
import { crossroadsAssets, getAssetRelatedMaintenance } from "@/lib/demo/crossroads-gm";
import { getCrossroadsInfrastructureContext } from "@/lib/demo/crossroads-infrastructure";
import { getCrossroadsMaintenanceLocationLabels } from "@/lib/demo/crossroads-maintenance";
import { getCrossroadsSafetyContext } from "@/lib/demo/crossroads-safety";
import { getCrossroadsScoreboardFeedHealth } from "@/lib/scoreboard-feed";

export default function CrossroadsOperationsPage() {
  const context = getVenueOperationsContext();
  const locationLabels = getCrossroadsMaintenanceLocationLabels();
  const relatedMaintenance = Object.fromEntries(crossroadsAssets.map((asset) => [asset.id, getAssetRelatedMaintenance(asset)]));
  const scoreboardFeedHealth = getCrossroadsScoreboardFeedHealth();
  const scoreboardFeedIssues = scoreboardFeedHealth.filter((item) => item.providerHealth.status === "offline" || item.providerHealth.status === "stale");
  const safety = getCrossroadsSafetyContext();
  const infrastructure = getCrossroadsInfrastructureContext();

  return (
    <CrossroadsPageShell eyebrow="Operations Center" title="Crossroads Operations Center">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Fields" value={context.health.totalFields} />
        <Metric label="Active Games" value={context.health.activeGames} />
        <Metric label="Delayed Games" value={context.health.delayedGames} />
        <Metric label="Maintenance" value={context.health.maintenanceFields} />
        <Metric label="Configured Endpoints" value={context.health.equipmentConfigured} />
      </div>

      <section className="mt-8">
        <OperationsTabSummary />
      </section>

      <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-950">Weather / Emergency Placeholder</p>
        <h2 className="mt-2 text-2xl font-black text-amber-950">Manual alert center</h2>
        <div className="mt-4 grid gap-3">
          {context.activeAlerts.map((alert) => <p className="rounded-lg bg-white p-3 text-sm font-bold text-amber-950" key={alert}>{alert}</p>)}
        </div>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-red-900">Safety and Emergency Foundation</p>
          <h2 className="mt-2 text-2xl font-black text-red-950">Active safety notices</h2>
          <div className="mt-4 grid gap-3">
            {safety.activeNotices.map((notice) => (
              <article className="rounded-lg bg-white p-4" key={notice.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-red-950">{notice.title}</h3>
                  <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-red-900">{notice.priority}</span>
                </div>
                <p className="mt-2 text-sm font-bold leading-6 text-red-900">{notice.message}</p>
                {notice.futureIntegrationLabel ? <p className="mt-2 text-xs font-bold text-red-800">{notice.futureIntegrationLabel}</p> : null}
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Emergency Message Preview</p>
          <h2 className="mt-2 text-2xl font-black">Display and notification targets</h2>
          <div className="mt-4 grid gap-3">
            {safety.emergencyScenarios.slice(0, 4).map((scenario) => (
              <div className="rounded-lg bg-[var(--background)] p-3" key={scenario.id}>
                <p className="text-sm font-black">{scenario.title}</p>
                <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">{scenario.publicMessage}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--accent-strong)]">Future/partner approval required</p>
              </div>
            ))}
          </div>
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

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Shelter Locations</p>
          <div className="mt-4 grid gap-3">
            {safety.shelterLocations.map((location) => (
              <div className="rounded-lg bg-[var(--background)] p-3" key={location.id}>
                <p className="text-sm font-black">{location.name}</p>
                <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">{location.directions}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Infrastructure and Access Awareness</p>
          <div className="mt-4 grid gap-3">
            {infrastructure.accessAreas.map((area) => (
              <div className="rounded-lg bg-[var(--background)] p-3" key={area.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black">{area.name}</p>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]">{area.accessSystem}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{area.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Scoreboard Feed Health</p>
            <h2 className="mt-2 text-2xl font-black">Daktronics read-only input visibility</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">
              Mock read-only All Sport feed health by field/play surface. This never writes to or controls physical scoreboards.
            </p>
          </div>
          <Link className="ui-button ui-button-secondary" href="/demo/crossroads/tv">
            Open Bar TV Dashboard
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {scoreboardFeedHealth.map((item) => (
            <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={item.normalized.gameId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{item.fieldName} · {item.surfaceCode}</h3>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{item.normalized.homeTeam} vs {item.normalized.awayTeam}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${item.providerHealth.status === "healthy" ? "bg-green-50 text-green-800" : item.providerHealth.status === "stale" ? "bg-amber-100 text-amber-950" : "bg-red-100 text-red-900"}`}>
                  {item.providerHealth.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.providerHealth.message}</p>
              {(item.providerHealth.status === "offline" || item.providerHealth.status === "stale") ? (
                <Link className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black" href={item.maintenanceRoute}>
                  Create maintenance request
                </Link>
              ) : null}
            </article>
          ))}
        </div>
        {scoreboardFeedIssues.length > 0 ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-black text-amber-950">
            {scoreboardFeedIssues.length} scoreboard feed issue{scoreboardFeedIssues.length === 1 ? "" : "s"} need review. Manual GameDay OS score entry remains available.
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <CommunityDashboard />
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

      <section className="mt-8">
        <FutureVisionPhasesPanel />
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
