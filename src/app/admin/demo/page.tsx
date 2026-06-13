import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DemoDataPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="ui-card p-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Demo data</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Demo data review</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          GameDay OS does not include an automated demo-data cleanup tool yet. Use System Health to identify likely demo, sample, or test records before a real pilot.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link className="ui-button ui-button-primary" href="/admin/system-health">
            Open System Health
          </Link>
          <Link className="ui-button ui-button-secondary" href="/admin/venues">
            Review Venues
          </Link>
        </div>
      </div>
    </section>
  );
}
