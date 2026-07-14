import { redirect } from "next/navigation";

type VenueCommandCenterAliasPageProps = {
  searchParams?: Promise<{
    venueId?: string;
  }>;
};

export default async function VenueCommandCenterAliasPage({ searchParams }: VenueCommandCenterAliasPageProps) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();

  if (resolvedSearchParams?.venueId) {
    params.set("venueId", resolvedSearchParams.venueId);
  }

  redirect(`/admin/command-center${params.size > 0 ? `?${params.toString()}` : ""}`);
}
