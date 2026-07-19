import Link from "next/link";
import { notFound } from "next/navigation";
import { getAudioProfile } from "@/lib/services/audio-profiles";
import { getSessions } from "@/lib/services/sessions";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { AudioProfileForm } from "../../audio-profile-form";

type EditAudioProfilePageProps = {
  params: Promise<{
    audioProfileId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditAudioProfilePage({ params }: EditAudioProfilePageProps) {
  const { audioProfileId } = await params;
  const [profile, scoped, sessions] = await Promise.all([getAudioProfile(audioProfileId), getScopedVenuesAndFields(), getSessions()]);
  const { venues, fields } = scoped;

  // Object-level authorization: only edit audio profiles for an in-scope venue.
  if (!profile || !scoped.venues.some((venue) => venue.id === profile.venueId)) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/audio" className="text-sm font-bold text-[var(--accent-strong)]">Back to audio</Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Audio profile</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Edit audio profile</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Update audio mode, speaker/provider details, and operational status.
        </p>
      </div>
      <AudioProfileForm fields={fields} profile={profile} sessions={sessions} venues={venues} />
    </section>
  );
}
