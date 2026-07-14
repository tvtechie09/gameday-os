"use client";

import { useState } from "react";
import type { ChecklistItem, ModeChecklist } from "@/lib/services/command-center-core";

// Operating-mode checklist. Auto-derived items (ready/todo) come from live
// signals and aren't editable; manual coordination items are ticked off here
// with transient client state (a game-day scratchpad, not persisted).
export function ModeChecklistCard({ checklist }: { checklist: ModeChecklist }) {
  const manualKeys = checklist.items.filter((i) => i.status === "manual").map((i) => i.key);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  const done = checklist.items.filter((i) => i.status === "ready" || (i.status === "manual" && checked[i.key])).length;
  const total = checklist.items.length;
  const manualDone = manualKeys.filter((k) => checked[k]).length;

  return (
    <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{checklist.title}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{checklist.caption}</p>
        </div>
        <p className="shrink-0 text-sm font-black text-[var(--foreground)]">{done} / {total} ready</p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--background)]">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }} />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {checklist.items.map((entry) => (
          <ChecklistRow key={entry.key} entry={entry} checked={!!checked[entry.key]} onToggle={() => toggle(entry.key)} />
        ))}
      </ul>

      {manualKeys.length > 0 ? (
        <p className="mt-3 text-[11px] font-semibold text-[var(--muted)]">
          {manualDone} of {manualKeys.length} manual checks done · these reset on reload (not saved)
        </p>
      ) : null}
    </section>
  );
}

function ChecklistRow({ entry, checked, onToggle }: { entry: ChecklistItem; checked: boolean; onToggle: () => void }) {
  if (entry.status === "manual") {
    return (
      <li>
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition ${checked ? "border-emerald-300 bg-emerald-50" : "border-[var(--line)] bg-[var(--background)] hover:bg-white"}`}
        >
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-black ${checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--line)] bg-white text-transparent"}`}>✓</span>
          <span className="min-w-0">
            <span className={`block text-sm font-bold ${checked ? "text-emerald-900 line-through" : "text-[var(--foreground)]"}`}>{entry.label}</span>
            <span className="block text-xs font-semibold text-[var(--muted)]">{entry.detail}</span>
          </span>
        </button>
      </li>
    );
  }

  const ready = entry.status === "ready";
  return (
    <li className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${ready ? "border-emerald-200 bg-emerald-50/50" : "border-amber-300 bg-amber-50"}`}>
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-black text-white ${ready ? "bg-emerald-500" : "bg-amber-500"}`}>{ready ? "✓" : "!"}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[var(--foreground)]">{entry.label}</span>
        <span className={`block text-xs font-semibold ${ready ? "text-[var(--muted)]" : "text-amber-800"}`}>{entry.detail}</span>
      </span>
    </li>
  );
}
