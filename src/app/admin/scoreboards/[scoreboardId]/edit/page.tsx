import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicFieldScoreboardUrl } from "@/lib/public-url";
import { getResources } from "@/lib/services/resources";
import { getScoreboardProfile } from "@/lib/services/scoreboards";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { ScoreboardForm } from "../../scoreboard-form";

type EditScoreboardProfilePageProps = {
  params: Promise<{
    scoreboardId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditScoreboardProfilePage({ params }: EditScoreboardProfilePageProps) {
  const { scoreboardId } = await params;
  const [profile, scoped, resources] = await Promise.all([getScoreboardProfile(scoreboardId), getScopedVenuesAndFields(), getResources()]);
  const { venues, fields } = scoped;

  // Object-level authorization: only edit scoreboard profiles for an in-scope venue.
  if (!profile || !scoped.venues.some((venue) => venue.id === profile.venueId)) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/scoreboards" className="text-sm font-bold text-[var(--accent-strong)]">Back to scoreboards</Link>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Scoreboard profile</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit scoreboard profile</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Update connection notes, sync status, and the field this profile belongs to.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/admin/scoreboards/display?venue=${profile.venueId}&field=${profile.fieldId}`} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Display controls
          </Link>
          <Link href={getPublicFieldScoreboardUrl(profile.fieldId)} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--black-soft)] px-5 py-3 text-sm font-bold text-white">
            Open display
          </Link>
        </div>
      </div>
      <ScoreboardForm fields={fields} profile={profile} resources={resources} venues={venues} />
    </section>
  );
}
