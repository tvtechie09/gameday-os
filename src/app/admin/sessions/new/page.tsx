import { SessionForm } from "./session-form";
import { publicErrorMessage } from "@/lib/public-error";
import { getTournaments } from "@/lib/services/tournaments";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import type { Field, Tournament, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewSessionPage() {
  let venues: Venue[] = [];
  let fields: Field[] = [];
  let tournaments: Tournament[] = [];
  let errorMessage: string | null = null;

  try {
    const [scoped, allTournaments] = await Promise.all([getScopedVenuesAndFields(), getTournaments()]);
    venues = scoped.venues;
    fields = scoped.fields;
    tournaments = allTournaments;
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load venues and fields.");
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Session setup</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create a session</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Save a real session to Supabase and attach it to a field.
        </p>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load setup data</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <SessionForm fields={fields} tournaments={tournaments} venues={venues} />
      )}
    </section>
  );
}
