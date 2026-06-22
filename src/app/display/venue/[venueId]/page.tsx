import { getVenueDisplayPayload } from "@/lib/services/venue-display";
import { VenueDisplayBoard } from "../venue-display-board";

type VenueDisplayPageProps = {
  params: Promise<{
    venueId: string;
  }>;
  searchParams?: Promise<{
    compact?: string;
    sponsor?: string;
    theme?: string;
  }>;
};

export const dynamic = "force-dynamic";

function readTheme(value: string | undefined) {
  return value === "light" ? "light" : "dark";
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export default async function VenueDisplayPage({ params, searchParams }: VenueDisplayPageProps) {
  const { venueId } = await params;
  const options = await searchParams;
  const payload = await getVenueDisplayPayload(venueId);

  return (
    <VenueDisplayBoard
      apiPath={`/api/display/venue/${venueId}`}
      compact={readBoolean(options?.compact, false)}
      initialPayload={payload}
      showSponsor={readBoolean(options?.sponsor, true)}
      theme={readTheme(options?.theme)}
    />
  );
}
