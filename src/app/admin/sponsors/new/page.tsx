import Link from "next/link";
import { SponsorForm } from "./sponsor-form";

export default function NewSponsorPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/sponsors" className="text-sm font-bold text-[var(--accent-strong)]">
        Back to sponsors
      </Link>
      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sponsors</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Create sponsor</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Add a sponsor profile with optional logo and website links. Assign it to venues, fields, or sessions from the sponsor list.
        </p>
      </div>

      <SponsorForm />
    </section>
  );
}
