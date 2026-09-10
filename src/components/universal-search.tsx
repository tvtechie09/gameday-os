"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ClipboardCheck, MapPin, Search, Shield, UserRound } from "lucide-react";
import { Sheet } from "@/components/ui/overlays";
import { trackPilotEvent } from "@/components/pilot/pilot-telemetry";
import type { UniversalSearchResult, UniversalSearchResultType } from "@/lib/universal-search-core";

const labels: Record<UniversalSearchResultType, string> = { field: "Fields", game: "Games", work_order: "Work Orders", team: "Teams", player: "Players" };
const icons = { field: MapPin, game: CalendarDays, work_order: ClipboardCheck, team: Shield, player: UserRound };

function queryBucket(length: number) {
  if (length <= 2) return "query_1_2";
  if (length <= 8) return "query_3_8";
  return "query_9_plus";
}

export function UniversalSearchSheet({ enabled, onClose, onOpen, open }: { enabled: boolean; onClose: () => void; onOpen: () => void; open: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reopenOnBack = useRef(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    if (enabled) trackPilotEvent("search_opened");
    return () => window.clearTimeout(timer);
  }, [enabled, open]);

  useEffect(() => {
    const onPopState = () => { if (reopenOnBack.current) { reopenOnBack.current = false; onOpen(); } };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [onOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || (trimmed.length < 2 && !/^\d$/.test(trimmed))) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      if (enabled) trackPilotEvent("search_submitted", { actionType: queryBucket(trimmed.length) });
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { credentials: "same-origin", signal: controller.signal });
        const payload = await response.json().catch(() => null) as { results?: UniversalSearchResult[]; error?: string } | null;
        if (!response.ok) throw new Error("search_failed");
        const next = Array.isArray(payload?.results) ? payload.results : [];
        setResults(next); setActiveIndex(0);
        if (!next.length && enabled) trackPilotEvent("search_no_results", { actionType: queryBucket(trimmed.length) });
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setError("Search is temporarily unavailable. Try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [enabled, query]);

  const groups = useMemo(() => Array.from(new Set(results.map((result) => result.type))).map((type) => ({ type, results: results.filter((result) => result.type === type) })), [results]);
  const openResult = (result: UniversalSearchResult, index: number) => {
    reopenOnBack.current = true;
    if (enabled) trackPilotEvent("search_result_opened", { actionType: `${result.type}_${Math.min(index + 1, 9)}` });
    onClose();
  };

  return <Sheet description="Find the operational object you already know." onClose={onClose} open={open} title="Search GameDay">
    <div onKeyDown={(event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.min(results.length - 1, value + 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(0, value - 1)); }
      if (event.key === "Enter" && results[activeIndex]) { document.getElementById(`venue-search-result-${activeIndex}`)?.click(); }
    }}>
      <label className="block text-sm font-black" htmlFor="venue-universal-search">Search fields, games, work orders, or teams</label>
      <div className="mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 focus-within:ring-2 focus-within:ring-[var(--accent)]">
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--muted)]" />
        <input ref={inputRef} id="venue-universal-search" className="min-w-0 flex-1 border-0 bg-transparent py-3 text-base outline-none" value={query} onChange={(event) => { const value = event.target.value; const trimmed = value.trim(); setQuery(value); setResults([]); setError(""); setActiveIndex(0); setLoading(Boolean(trimmed && (trimmed.length >= 2 || /^\d$/.test(trimmed)))); }} placeholder="Field 7, Semifinal, scoreboard…" autoComplete="off" />
      </div>
      <p className="mt-2 min-h-5 text-sm text-[var(--muted)]" aria-live="polite">{loading ? "Searching…" : error}</p>
      {!loading && !error && query.trim() && results.length === 0 ? <div className="mt-5 rounded-xl bg-[var(--background-strong)] p-4"><p className="font-black">No results for “{query.trim()}”.</p><p className="mt-1 text-sm text-[var(--muted)]">Try a field, team, game, or Work Order.</p></div> : null}
      <div className="mt-2 grid gap-5">
        {groups.map((group) => <section aria-label={labels[group.type]} key={group.type}><h3 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{labels[group.type]}</h3><div className="mt-2 grid gap-2">{group.results.map((result) => { const index = results.indexOf(result); const Icon = icons[result.type]; return <Link id={`venue-search-result-${index}`} key={`${result.type}:${result.href}:${result.title}`} href={result.href} onClick={() => openResult(result, index)} className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left ${index === activeIndex ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-white hover:bg-[var(--background-strong)]"}`}><Icon aria-hidden="true" className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1"><strong className="block break-words text-sm">{result.title}</strong><span className="mt-1 block break-words text-xs text-[var(--muted)]">{result.subtitle}</span></span>{result.status ? <span className="shrink-0 text-[11px] font-black uppercase text-[var(--muted)]">{result.status}</span> : null}</Link>; })}</div></section>)}
      </div>
    </div>
  </Sheet>;
}
