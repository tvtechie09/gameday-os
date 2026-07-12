import { FieldForm } from "./field-form";
import { publicErrorMessage } from "@/lib/public-error";
import { getVenues } from "@/lib/services/venues";
import type { Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewFieldPage() {
  let venues: Venue[] = [];
  let errorMessage: string | null = null;

  try {
    venues = await getVenues();
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load venues.");
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Field setup</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create a field</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Save a real field to Supabase and assign it to a venue.
        </p>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load venues</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <FieldForm venues={venues} />
      )}
    </section>
  );
}
