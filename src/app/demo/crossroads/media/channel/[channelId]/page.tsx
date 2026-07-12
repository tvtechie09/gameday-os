import Link from "next/link";
import { CrossroadsPageShell } from "@/components/crossroads/crossroads-ui";
import { OverlayPreviewCard, RoutingMatrix } from "@/components/crossroads/media-engine-panels";
import { getCrossroadsMediaChannel } from "@/lib/demo/crossroads-media";

export const dynamic = "force-dynamic";

type ChannelPageProps = {
  params: Promise<{
    channelId: string;
  }>;
};

export default async function CrossroadsMediaChannelPage({ params }: ChannelPageProps) {
  const { channelId } = await params;
  const detail = getCrossroadsMediaChannel(channelId);

  if (!detail.channel) {
    return (
      <CrossroadsPageShell eyebrow="Media Engine" title="Media channel not found">
        <Link className="ui-button ui-button-secondary" href="/demo/crossroads/media">Back to Media Engine</Link>
      </CrossroadsPageShell>
    );
  }

  return (
    <CrossroadsPageShell
      actions={<Link className="ui-button ui-button-secondary" href="/demo/crossroads/media">Back to Media Engine</Link>}
      eyebrow="Media Channel"
      title={detail.channel.name}
    >
      <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <article className="rounded-lg border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Channel Detail</p>
          <h2 className="mt-2 text-2xl font-black">{detail.channel.description}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.channel.contentTypes.map((type) => (
              <span className="rounded-md bg-[var(--background)] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--muted)]" key={type}>{type.replaceAll("_", " ")}</span>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Info label="Video Source" value={detail.source?.name ?? "No live source"} />
            <Info label="Overlay" value={detail.template?.name ?? "No overlay"} />
            <Info label="Status" value={detail.channel.status} />
            <Info label="Emergency Override" value={detail.channel.emergencyOverrideEnabled ? "Enabled" : "Not enabled"} />
          </div>
        </article>

        <OverlayPreviewCard />
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Distribution</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {detail.endpoints.map((endpoint) => (
            <article className="rounded-lg bg-[var(--background)] p-4" key={endpoint.id}>
              <h3 className="font-black">{endpoint.name}</h3>
              <p className="mt-2 text-sm font-bold text-[var(--muted)]">{endpoint.endpointType.replaceAll("_", " ")}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{endpoint.notes}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <RoutingMatrix />
      </section>
    </CrossroadsPageShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
