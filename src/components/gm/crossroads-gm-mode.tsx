"use client";

import { useState } from "react";
import { AssetRegister } from "@/components/assets/asset-register";
import { MaintenanceRequestCenter } from "@/components/maintenance/maintenance-request-center";
import { getVenueOperationsContext } from "@/lib/demo/crossroads";
import {
  crossroadsAssets,
  crossroadsExecutiveKpis,
  crossroadsFieldUtilization,
  crossroadsGmFutureItems,
  crossroadsGmPermissions,
  crossroadsRevenueOpportunities,
  crossroadsUtilizationMetrics,
  getAssetRelatedMaintenance,
} from "@/lib/demo/crossroads-gm";
import { getCrossroadsMaintenanceLocationLabels } from "@/lib/demo/crossroads-maintenance";
import { FutureVisionPanel } from "@/components/demo/future-vision-panel";

const tabs = [
  "Executive Dashboard",
  "Operations Today",
  "Maintenance",
  "Asset Register",
  "Facility Utilization",
  "Revenue Opportunities",
  "Future Roadmap",
] as const;

type Tab = typeof tabs[number];

export function CrossroadsGmMode() {
  const [tab, setTab] = useState<Tab>("Executive Dashboard");
  const operations = getVenueOperationsContext();
  const labels = getCrossroadsMaintenanceLocationLabels();
  const relatedMaintenance = Object.fromEntries(crossroadsAssets.map((asset) => [asset.id, getAssetRelatedMaintenance(asset)]));

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Operations Center · Demo Data</p>
            <h2 className="mt-2 text-3xl font-black">Monday morning venue operating view</h2>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">A leadership-level view of weekend operations, maintenance, asset health, facility utilization, and future revenue opportunities. Data shown here is realistic demo data.</p>
          </div>
          <span className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-emerald-900 ring-1 ring-emerald-200">Visible to GM / executive venue roles</span>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((item) => (
            <button className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-black ${tab === item ? "bg-[var(--black-soft)] text-white" : "border border-[var(--line)] bg-white"}`} key={item} onClick={() => setTab(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </section>

      {tab === "Executive Dashboard" ? <ExecutiveDashboard /> : null}
      {tab === "Operations Today" ? <OperationsToday /> : null}
      {tab === "Maintenance" ? (
        <MaintenanceRequestCenter locationLabels={labels} requests={operations.maintenanceRequests} venueId={operations.venue.id} />
      ) : null}
      {tab === "Asset Register" ? (
        <AssetRegister assets={crossroadsAssets} locationLabels={labels} relatedMaintenance={relatedMaintenance} />
      ) : null}
      {tab === "Facility Utilization" ? <FacilityUtilization /> : null}
      {tab === "Revenue Opportunities" ? <RevenueOpportunities /> : null}
      {tab === "Future Roadmap" ? <FutureVisionPanel items={crossroadsGmFutureItems} /> : null}

      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Permission visibility</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {crossroadsGmPermissions.map((permission) => (
            <div className="rounded-lg bg-[var(--background)] p-3" key={permission.role}>
              <p className="text-sm font-black">{permission.role}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{permission.visible ? "Executive summary visible" : "Executive summary hidden"}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{permission.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ExecutiveDashboard() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {crossroadsExecutiveKpis.map((kpi) => (
        <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={kpi.label}>
          <p className="text-sm font-bold text-[var(--muted)]">{kpi.label}</p>
          <p className="mt-2 text-3xl font-black">{kpi.value}</p>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">{kpi.note}</p>
        </article>
      ))}
    </section>
  );
}

function OperationsToday() {
  const operations = getVenueOperationsContext();
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card title="Operations Today" items={[
        `${operations.health.activeGames} active games`,
        `${operations.health.delayedGames} delayed games`,
        `${operations.health.maintenanceFields} fields in maintenance state`,
        `${operations.activeAlerts.length} active venue operation notices`,
      ]} />
      <Card title="Upcoming events" items={["Summer Classic pool play", "Championship Sunday finals", "Village showcase night", "Fall league registration weekend", "Sponsor appreciation evening"]} />
    </section>
  );
}

function FacilityUtilization() {
  return (
    <section className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {crossroadsUtilizationMetrics.map((metric) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={metric.label}>
            <p className="text-sm font-bold text-[var(--muted)]">{metric.label}</p>
            <p className="mt-2 text-2xl font-black">{metric.value}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{metric.note}</p>
          </article>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Field utilization by field</p>
        <div className="mt-4 grid gap-3">
          {crossroadsFieldUtilization.map((field) => (
            <div className="grid gap-2 sm:grid-cols-[120px_1fr_80px] sm:items-center" key={field.fieldId}>
              <p className="text-sm font-black">{field.fieldName}</p>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--background)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${field.utilization}%` }} />
              </div>
              <p className="text-sm font-black">{field.utilization}% · {field.games} games</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RevenueOpportunities() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {crossroadsRevenueOpportunities.map((item) => (
        <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={item.id}>
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-amber-950 ring-1 ring-amber-200">{item.status}</span>
          <h3 className="mt-3 text-xl font-black">{item.title}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{item.description}</p>
          <p className="mt-4 rounded-lg bg-[var(--background)] p-3 text-sm font-black">{item.value}</p>
        </article>
      ))}
    </section>
  );
}

function Card({ items, title }: { items: string[]; title: string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5">
      <h3 className="text-2xl font-black">{title}</h3>
      <div className="mt-4 grid gap-2">
        {items.map((item) => <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-bold" key={item}>{item}</p>)}
      </div>
    </article>
  );
}
