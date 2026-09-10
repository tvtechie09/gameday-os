"use client";

import Link from "next/link";
import Image from "next/image";
import { useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3, List, Map as MapIcon, Search, ShieldAlert, Wrench } from "lucide-react";
import { AlertBanner, buttonStyles, StatusChip, type StatusTone } from "@/components/ui/gameday-ui";
import { Modal, Sheet } from "@/components/ui/overlays";
import {
  fieldOperationMatchesFilter,
  fieldOperationMatchesQuery,
  summarizeFieldOperations,
  type FieldOperationItem,
  type FieldOperationsFilter,
} from "@/lib/services/field-operations-core";
import type { FieldStatus } from "@/lib/types";
import { setFieldOperationalStatusAction } from "./actions";
import { trackPilotEvent } from "@/components/pilot/pilot-telemetry";
import { durationBucket, outcomeForFailureCode } from "@/lib/pilot-telemetry-core";

type FieldOperationsBoardProps = {
  items: FieldOperationItem[];
  canConfigure: boolean;
  canManageSchedule: boolean;
  canUpdateStatus: boolean;
  initialSelectedId?: string;
};

const filters: Array<{ key: FieldOperationsFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "attention", label: "Needs Attention" },
  { key: "closed", label: "Closed" },
];

const statusDescriptions: Record<FieldStatus, string> = {
  open: "Available for play. Games may be scheduled or waiting to start.",
  active: "In use now. Staff should expect active play on this field.",
  delayed: "Play is temporarily held with an expectation that it may resume.",
  closed: "Unavailable for play until an authorized operator reopens it.",
  maintenance: "Unavailable while grounds or facility work is being completed.",
};

function statusView(status: FieldStatus): { label: string; tone: StatusTone; Icon: typeof CheckCircle2 } {
  if (status === "delayed") return { label: "Delayed", tone: "warning", Icon: Clock3 };
  if (status === "closed") return { label: "Closed", tone: "danger", Icon: ShieldAlert };
  if (status === "maintenance") return { label: "Maintenance", tone: "danger", Icon: Wrench };
  if (status === "active") return { label: "In use", tone: "info", Icon: CheckCircle2 };
  return { label: "Open", tone: "success", Icon: CheckCircle2 };
}

function primaryStatusAction(status: FieldStatus): { label: string; target: FieldStatus } {
  if (status === "delayed") return { label: "Return to open", target: "open" };
  if (status === "closed" || status === "maintenance") return { label: "Reopen field", target: "open" };
  return { label: "Mark delayed", target: "delayed" };
}

function effectiveItem(item: FieldOperationItem, override?: { status: FieldStatus; updatedAt: string }): FieldOperationItem {
  const status = override?.status ?? item.status;
  const gameNeedsAttention = Boolean(item.currentGame && (["delayed", "suspended", "postponed"].includes(item.currentGame.lifecycleStatus) || item.currentGame.minutesBehind >= 20));
  const statusNeedsAttention = status === "delayed" || status === "closed" || status === "maintenance";
  return {
    ...item,
    status,
    updatedAt: override?.updatedAt ?? item.updatedAt,
    affectedUpcomingGames: status === "closed" || status === "maintenance" ? item.upcomingGameCount : 0,
    needsAttention: statusNeedsAttention || item.unresolvedIssueCount > 0 || gameNeedsAttention,
  };
}

function GameLine({ game, kind }: { game: FieldOperationItem["currentGame"]; kind: "Current" | "Next" }) {
  return (
    <div className="grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)] gap-2 text-sm">
      <span className="font-bold text-[var(--muted)]">{kind}</span>
      {game ? (
        <span className="min-w-0 font-extrabold text-[var(--foreground)]">
          <span className="block truncate">{game.label}</span>
          <span className="block text-xs font-semibold text-[var(--muted)]">{game.startLabel}{game.minutesBehind >= 20 ? ` · ${game.minutesBehind} min behind` : ""}</span>
        </span>
      ) : <span className="font-semibold text-[var(--muted)]">None</span>}
    </div>
  );
}

function FieldCard({
  item,
  canUpdateStatus,
  onOpen,
  onStatus,
  pendingFieldId,
}: {
  item: FieldOperationItem;
  canUpdateStatus: boolean;
  onOpen: () => void;
  onStatus: (item: FieldOperationItem, status: FieldStatus) => void;
  pendingFieldId: string | null;
}) {
  const status = statusView(item.status);
  const StatusIcon = status.Icon;
  const primary = primaryStatusAction(item.status);
  const pending = pendingFieldId === item.fieldId;

  return (
    <article className={`flex min-w-0 flex-col rounded-xl border bg-white p-4 shadow-sm ${item.needsAttention ? "border-amber-300 ring-1 ring-amber-100" : "border-[var(--line)]"}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-lg font-black leading-tight">{item.fieldName}</h3>
          <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{item.sportType}</p>
        </div>
        <StatusChip tone={status.tone}><StatusIcon aria-hidden="true" className="mr-1 h-3.5 w-3.5" />{status.label}</StatusChip>
      </div>

      {item.needsAttention ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-amber-900">
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" /> Needs attention
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 border-y border-[var(--line)] py-3">
        <GameLine game={item.currentGame} kind="Current" />
        <GameLine game={item.nextGame} kind="Next" />
      </div>

      <div className="min-h-12 pt-3">
        {item.activeIssue ? (
          <p className="line-clamp-2 text-sm font-semibold text-red-800">
            <span className="font-black">Issue:</span> {item.activeIssue.title}
            {item.unresolvedIssueCount > 1 ? ` +${item.unresolvedIssueCount - 1} more` : ""}
          </p>
        ) : item.affectedUpcomingGames > 0 ? (
          <p className="text-sm font-bold text-red-800">{item.affectedUpcomingGames} upcoming game{item.affectedUpcomingGames === 1 ? "" : "s"} affected</p>
        ) : (
          <p className="text-sm font-semibold text-[var(--muted)]">No active field issues</p>
        )}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
        {item.needsAttention ? (
          <Link className={buttonStyles("primary", "min-h-12 px-3")} href={`/admin/fields/${item.fieldId}/disruption`}>Review impact</Link>
        ) : canUpdateStatus ? (
          <button className={buttonStyles("primary", "min-h-12 px-3")} disabled={pending} onClick={() => onStatus(item, primary.target)} type="button">
            {pending ? "Updating…" : primary.label}
          </button>
        ) : <span className="flex min-h-12 items-center text-sm font-semibold text-[var(--muted)]">View only</span>}
        <button className={buttonStyles("secondary", "min-h-12 px-3")} onClick={onOpen} type="button">View details</button>
      </div>
    </article>
  );
}

function FieldDetailSheet({
  canConfigure,
  canManageSchedule,
  canUpdateStatus,
  item,
  message,
  onClose,
  onStatus,
  pending,
}: {
  canConfigure: boolean;
  canManageSchedule: boolean;
  canUpdateStatus: boolean;
  item: FieldOperationItem;
  message: { ok: boolean; message: string } | null;
  onClose: () => void;
  onStatus: (item: FieldOperationItem, status: FieldStatus) => void;
  pending: boolean;
}) {
  const status = statusView(item.status);
  const StatusIcon = status.Icon;
  const primary = primaryStatusAction(item.status);

  return (
    <Sheet description={item.venueName} onClose={onClose} open title={item.fieldName}>
        <div className="rounded-xl bg-[var(--background)] p-4">
          <StatusChip tone={status.tone}><StatusIcon aria-hidden="true" className="mr-1 h-3.5 w-3.5" />{status.label}</StatusChip>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">{statusDescriptions[item.status]}</p>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="rounded-xl border border-[var(--line)] p-4">
            <h3 className="font-black">Game context</h3>
            <div className="mt-3 grid gap-3"><GameLine game={item.currentGame} kind="Current" /><GameLine game={item.nextGame} kind="Next" /></div>
            {item.upcomingGameCount > 0 ? <p className="mt-3 text-sm font-semibold text-[var(--muted)]">{item.upcomingGameCount} upcoming game{item.upcomingGameCount === 1 ? "" : "s"} remain on this field today.</p> : null}
            {item.needsAttention ? <Link className={buttonStyles("primary", "mt-4 w-full")} href={`/admin/fields/${item.fieldId}/disruption`}>Review impact</Link> : canManageSchedule ? <Link className={buttonStyles("secondary", "mt-4 w-full")} href={`/admin/sessions?q=${encodeURIComponent(item.fieldName)}`}>Review games</Link> : null}
          </div>

          <div className="rounded-xl border border-[var(--line)] p-4">
            <h3 className="font-black">Operational issue</h3>
            {item.activeIssue ? <p className="mt-2 text-sm font-semibold text-red-800">{item.activeIssue.title}{item.unresolvedIssueCount > 1 ? ` and ${item.unresolvedIssueCount - 1} more` : ""}</p> : <p className="mt-2 text-sm font-semibold text-[var(--muted)]">No unresolved issue is attached to this field.</p>}
            <Link className={buttonStyles("secondary", "mt-4 w-full")} href={`/admin/fields/work-orders?fieldId=${encodeURIComponent(item.fieldId)}`}>{item.activeIssue ? "Open field issues" : "Report an issue"}</Link>
          </div>
        </div>

        {message ? <AlertBanner className="mt-4" title={message.ok ? "Field updated" : "Field not updated"} tone={message.ok ? "success" : "danger"}>{message.message}</AlertBanner> : null}

        {canUpdateStatus ? (
          <div className="mt-6">
            <button className={buttonStyles("primary", "w-full")} disabled={pending} onClick={() => onStatus(item, primary.target)} type="button">{pending ? "Updating…" : primary.label}</button>
            <details className="group mt-3 rounded-xl border border-[var(--line)]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-black">Other field actions <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
              <div className="grid gap-2 border-t border-[var(--line)] p-3">
                {item.status !== "closed" ? <button className={buttonStyles("secondary", "justify-start")} disabled={pending} onClick={() => onStatus(item, "closed")} type="button">Close field</button> : null}
                {item.status !== "maintenance" ? <button className={buttonStyles("secondary", "justify-start")} disabled={pending} onClick={() => onStatus(item, "maintenance")} type="button">Maintenance / unavailable</button> : null}
                {item.status !== "open" ? <button className={buttonStyles("secondary", "justify-start")} disabled={pending} onClick={() => onStatus(item, "open")} type="button">Return to open</button> : null}
              </div>
            </details>
          </div>
        ) : null}

        <div className="mt-6 grid gap-2 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
          <Link className={buttonStyles("secondary")} href={`/fields/${item.fieldId}`}>View public page</Link>
          {canConfigure ? <Link className={buttonStyles("secondary")} href={`/admin/fields/${item.fieldId}/control`}>Full field controls</Link> : null}
        </div>
    </Sheet>
  );
}

export function FieldOperationsBoard({ items, canConfigure, canManageSchedule, canUpdateStatus, initialSelectedId }: FieldOperationsBoardProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FieldOperationsFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [confirmation, setConfirmation] = useState<{ item: FieldOperationItem; status: FieldStatus } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [pendingFieldId, setPendingFieldId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, { status: FieldStatus; updatedAt: string }>>({});
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"list" | "map">("list");

  const effectiveItems = items.map((item) => effectiveItem(item, statusOverrides[item.fieldId]));
  const summary = summarizeFieldOperations(effectiveItems);
  const visibleItems = effectiveItems.filter((item) => fieldOperationMatchesFilter(item, filter) && fieldOperationMatchesQuery(item, deferredQuery));
  const selected = effectiveItems.find((item) => item.fieldId === selectedId) ?? null;
  const venueGroups = [...new Map(visibleItems.map((item) => [item.venueId, { id: item.venueId, name: item.venueName }])).values()];
  const hasMap = items.some((item) => item.mapImageUrl && item.mapX !== null && item.mapY !== null);

  function requestStatus(item: FieldOperationItem, status: FieldStatus) {
    setMessage(null);
    if (status === "closed" || status === "maintenance") {
      setConfirmation({ item, status });
      return;
    }
    applyStatus(item, status);
  }

  function applyStatus(item: FieldOperationItem, status: FieldStatus) {
    const startedAt = Date.now();
    trackPilotEvent("pilot_field_action_started", { actionType: status });
    setConfirmation(null);
    setPendingFieldId(item.fieldId);
    startTransition(async () => {
      let result;
      try {
        result = await setFieldOperationalStatusAction(item.fieldId, status, item.updatedAt);
      } catch {
        result = { ok: false, code: "temporary" as const, message: `Couldn't update ${item.fieldName}. Check your connection and try again.` };
      }
      setMessage(result);
      trackPilotEvent(result.ok ? "pilot_field_action_completed" : "pilot_field_action_failed", {
        actionType: status,
        durationBucket: durationBucket(Date.now() - startedAt),
        outcome: result.ok ? "completed" : outcomeForFailureCode(result.code),
      });
      setPendingFieldId(null);
      if (result.ok && result.updatedAt) {
        setStatusOverrides((current) => ({ ...current, [item.fieldId]: { status, updatedAt: result.updatedAt! } }));
        router.refresh();
      } else if (result.code === "conflict") {
        setStatusOverrides((current) => {
          const next = { ...current };
          delete next[item.fieldId];
          return next;
        });
        router.refresh();
      }
    });
  }

  return (
    <>
      <section aria-label="Field status summary" className="mt-6 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm">
        <dl className="grid grid-cols-3 divide-x divide-y divide-[var(--line)] lg:grid-cols-6 lg:divide-y-0">
          {[
            ["Total", summary.total], ["Open", summary.open], ["In use", summary.inUse], ["Delayed", summary.delayed], ["Closed", summary.closed], ["Needs attention", summary.needsAttention],
          ].map(([label, value]) => (
            <div className="min-w-0 p-3 sm:p-4" key={label}><dt className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-[var(--muted)] sm:text-xs">{label}</dt><dd className="mt-1 text-xl font-black tabular-nums">{value}</dd></div>
          ))}
        </dl>
      </section>

      <section className="mt-5" aria-label="Field filters">
        <div aria-label="Field view" className="mb-3 inline-grid grid-cols-2 rounded-lg border border-[var(--line)] bg-white p-1">
          <button aria-pressed={view === "list"} className={`inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-black ${view === "list" ? "bg-[var(--black-soft)] text-white" : "text-[var(--foreground)]"}`} onClick={() => setView("list")} type="button"><List aria-hidden="true" className="h-4 w-4" />List</button>
          <button aria-pressed={view === "map"} className={`inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-black ${view === "map" ? "bg-[var(--black-soft)] text-white" : "text-[var(--foreground)]"}`} onClick={() => setView("map")} type="button"><MapIcon aria-hidden="true" className="h-4 w-4" />Map</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((option) => (
            <button aria-pressed={filter === option.key} className={`min-h-12 shrink-0 rounded-full px-4 text-sm font-black ring-1 ring-inset ${filter === option.key ? "bg-[var(--black-soft)] text-white ring-[var(--black-soft)]" : "bg-white text-[var(--foreground)] ring-[var(--line)]"}`} key={option.key} onClick={() => setFilter(option.key)} type="button">
              {option.label}{option.key === "attention" ? ` (${summary.needsAttention})` : ""}
            </button>
          ))}
        </div>
        <label className="relative mt-2 block">
          <span className="sr-only">Search fields</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
          <input className="ui-input min-h-12 w-full pl-12" onChange={(event) => setQuery(event.target.value)} placeholder="Search Field 9, Baseball 9, team, or issue" type="search" value={query} />
        </label>
      </section>

      {!selected && message ? <AlertBanner className="mt-4" title={message.ok ? "Field updated" : "Field not updated"} tone={message.ok ? "success" : "danger"}>{message.message}</AlertBanner> : null}

      {view === "map" && !hasMap ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--line)] bg-white p-6 text-center"><h2 className="text-lg font-black">Venue map not configured</h2><p className="mt-2 text-sm font-semibold text-[var(--muted)]">The field list remains available. A venue director can add a diagram and optional marker positions in venue and field settings.</p><button className={buttonStyles("secondary", "mt-4")} onClick={() => setView("list")} type="button">Return to list</button></div>
      ) : venueGroups.length > 0 ? (
        <div className="mt-6 grid gap-8">
          {venueGroups.map((venue) => {
            const venueItems = visibleItems.filter((item) => item.venueId === venue.id);
            const mapImageUrl = venueItems.find((item) => item.mapImageUrl)?.mapImageUrl;
            const mappedItems = venueItems.filter((item) => item.mapX !== null && item.mapY !== null);
            return (
              <section key={venue.id}>
                <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-black">{venue.name}</h2><p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venueItems.length} field{venueItems.length === 1 ? "" : "s"} shown in physical order</p></div></div>
                {view === "map" && mapImageUrl ? (
                  <div className="mt-4">
                    <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--background)]">
                      <Image alt={`${venue.name} venue map`} className="h-auto w-full object-contain" height={720} src={mapImageUrl} unoptimized width={960} />
                      {mappedItems.map((item) => {
                        const status = statusView(item.status);
                        return <button aria-label={`${item.fieldName}, ${status.label}. View details`} className="absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white bg-[var(--black-soft)] px-2 py-1 text-[0.65rem] font-black leading-tight text-white shadow-lg focus-visible:outline-4 focus-visible:outline-[var(--accent)]" key={item.fieldId} onClick={() => { setSelectedId(item.fieldId); setMessage(null); }} style={{ left: `${item.mapX}%`, top: `${item.mapY}%` }} title={`${status.label}${item.currentGame ? ` · Current: ${item.currentGame.label}` : item.nextGame ? ` · Next: ${item.nextGame.startLabel}` : ""}`} type="button"><span className="block">{item.mapLabel ?? item.fieldName}</span><span className="block text-[0.55rem] uppercase text-white/80">{status.label}</span></button>;
                      })}
                    </div>
                    {mappedItems.length < venueItems.length ? <p className="mt-3 text-sm font-semibold text-[var(--muted)]">{venueItems.length - mappedItems.length} field{venueItems.length - mappedItems.length === 1 ? " has" : "s have"} no map marker and remain available in List view.</p> : null}
                    {venueItems[0]?.mapNotes ? <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm font-semibold text-[var(--muted)]">{venueItems[0].mapNotes}</p> : null}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {venueItems.map((item) => <FieldCard canUpdateStatus={canUpdateStatus} item={item} key={item.fieldId} onOpen={() => { setSelectedId(item.fieldId); setMessage(null); }} onStatus={requestStatus} pendingFieldId={pendingFieldId} />)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--line)] bg-white p-8 text-center"><h2 className="text-lg font-black">No fields match this view</h2><p className="mt-2 text-sm font-semibold text-[var(--muted)]">Clear search or choose All to return to the full complex.</p><button className={buttonStyles("secondary", "mt-4")} onClick={() => { setFilter("all"); setQuery(""); }} type="button">Show all fields</button></div>
      )}

      {selected ? <FieldDetailSheet canConfigure={canConfigure} canManageSchedule={canManageSchedule} canUpdateStatus={canUpdateStatus} item={selected} message={message} onClose={() => { setSelectedId(null); setConfirmation(null); setMessage(null); }} onStatus={requestStatus} pending={pending && pendingFieldId === selected.fieldId} /> : null}

      {confirmation ? (
        <Modal
          description={`${confirmation.item.currentGame ? "1 game is currently in progress. " : "No game is currently in progress. "}${confirmation.item.upcomingGameCount} upcoming game${confirmation.item.upcomingGameCount === 1 ? "" : "s"} ${confirmation.item.upcomingGameCount === 1 ? "is" : "are"} scheduled on this field.`}
          footer={<div className="grid gap-2 sm:grid-cols-2"><button className={buttonStyles("secondary")} onClick={() => setConfirmation(null)} type="button">Keep current status</button><button className={buttonStyles("destructive")} disabled={pending} onClick={() => applyStatus(confirmation.item, confirmation.status)} type="button">{confirmation.status === "maintenance" ? "Mark unavailable" : "Close field"}</button></div>}
          onClose={() => setConfirmation(null)}
          open
          title={confirmation.status === "maintenance" ? `Mark ${confirmation.item.fieldName} unavailable for maintenance?` : `Close ${confirmation.item.fieldName}?`}
        >
          <p className="flex gap-3 rounded-xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-900"><AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />This changes public status but does not move or cancel games.</p>
        </Modal>
      ) : null}
    </>
  );
}
