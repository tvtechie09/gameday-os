import { getFields } from "@/lib/services/fields";
import { getVenues } from "@/lib/services/venues";
import { publicErrorMessage } from "@/lib/public-error";
import { ScheduleImportTool } from "./import-tool";

export const dynamic = "force-dynamic";

export default async function ScheduleImportPage() {
  let fields: Array<{ id: string; name: string; venueId: string }> = [];
  let venues: Array<{ id: string; name: string }> = [];
  let errorMessage: string | null = null;
  try {
    const [allFields, allVenues] = await Promise.all([getFields(), getVenues()]);
    fields = allFields.map((field) => ({ id: field.id, name: field.name, venueId: field.venueId }));
    venues = allVenues.map((venue) => ({ id: venue.id, name: venue.name }));
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load fields for import.");
  }
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Schedule &amp; Games</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Import a schedule</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Paste the weekend&apos;s CSV once instead of typing every game. Rows import as scheduled sessions on the matching fields.
      </p>
      <div className="mt-6">
        {errorMessage ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{errorMessage}</p> : <ScheduleImportTool fields={fields} venues={venues} />}
      </div>
    </div>
  );
}
