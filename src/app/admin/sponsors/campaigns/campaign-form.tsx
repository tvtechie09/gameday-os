"use client";

import { useState } from "react";
import { createCampaignAction } from "./actions";
import { PACKAGE_TEMPLATES, SPONSOR_ASSET_CATALOG, SPONSOR_ASSET_TYPES, type SponsorAssetType } from "@/lib/services/sponsor-fulfillment-core";

type Option = { id: string; name: string };

const emptyQuantities = (): Record<SponsorAssetType, number> =>
  SPONSOR_ASSET_TYPES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {} as Record<SponsorAssetType, number>);

export function CampaignForm({ sponsors, venues, today }: { sponsors: Option[]; venues: Option[]; today: string }) {
  const [quantities, setQuantities] = useState<Record<SponsorAssetType, number>>(emptyQuantities);
  const [packageName, setPackageName] = useState("");

  function applyTemplate(key: string) {
    const template = PACKAGE_TEMPLATES.find((t) => t.key === key);
    if (!template) return;
    const next = emptyQuantities();
    for (const [type, qty] of Object.entries(template.contracted)) next[type as SponsorAssetType] = qty ?? 0;
    setQuantities(next);
    setPackageName(template.name);
  }

  const contractedTotal = SPONSOR_ASSET_TYPES.reduce((sum, t) => sum + (quantities[t] || 0), 0);

  return (
    <form action={createCampaignAction} className="grid gap-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <input name="package_name" type="hidden" value={packageName} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Sponsor</span>
          <select name="sponsor_id" required className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base font-bold">
            {sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Venue</span>
          <select name="venue_id" className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base font-bold">
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Campaign name</span>
        <input name="name" required placeholder="e.g. Riverside Auto — Summer Classic" className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Starts</span>
          <input name="starts_on" type="date" required defaultValue={today} className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Ends</span>
          <input name="ends_on" type="date" required defaultValue={today} className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" />
        </label>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Start from a package</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PACKAGE_TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => applyTemplate(t.key)} className="inline-flex min-h-9 items-center rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 text-xs font-black text-[var(--foreground)] hover:bg-white">
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Contracted inventory · {contractedTotal} placements</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SPONSOR_ASSET_TYPES.map((assetType) => (
            <label key={assetType} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[var(--foreground)]">{SPONSOR_ASSET_CATALOG[assetType].label}</span>
              </span>
              <input
                name={`contracted_${assetType}`}
                type="number"
                min={0}
                value={quantities[assetType] || 0}
                onChange={(e) => setQuantities((q) => ({ ...q, [assetType]: Math.max(0, Number(e.target.value) || 0) }))}
                className="h-10 w-20 shrink-0 rounded-lg border border-[var(--line)] bg-white px-2 text-center text-base font-bold"
              />
            </label>
          ))}
        </div>
      </div>

      <button type="submit" className="min-h-12 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white">
        Create campaign
      </button>
    </form>
  );
}
