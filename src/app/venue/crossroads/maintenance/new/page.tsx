import { CrossroadsPageShell } from "@/components/crossroads/crossroads-ui";
import { MaintenanceRequestCenter } from "@/components/maintenance/maintenance-request-center";
import { getVenueOperationsContext } from "@/lib/demo/crossroads";
import { getCrossroadsMaintenanceLocationLabel, getCrossroadsMaintenanceLocationLabels } from "@/lib/demo/crossroads-maintenance";
import type { MaintenanceLocationType } from "@/lib/maintenance";

const validLocationTypes: MaintenanceLocationType[] = ["venue", "zone", "field", "playSurface", "poi", "equipment"];

export default async function CrossroadsMaintenanceNewPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string; locationType?: string }>;
}) {
  const params = await searchParams;
  const context = getVenueOperationsContext();
  const locationType = validLocationTypes.includes(params.locationType as MaintenanceLocationType) ? params.locationType as MaintenanceLocationType : "venue";
  const locationId = params.locationId ?? context.venue.id;
  const locationName = getCrossroadsMaintenanceLocationLabel(locationType, locationId);

  return (
    <CrossroadsPageShell eyebrow="Staff QR Entry" title={`Report maintenance: ${locationName}`}>
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-950">Local request intake</p>
        <p className="mt-2 text-sm font-bold leading-6 text-amber-950">
          This creates a local GameDay Venue maintenance request for demo review. CMMS and external ticketing integrations are future integration targets, not live connections.
        </p>
      </div>
      <MaintenanceRequestCenter
        initialLocationId={locationId}
        initialLocationType={locationType}
        locationLabels={getCrossroadsMaintenanceLocationLabels()}
        mode="create"
        requests={context.maintenanceRequests}
        title="Create Maintenance Request"
        venueId={context.venue.id}
      />
    </CrossroadsPageShell>
  );
}
