import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { publicErrorMessage } from "@/lib/public-error";
import { getSessions } from "@/lib/services/sessions";
import type { Field, Session, Venue } from "@/lib/types";
import { ImportWizard } from "./import-wizard";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  let venues: Venue[] = [];
  let fields: Field[] = [];
  let sessions: Session[] = [];
  let errorMessage: string | null = null;

  try {
    const [scoped, allSessions] = await Promise.all([getScopedVenuesAndFields(), getSessions()]);
    venues = scoped.venues;
    fields = scoped.fields;
    const fieldIds = new Set(fields.map((field) => field.id));
    sessions = allSessions.filter((session) => fieldIds.has(session.fieldId));
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load import data.");
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Import</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">CSV Session Import</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Upload a schedule CSV, map columns, preview validation, and create sessions in bulk.
        </p>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load import data</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <ImportWizard fields={fields} sessions={sessions} venues={venues} />
      )}
    </section>
  );
}
