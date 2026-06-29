"use client";

import { useMemo, useState } from "react";
import type { AssetCriticality, AssetLocationType, AssetStatus, AssetType, VenueAsset } from "@/lib/assets";
import { assetCriticalities, assetStatuses, assetTypes, createMaintenanceDraftFromAsset, filterAssets } from "@/lib/assets";
import { createMaintenanceRequest, type MaintenanceRequest } from "@/lib/maintenance";

interface AssetRegisterProps {
  assets: VenueAsset[];
  locationLabels?: Record<string, string>;
  relatedMaintenance: Record<string, MaintenanceRequest[]>;
  title?: string;
}

const locationTypes: Array<AssetLocationType | "all"> = ["all", "venue", "zone", "field", "playSurface", "poi", "building", "equipmentRoom"];

export function AssetRegister({ assets, locationLabels = {}, relatedMaintenance, title = "Asset Register" }: AssetRegisterProps) {
  const [assetType, setAssetType] = useState<AssetType | "all">("all");
  const [status, setStatus] = useState<AssetStatus | "all">("all");
  const [locationType, setLocationType] = useState<AssetLocationType | "all">("all");
  const [criticality, setCriticality] = useState<AssetCriticality | "all">("all");
  const [selectedId, setSelectedId] = useState(assets[0]?.id ?? "");
  const [createdRequest, setCreatedRequest] = useState<MaintenanceRequest | null>(null);

  const visibleAssets = useMemo(() => filterAssets(assets, { assetType, criticality, locationType, status }), [assetType, assets, criticality, locationType, status]);
  const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? visibleAssets[0] ?? assets[0] ?? null;
  const requests = selectedAsset ? relatedMaintenance[selectedAsset.id] ?? relatedMaintenance[selectedAsset.locationId] ?? [] : [];

  function handleCreateMaintenance() {
    if (!selectedAsset) return;

    setCreatedRequest(createMaintenanceRequest(createMaintenanceDraftFromAsset(selectedAsset)));
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">GameDay Venue Assets</p>
            <h2 className="mt-2 text-2xl font-black">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">Lightweight register for venue infrastructure, field equipment, life-safety assets, concessions, signage, and future external asset systems.</p>
          </div>
          <span className="rounded-md bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-amber-950 ring-1 ring-amber-200">External asset system: future integration</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Filter label="Type" onChange={(value) => setAssetType(value as AssetType | "all")} options={["all", ...assetTypes]} value={assetType} />
          <Filter label="Status" onChange={(value) => setStatus(value as AssetStatus | "all")} options={["all", ...assetStatuses]} value={status} />
          <Filter label="Location" onChange={(value) => setLocationType(value as AssetLocationType | "all")} options={locationTypes} value={locationType} />
          <Filter label="Criticality" onChange={(value) => setCriticality(value as AssetCriticality | "all")} options={["all", ...assetCriticalities]} value={criticality} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-3">
          {visibleAssets.map((asset) => (
            <button className={`rounded-lg border p-4 text-left ${selectedAsset?.id === asset.id ? "border-[var(--accent)] bg-emerald-50" : "border-[var(--line)] bg-white"}`} key={asset.id} onClick={() => setSelectedId(asset.id)} type="button">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black">{asset.name}</p>
                  <p className="mt-1 text-sm font-bold text-[var(--muted)]">{asset.manufacturer} · {asset.model}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge value={asset.status} />
                  <Badge value={asset.criticality} />
                </div>
              </div>
              <p className="mt-3 text-sm font-bold text-[var(--muted)]">{locationLabels[asset.locationId] ?? asset.locationId} · {asset.assetType.replace("_", " ")}</p>
            </button>
          ))}
          {visibleAssets.length === 0 ? <div className="rounded-lg border border-dashed border-[var(--line)] bg-white p-6 text-sm font-bold text-[var(--muted)]">No assets match these filters.</div> : null}
        </div>

        <aside className="rounded-lg border border-[var(--line)] bg-white p-5 xl:sticky xl:top-4 xl:self-start">
          {selectedAsset ? (
            <>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Asset Detail</p>
              <h3 className="mt-2 text-2xl font-black">{selectedAsset.name}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted)]">{selectedAsset.notes}</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <Detail label="Location" value={locationLabels[selectedAsset.locationId] ?? selectedAsset.locationId} />
                <Detail label="Status" value={selectedAsset.status} />
                <Detail label="Criticality" value={selectedAsset.criticality} />
                <Detail label="Next Maintenance" value={selectedAsset.nextMaintenanceDue ?? "Not scheduled"} />
                <Detail label="External Asset ID" value={selectedAsset.externalAssetId ?? "Future integration placeholder"} />
              </dl>
              <div className="mt-5">
                <p className="text-sm font-black">Related maintenance requests</p>
                <div className="mt-2 grid gap-2">
                  {requests.length > 0 ? requests.map((request) => (
                    <div className="rounded-lg bg-[var(--background)] p-3" key={request.id}>
                      <p className="text-sm font-black">{request.title}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{request.status} · {request.priority}</p>
                    </div>
                  )) : <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-bold text-[var(--muted)]">No related maintenance requests.</p>}
                </div>
              </div>
              <button className="mt-5 min-h-12 w-full rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" onClick={handleCreateMaintenance} type="button">Create maintenance request from asset</button>
              {createdRequest ? (
                <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-900">Created local request: {createdRequest.title}</p>
              ) : null}
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">External asset and work-order sync is future integration only.</p>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function Filter({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-black">{label}</span>
      <select className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-3">
      <dt className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  const urgent = value === "offline" || value === "life_safety" || value === "maintenance_due";
  return <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.08em] ${urgent ? "bg-amber-100 text-amber-950 ring-1 ring-amber-200" : "bg-slate-100 text-slate-900 ring-1 ring-slate-200"}`}>{value.replace("_", " ")}</span>;
}
