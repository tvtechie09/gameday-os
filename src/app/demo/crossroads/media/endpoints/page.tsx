import Link from "next/link";
import { CrossroadsPageShell } from "@/components/crossroads/crossroads-ui";
import { DistributionEndpointGrid, RoutingMatrix } from "@/components/crossroads/media-engine-panels";
import { getCrossroadsMediaEngineContext } from "@/lib/demo/crossroads-media";

export const dynamic = "force-dynamic";

export default function CrossroadsMediaEndpointsPage() {
  const context = getCrossroadsMediaEngineContext();

  return (
    <CrossroadsPageShell
      actions={<Link className="ui-button ui-button-secondary" href="/demo/crossroads/media">Back to Media Engine</Link>}
      eyebrow="Media Engine"
      title="Distribution Endpoints"
    >
      <DistributionEndpointGrid channels={context.channels} endpoints={context.distributionEndpoints} />
      <section className="mt-8">
        <RoutingMatrix />
      </section>
    </CrossroadsPageShell>
  );
}
