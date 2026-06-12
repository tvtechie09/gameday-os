import Link from "next/link";
import { TournamentForm } from "./tournament-form";

export default function NewTournamentPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/tournaments" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to tournaments
      </Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Tournament setup</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create a tournament</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Group sessions into one tournament experience for admins and public field pages.
        </p>
      </div>
      <TournamentForm />
    </section>
  );
}
