import Link from "next/link";
import Image from "next/image";
import { CrossroadsGameCard, CrossroadsPageShell, CrossroadsStatusBadge } from "@/components/crossroads/crossroads-ui";
import { getCrossroadsField, getGamesForField, crossroadsPlaySurfaces } from "@/lib/demo/crossroads";

type FieldPageProps = {
  params: Promise<{ fieldNumber: string }>;
};

export default async function CrossroadsFieldPage({ params }: FieldPageProps) {
  const { fieldNumber } = await params;
  const field = getCrossroadsField(fieldNumber);

  if (!field) {
    return (
      <CrossroadsPageShell eyebrow="Field QR" title="Field not found">
        <p className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm font-bold text-[var(--muted)]">That Crossroads demo field does not exist.</p>
      </CrossroadsPageShell>
    );
  }

  const surfaces = crossroadsPlaySurfaces.filter((surface) => surface.parentFieldId === field.id);
  const games = getGamesForField(field.id);

  return (
    <CrossroadsPageShell eyebrow="Field QR" title={field.name}>
      <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Parent field</h2>
            <CrossroadsStatusBadge status={field.status} />
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            {field.name} supports {surfaces.length} configured play surfaces for youth layouts and tournament scheduling.
          </p>
          {field.imageUrl ? (
            <div className="relative mt-4 aspect-video overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)]">
              <Image alt={`${field.name} preview`} className="object-cover" fill sizes="(min-width: 1024px) 40vw, 100vw" src={field.imageUrl} unoptimized />
            </div>
          ) : null}
          <div className="mt-5 grid gap-2">
            {surfaces.map((surface) => (
              <Link className="flex min-h-11 items-center justify-between rounded-lg bg-[var(--background)] px-3 text-sm font-black" href={`/venue/crossroads/surface/${surface.code}`} key={surface.id}>
                {surface.code}
                <CrossroadsStatusBadge status={surface.status} />
              </Link>
            ))}
          </div>
        </section>

        <section>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Today</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {games.length > 0 ? games.map((game) => <CrossroadsGameCard game={game} key={game.id} />) : <p className="rounded-lg bg-white p-5 text-sm font-bold text-[var(--muted)]">No games scheduled on this parent field.</p>}
          </div>
        </section>
      </div>
    </CrossroadsPageShell>
  );
}
