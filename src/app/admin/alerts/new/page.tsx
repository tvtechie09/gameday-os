import Link from "next/link";
import { getFields } from "@/lib/services/fields";
import { getTournaments } from "@/lib/services/tournaments";
import { getVenues } from "@/lib/services/venues";
import { AlertForm } from "./alert-form";

export const dynamic = "force-dynamic";

export default async function NewAlertPage() {
  const [venues, fields, tournaments] = await Promise.all([getVenues(), getFields(), getTournaments()]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/alerts" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to alerts
      </Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Communications</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create alert</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Share important venue, tournament, or field-specific updates with parents and coaches.
        </p>
      </div>
      <AlertForm fields={fields} tournaments={tournaments} venues={venues} />
    </section>
  );
}
