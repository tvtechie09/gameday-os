import Link from "next/link";
import Image from "next/image";
import {
  getVenueAssets,
  getVenueAssetCategoryLabel,
  getVenueAssetStatusClass,
  getVenueAssetStatusLabel,
  getVenueAssetTypeLabel,
  getVenueBuildings,
} from "@/lib/services/venue-assets";
import { getFields } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import type { VenueAsset } from "@/lib/types";

export const dynamic = "force-dynamic";

function StatCard({ label, note, value }: { label: string; note: string; value: number }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{note}</p>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-black">{value || "Not configured"}</p>
    </div>
  );
}

function getIssueTone(asset: VenueAsset) {
  if (asset.status === "offline") return "border-red-200 bg-red-50";
  if (asset.status === "maintenance_needed") return "border-amber-200 bg-amber-50";
  return "border-[var(--line)] bg-white";
}

export default async function AssetRegistryPage() {
  const [assets, buildings, venues, fields] = await Promise.all([
    getVenueAssets().catch((error: unknown) => {
      console.error("Failed to load venue assets", error);
      return [];
    }),
    getVenueBuildings().catch((error: unknown) => {
      console.error("Failed to load venue buildings", error);
      return [];
    }),
    getVenues().catch((error: unknown) => {
      console.error("Failed to load venues for assets", error);
      return [];
    }),
    getFields().catch((error: unknown) => {
      console.error("Failed to load fields for assets", error);
      return [];
    }),
  ]);
  const healthyAssets = assets.filter((asset) => asset.status === "healthy");
  const offlineAssets = assets.filter((asset) => asset.status === "offline");
  const maintenanceAssets = assets.filter((asset) => asset.status === "maintenance_needed");
  const unknownAssets = assets.filter((asset) => asset.status === "unknown");
  const connectedAssets = assets.filter((asset) => asset.integrationStatus === "connected");
  const buildingsById = new Map(buildings.map((building) => [building.id, building]));
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const selectedVenue = venues.find((venue) => venue.mapImageUrl && assets.some((asset) => asset.venueId === venue.id && asset.mapX !== null && asset.mapY !== null)) ?? venues[0] ?? null;
  const mapAssets = selectedVenue ? assets.filter((asset) => asset.venueId === selectedVenue.id && asset.mapX !== null && asset.mapY !== null) : [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Digital Venue Platform</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Asset Registry</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Durable venue infrastructure inventory for scoreboards, displays, audio, video, networking, lighting, signs, Wi-Fi, and emergency devices. No hardware control or APIs are active.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link className="ui-button ui-button-secondary" href="/admin/resources">
            Operational Resources
          </Link>
          <Link className="ui-button ui-button-primary" href="/admin/operations-center">
            Venue Command Center
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Healthy" note="Ready infrastructure" value={healthyAssets.length} />
        <StatCard label="Offline" note="Needs immediate review" value={offlineAssets.length} />
        <StatCard label="Maintenance Needed" note="Work order candidates" value={maintenanceAssets.length} />
        <StatCard label="Unknown" note="Needs inspection" value={unknownAssets.length} />
        <StatCard label="Connected" note="Future integration status" value={connectedAssets.length} />
      </section>

      <section className="mt-8 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Venue Map Integration</p>
            <h2 className="mt-1 text-2xl font-black">Asset pins</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Assets can be pinned using map X/Y coordinates. Coordinates are percentage-based so they work with any venue map image.</p>
          </div>
          <span className="rounded-md bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-amber-950 ring-1 ring-amber-200">
            Hardware integrations: future
          </span>
        </div>
        {selectedVenue?.mapImageUrl ? (
          <div className="relative mt-5 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)]">
            <Image alt={`${selectedVenue.name} venue map`} className="h-auto w-full" height={720} src={selectedVenue.mapImageUrl} unoptimized width={1200} />
            {mapAssets.map((asset) => (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--accent)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow"
                key={asset.id}
                style={{ left: `${asset.mapX ?? 0}%`, top: `${asset.mapY ?? 0}%` }}
                title={asset.assetName}
              >
                {getVenueAssetTypeLabel(asset.assetType)}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg bg-[var(--background)] p-5 text-sm font-semibold text-[var(--muted)]">
            Add a venue map image and asset coordinates to see digital asset pins.
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-4">
        {assets.length > 0 ? assets.map((asset) => {
          const venue = venuesById.get(asset.venueId);
          const field = asset.fieldId ? fieldsById.get(asset.fieldId) : null;
          const building = asset.buildingId ? buildingsById.get(asset.buildingId) : null;

          return (
            <article className={`rounded-xl border p-5 shadow-sm ${getIssueTone(asset)}`} key={asset.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                      {getVenueAssetCategoryLabel(asset.assetCategory)}
                    </span>
                    <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getVenueAssetStatusClass(asset.status)}`}>
                      {getVenueAssetStatusLabel(asset.status)}
                    </span>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                      {asset.integrationStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black">{asset.assetName}</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    {venue?.name ?? "Venue unavailable"} · {field?.name ?? building?.name ?? asset.physicalLocation ?? "Venue-wide"}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Detail label="Asset Type" value={getVenueAssetTypeLabel(asset.assetType)} />
                <Detail label="Manufacturer / Model" value={[asset.manufacturer, asset.model].filter(Boolean).join(" · ")} />
                <Detail label="Serial Number" value={asset.serialNumber} />
                <Detail label="IP Address" value={asset.ipAddress} />
                <Detail label="Physical Location" value={asset.physicalLocation} />
                <Detail label="Install Date" value={asset.installationDate} />
                <Detail label="Warranty" value={asset.warrantyEnd} />
                <Detail label="Map Pin" value={asset.mapX !== null && asset.mapY !== null ? `${asset.mapX}, ${asset.mapY}` : null} />
              </div>
              {asset.notes ? <p className="mt-4 text-sm font-semibold leading-6 text-[var(--muted)]">{asset.notes}</p> : null}
              {(asset.photos.length > 0 || asset.manuals.length > 0) ? (
                <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  {asset.photos.length} photos · {asset.manuals.length} manuals
                </p>
              ) : null}
            </article>
          );
        }) : (
          <div className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">No assets yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Apply the Digital Venue Platform migration and add durable assets such as scoreboards, displays, speakers, cameras, network equipment, lights, and emergency devices.</p>
          </div>
        )}
      </section>
    </section>
  );
}
