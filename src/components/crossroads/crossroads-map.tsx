"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CrossroadsHotspot } from "@/lib/demo/crossroads";
import { CrossroadsStatusBadge } from "./crossroads-ui";

function hotspotTone(type: CrossroadsHotspot["type"]) {
  const tones: Record<CrossroadsHotspot["type"], string> = {
    batting_cage: "bg-slate-900 text-white",
    championship: "bg-yellow-400 text-black",
    concession: "bg-amber-500 text-black",
    concourse: "bg-blue-600 text-white",
    field: "bg-green-700 text-white",
    gate: "bg-black text-white",
    hospitality: "bg-purple-600 text-white",
    landmark: "bg-sky-500 text-black",
    parking: "bg-white text-black ring-2 ring-black",
    play_surface: "bg-orange-500 text-black",
    playground: "bg-pink-500 text-white",
    seating: "bg-lime-700 text-white",
    social: "bg-lime-300 text-black",
  };

  return tones[type];
}

export function CrossroadsMap({ hotspots, mapImageUrl }: { hotspots: CrossroadsHotspot[]; mapImageUrl: string }) {
  const [selectedId, setSelectedId] = useState(hotspots[0]?.id ?? "");
  const selectedHotspot = useMemo(() => hotspots.find((hotspot) => hotspot.id === selectedId) ?? hotspots[0] ?? null, [hotspots, selectedId]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <div className="relative aspect-[1.42/1] min-h-[360px]">
          <Image alt="Wintrust Crossroads Sports Complex map" className="object-contain" fill priority sizes="(min-width: 1280px) 70vw, 100vw" src={mapImageUrl} unoptimized />
          {hotspots.map((hotspot) => (
            <button
              aria-label={`Open ${hotspot.label}`}
              className={`absolute min-h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-black shadow-lg transition hover:scale-110 focus:outline-none focus:ring-4 focus:ring-white ${hotspotTone(hotspot.type)} ${selectedId === hotspot.id ? "scale-110 ring-4 ring-white" : ""}`}
              key={hotspot.id}
              onClick={() => setSelectedId(hotspot.id)}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              type="button"
            >
              {hotspot.label.replace("Field ", "")}
            </button>
          ))}
        </div>
      </div>

      <aside className="rounded-lg border border-[var(--line)] bg-white p-5">
        {selectedHotspot ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">{selectedHotspot.type.replace("_", " ")}</p>
                <h2 className="mt-2 text-2xl font-black">{selectedHotspot.label}</h2>
              </div>
              {selectedHotspot.status ? <CrossroadsStatusBadge status={selectedHotspot.status} /> : null}
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{selectedHotspot.description}</p>
            {selectedHotspot.imageUrl ? (
              <div className="relative mt-4 aspect-video overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)]">
                <Image alt={`${selectedHotspot.label} preview`} className="object-cover" fill sizes="360px" src={selectedHotspot.imageUrl} unoptimized />
              </div>
            ) : null}
            <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-bold text-white" href={selectedHotspot.route}>
              Open Detail
            </Link>
          </>
        ) : (
          <p className="text-sm font-bold text-[var(--muted)]">Choose a hotspot on the map.</p>
        )}
      </aside>
    </div>
  );
}
