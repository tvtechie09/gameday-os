import { FieldQrCode } from "@/components/field-qr-code";
import { PrintDownloadButton } from "@/components/print-download-button";
import { getPublicVenueDisplayUrl, getPublicVenueUrl, publicAppUrlPointsToLocalhost } from "@/lib/public-url";
import { getVenue } from "@/lib/services/venues";
import type { Venue } from "@/lib/types";

type VenueQrPageProps = {
  params: Promise<{
    venueId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function VenueQrPage({ params }: VenueQrPageProps) {
  const { venueId } = await params;
  const publicVenueUrl = getPublicVenueUrl(venueId);
  const publicVenueDisplayUrl = getPublicVenueDisplayUrl(venueId);
  const publicUrlIsLocalhost = publicAppUrlPointsToLocalhost();
  let venue: Venue | null = null;
  let errorMessage: string | null = null;

  try {
    venue = await getVenue(venueId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load venue QR page.";
  }

  return (
    <section className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[8.5in] justify-end print:hidden">
        <PrintDownloadButton />
      </div>

      {publicUrlIsLocalhost ? (
        <div className="mx-auto mb-4 max-w-[8.5in] rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 print:hidden">
          This venue QR points to localhost. Set NEXT_PUBLIC_APP_URL to the deployed site before field testing.
        </div>
      ) : null}

      <div className="mx-auto flex min-h-[11in] max-w-[8.5in] flex-col justify-between rounded-lg border border-[var(--line)] bg-white p-8 text-center shadow-sm print:min-h-screen print:max-w-none print:rounded-none print:border-0 print:p-[0.65in] print:shadow-none">
        <div>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-[var(--black-soft)] text-xl font-black text-white">
            GD
          </div>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">GameDay OS</p>

          {errorMessage ? (
            <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5 text-left">
              <h1 className="text-xl font-black text-red-950">Unable to load venue QR page</h1>
              <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-4xl font-black leading-tight print:text-5xl">{venue?.name ?? "Venue unavailable"}</h1>
              <p className="mt-4 text-3xl font-black leading-tight print:text-4xl">Scan for live game info.</p>
              <p className="mx-auto mt-4 max-w-xl text-lg font-bold leading-8 text-[var(--muted)] print:text-xl">
                View fields, current games, today&apos;s schedule, alerts, sponsors, and venue info.
              </p>

              <div className="mx-auto mt-10 w-fit rounded-lg border border-[var(--line)] bg-white p-5 print:mt-12">
                <FieldQrCode title="GameDay OS venue link QR code" value={publicVenueUrl} size={300} />
              </div>

              <p className="mx-auto mt-8 max-w-xl break-all rounded-lg bg-[var(--background)] p-4 text-sm font-bold text-[var(--muted)] print:text-base">
                {publicVenueUrl}
              </p>
              <p className="mx-auto mt-3 max-w-xl break-all text-xs font-bold text-[var(--muted)] print:text-sm">
                Venue display: {publicVenueDisplayUrl}
              </p>
            </>
          )}
        </div>

        <footer className="mt-10 border-t border-[var(--line)] pt-5 text-sm font-bold text-[var(--muted)]">
          Powered by GameDay OS
        </footer>
      </div>
    </section>
  );
}
