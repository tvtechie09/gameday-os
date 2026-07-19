import Link from "next/link";
import { getResources } from "@/lib/services/resources";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { ScoreboardForm } from "../scoreboard-form";

export const dynamic = "force-dynamic";

export default async function NewScoreboardProfilePage() {
  const [scoped, resources] = await Promise.all([getScopedVenuesAndFields(), getResources()]);
  const { venues, fields } = scoped;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/scoreboards" className="text-sm font-bold text-[var(--accent-strong)]">Back to scoreboards</Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Scoreboard profile</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create scoreboard profile</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Document how a field scoreboard should operate today and what kind of integration it may support later.
        </p>
      </div>
      <ScoreboardForm fields={fields} resources={resources} venues={venues} />
    </section>
  );
}
