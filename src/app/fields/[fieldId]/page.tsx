type FieldPageProps = {
  params: Promise<{
    fieldId: string;
  }>;
};

export default async function PublicFieldPage({ params }: FieldPageProps) {
  const { fieldId } = await params;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
        <div className="bg-[var(--foreground)] p-6 text-white sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/65">Public field page</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Field {fieldId}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
            A QR-accessible field page shell for visitors, teams, and venue staff.
          </p>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <div className="rounded-lg border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Status</p>
            <p className="mt-2 text-xl font-black">Not configured</p>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Session</p>
            <p className="mt-2 text-xl font-black">No session</p>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Sponsor</p>
            <p className="mt-2 text-xl font-black">Open slot</p>
          </div>
        </div>

        <div className="border-t border-[var(--line)] p-5 sm:p-6">
          <h2 className="text-lg font-black">Visitor information</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            This page is ready for venue-specific field details once the admin workflow is connected.
          </p>
        </div>
      </div>
    </section>
  );
}
