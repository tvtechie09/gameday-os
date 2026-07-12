import Link from "next/link";
import { CrossroadsPageShell } from "@/components/crossroads/crossroads-ui";
import { MediaEngineOverview, MediaSafeguardsPanel } from "@/components/crossroads/media-engine-panels";

export const dynamic = "force-dynamic";

export default function CrossroadsMediaPage() {
  return (
    <CrossroadsPageShell
      actions={
        <>
          <Link className="ui-button ui-button-secondary" href="/demo/crossroads/media/endpoints">Distribution Endpoints</Link>
          <Link className="ui-button ui-button-secondary" href="/demo/crossroads/media/overlay-preview">Overlay Preview</Link>
          <Link className="ui-button ui-button-secondary" href="/demo/crossroads/tv">TV Dashboard</Link>
        </>
      }
      eyebrow="Media Engine"
      title="Crossroads Media Engine"
    >
      <MediaEngineOverview />
      <section className="mt-8">
        <MediaSafeguardsPanel />
      </section>
    </CrossroadsPageShell>
  );
}
