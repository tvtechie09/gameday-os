import Link from "next/link";
import { notFound } from "next/navigation";
import { getFields } from "@/lib/services/fields";
import { getResources } from "@/lib/services/resources";
import { getScoreboardProfile } from "@/lib/services/scoreboards";
import { getVenues } from "@/lib/services/venues";
import { ScoreboardForm } from "../../scoreboard-form";

type EditScoreboardProfilePageProps = {
  params: Promise<{
    scoreboardId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditScoreboardProfilePage({ params }: EditScoreboardProfilePageProps) {
  const { scoreboardId } = await params;
  const [profile, venues, fields, resources] = await Promise.all([getScoreboardProfile(scoreboardId), getVenues(), getFields(), getResources()]);

  if (!profile) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/scoreboards" className="text-sm font-bold text-[var(--accent-strong)]">Back to scoreboards</Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Scoreboard profile</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit scoreboard profile</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Update connection notes, sync status, and the field this profile belongs to.
        </p>
      </div>
      <ScoreboardForm fields={fields} profile={profile} resources={resources} venues={venues} />
    </section>
  );
}
