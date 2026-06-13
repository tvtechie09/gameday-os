import { FieldQrCode } from "@/components/field-qr-code";
import { PrintDownloadButton } from "@/components/print-download-button";
import { getPublicFieldUrl, getPublicVenueUrl, hasConfiguredPublicAppUrl } from "@/lib/public-url";
import { getField } from "@/lib/services/fields";
import { getVenue } from "@/lib/services/venues";
import type { Field, Venue } from "@/lib/types";

type FieldQrPageProps = {
  params: Promise<{
    fieldId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function FieldQrPage({ params }: FieldQrPageProps) {
  const { fieldId } = await params;
  const publicFieldUrl = getPublicFieldUrl(fieldId);
  const hasPublicAppUrl = hasConfiguredPublicAppUrl();
  let field: Field | null = null;
  let venue: Venue | null = null;
  let errorMessage: string | null = null;

  try {
    field = await getField(fieldId);
    venue = field ? await getVenue(field.venueId) : null;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load QR page.";
  }

  return (
    <section className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[8.5in] justify-end print:hidden">
        <PrintDownloadButton />
      </div>

      {!hasPublicAppUrl ? (
        <div className="mx-auto mb-4 max-w-[8.5in] rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 print:hidden">
          NEXT_PUBLIC_APP_URL is not set. This QR code points to localhost and is not ready for field testing.
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
              <h1 className="text-xl font-black text-red-950">Unable to load QR page</h1>
              <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-4xl font-black leading-tight print:text-5xl">{venue?.name ?? "Venue unavailable"}</h1>
              <p className="mt-3 text-2xl font-bold text-[var(--muted)] print:text-3xl">{field?.name ?? "Field unavailable"}</p>

              <div className="mx-auto mt-10 w-fit rounded-lg border border-[var(--line)] bg-white p-5 print:mt-12">
                <FieldQrCode value={publicFieldUrl} size={300} />
              </div>

              <p className="mt-10 text-3xl font-black leading-tight print:text-4xl">Scan to connect to this field</p>
              <p className="mx-auto mt-4 max-w-xl text-lg font-bold leading-8 text-[var(--muted)] print:text-xl">
                View current game, upcoming schedule, and field info
              </p>
              <p className="mx-auto mt-6 max-w-xl break-all rounded-lg bg-[var(--background)] p-4 text-sm font-bold text-[var(--muted)] print:text-base">
                {publicFieldUrl}
              </p>
              {venue ? (
                <p className="mx-auto mt-3 max-w-xl break-all text-xs font-bold text-[var(--muted)] print:text-sm">
                  Venue page: {getPublicVenueUrl(venue.id)}
                </p>
              ) : null}
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
