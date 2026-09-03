"use client";

import { MapPin, Menu } from "lucide-react";
import { IconButton } from "@/components/ui/gameday-ui";
import type { PilotBuildInfo } from "@/lib/pilot-build";

export function AppHeader({ onOpenMenu, pilotInfo, roleLabel, venueName }: Readonly<{ onOpenMenu: () => void; pilotInfo: PilotBuildInfo | null; roleLabel: string; venueName: string | null }>) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
      <div className="mx-auto flex min-h-12 max-w-5xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--black-soft)] text-sm font-black text-white" aria-hidden="true">GD</span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-black leading-5">{venueName ?? "GameDay"}{pilotInfo ? <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-amber-950">Pilot</span> : null}</p>
            <p className="flex items-center gap-1 truncate text-xs font-semibold leading-4 text-[var(--muted)]">
              {venueName ? <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
              {roleLabel}
            </p>
          </div>
        </div>
        <IconButton aria-label="Open navigation menu" onClick={onOpenMenu}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}
