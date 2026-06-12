import Link from "next/link";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import type { Field, Session, Venue } from "@/lib/types";
import { BulkSessionTools } from "./bulk-session-tools";

export const dynamic = "force-dynamic";

export default async function BulkSessionsPage() {
  let venues: Venue[] = [];
  let fields: Field[] = [];
  let sessions: Session[] = [];
  let errorMessage: string | null = null;

  try {
    [venues, fields, sessions] = await Promise.all([getVenues(), getFields(), getSessions()]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load bulk session tools.";
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sessions</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Bulk session tools</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Preview and manage many sessions at once: update status, move fields, shift times, duplicate game days, or safely delete bad imports.
          </p>
        </div>
        <Link href="/admin/sessions/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
          New session
        </Link>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load bulk tools</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <BulkSessionTools fields={fields} sessions={sessions} venues={venues} />
      )}
    </section>
  );
}
