import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyPilotScriptPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>;
}) {
  const { venueId } = await searchParams;
  redirect(venueId
    ? `/admin/pilot-launch/runbook?venueId=${encodeURIComponent(venueId)}`
    : "/admin/pilot-launch/runbook");
}
