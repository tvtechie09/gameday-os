"use client";

import { useState } from "react";
import { Bell, Clock, DoorOpen, Play } from "lucide-react";

export type QuickAction = {
  key: string;
  label: string;
  icon: "Play" | "Clock" | "Bell" | "DoorOpen";
};

const icons = { Play, Clock, Bell, DoorOpen } as const;

// Capability-gated quick actions for Today's Operations. Which actions render
// is decided server-side; this component only handles the local acknowledge
// interaction (there is no live game-control backend yet).
export function QuickActions({ actions }: Readonly<{ actions: QuickAction[] }>) {
  const [ack, setAck] = useState<string | null>(null);

  if (actions.length === 0) {
    return (
      <p className="text-sm font-semibold text-[var(--muted)]">
        Your role has no quick actions on this screen.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) => {
          const Icon = icons[action.icon];
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => setAck(action.label)}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2 py-3 text-center text-xs font-black text-[var(--foreground)] transition hover:border-emerald-400 hover:text-emerald-700"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {action.label}
            </button>
          );
        })}
      </div>
      {ack ? (
        <p role="status" className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-800">
          &ldquo;{ack}&rdquo; acknowledged (demo — no live control backend wired yet).
        </p>
      ) : null}
    </div>
  );
}
