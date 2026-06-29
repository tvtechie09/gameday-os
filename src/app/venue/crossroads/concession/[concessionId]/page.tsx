import { CrossroadsPageShell, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import { crossroadsAmenities } from "@/lib/demo/crossroads";

type ConcessionPageProps = {
  params: Promise<{ concessionId: string }>;
};

export default async function CrossroadsConcessionPage({ params }: ConcessionPageProps) {
  const { concessionId } = await params;
  const concession = crossroadsAmenities.find((item) => item.type === "concession" && item.id === `concession-${concessionId}`);

  if (!concession) {
    return (
      <CrossroadsPageShell eyebrow="Concession QR" title="Concession not found">
        <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm font-bold text-[var(--muted)]">That Crossroads demo concession point does not exist.</p>
      </CrossroadsPageShell>
    );
  }

  return (
    <CrossroadsPageShell eyebrow="Concession QR" title={concession.label}>
      <section className="max-w-3xl rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Concession stop</h2>
          {concession.status ? <CrossroadsStatusBadge status={concession.status} /> : null}
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{concession.description}</p>
        <p className="mt-5 rounded-lg bg-[var(--background)] p-4 text-sm font-bold text-[var(--muted)]">Menu, hours, and mobile ordering are placeholders for a future venue/family mode workflow.</p>
      </section>
    </CrossroadsPageShell>
  );
}
