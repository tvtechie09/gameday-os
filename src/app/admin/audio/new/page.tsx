import Link from "next/link";
import { getSessions } from "@/lib/services/sessions";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { AudioProfileForm } from "../audio-profile-form";

export const dynamic = "force-dynamic";

export default async function NewAudioProfilePage() {
  const [scoped, sessions] = await Promise.all([getScopedVenuesAndFields(), getSessions()]);
  const { venues, fields } = scoped;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/audio" className="text-sm font-bold text-[var(--accent-strong)]">Back to audio</Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Audio profile</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create audio profile</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Document field audio readiness for parent speakers, venue PA, OBS audio, or future integrations.
        </p>
      </div>
      <AudioProfileForm fields={fields} sessions={sessions} venues={venues} />
    </section>
  );
}
