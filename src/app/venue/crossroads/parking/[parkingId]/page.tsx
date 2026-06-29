import { CrossroadsPageShell, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import { getCrossroadsParkingLot } from "@/lib/demo/crossroads";

type ParkingPageProps = {
  params: Promise<{ parkingId: string }>;
};

export default async function CrossroadsParkingPage({ params }: ParkingPageProps) {
  const { parkingId } = await params;
  const parkingLot = getCrossroadsParkingLot(parkingId);

  if (!parkingLot) {
    return (
      <CrossroadsPageShell eyebrow="Parking QR" title="Parking lot not found">
        <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm font-bold text-[var(--muted)]">That Crossroads demo parking lot does not exist.</p>
      </CrossroadsPageShell>
    );
  }

  return (
    <CrossroadsPageShell eyebrow="Parking QR" title={parkingLot.label}>
      <section className="max-w-3xl rounded-lg border border-[var(--line)] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Parking guidance</h2>
          {parkingLot.status ? <CrossroadsStatusBadge status={parkingLot.status} /> : null}
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{parkingLot.description}</p>
        <p className="mt-5 rounded-lg bg-[var(--background)] p-4 text-sm font-bold text-[var(--muted)]">Directions placeholder: venue routing will avoid storm water ponds and non-navigable landmarks.</p>
      </section>
    </CrossroadsPageShell>
  );
}
