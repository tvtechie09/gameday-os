import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import type { Field, Session, Venue } from "@/lib/types";
import { IntegrationsClient } from "./integrations-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  let venues: Venue[] = [];
  let fields: Field[] = [];
  let sessions: Session[] = [];
  let errorMessage: string | null = null;

  try {
    [venues, fields, sessions] = await Promise.all([getVenues(), getFields(), getSessions()]);
  } catch (error) {
    console.error("Failed to load integrations data", error);
    errorMessage = error instanceof Error ? error.message : "Unable to load integration data.";
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Integrations</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">External schedule import</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
          Import sessions from CSV exports and public calendar feeds without requiring full API credentials.
        </p>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load integrations</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <IntegrationsClient fields={fields} sessions={sessions} venues={venues} />
      )}
    </section>
  );
}
