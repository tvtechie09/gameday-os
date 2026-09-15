import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyPilotPrepPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>;
}) {
  const { venueId } = await searchParams;
  redirect(venueId ? `/admin/pilot-launch?venueId=${encodeURIComponent(venueId)}` : "/admin/pilot-launch");
}
