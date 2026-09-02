"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, ChevronDown, Clock3, MapPin, UserRound } from "lucide-react";
import { Modal, Sheet } from "@/components/ui/overlays";
import { StatusChip, buttonStyles } from "@/components/ui/gameday-ui";
import {
  issueLifecycle,
  issueStageLabel,
  primaryWorkOrderAction,
  workOrderAgeLabel,
  workOrderPriorityPresentation,
} from "@/lib/services/work-order-core";
import type { WorkOrder, WorkOrderPerson } from "@/lib/services/work-orders";
import {
  acknowledgeWorkOrderAction,
  addWorkOrderNoteAction,
  assignWorkOrderAction,
  claimWorkOrderAction,
  escalateWorkOrderAction,
  reopenWorkOrderAction,
  resolveWorkOrderAction,
  startWorkOrderAction,
  type WorkOrderActionResult,
} from "./actions";

export type WorkOrderGameContext = {
  href: string;
  label: string;
  startLabel: string;
  statusLabel: string;
};

type WorkOrderCardProps = {
  assigneeName: string | null;
  assignees: WorkOrderPerson[];
  canManage: boolean;
  canWork: boolean;
  currentUserId: string;
  detailHref: string;
  fieldHref: string | null;
  fieldName: string;
  disruptionHref: string | null;
  game: WorkOrderGameContext | null;
  now: number;
  order: WorkOrder;
};

type Overlay = "assign" | "resolve" | "note" | "escalate" | "reopen" | null;

const stageTones = {
  open: "warning",
  assigned: "info",
  acknowledged: "info",
  in_progress: "warning",
  resolved: "success",
} as const;

const actionLabels = {
  acknowledge: "Acknowledge",
  claim: "I’ll Take It",
  resolve: "Resolve",
  start: "Start Work",
  view: "View Details",
} as const;

export function WorkOrderCard({
  assigneeName,
  assignees,
  canManage,
  canWork,
  currentUserId,
  detailHref,
  disruptionHref,
  fieldHref,
  fieldName,
  game,
  now,
  order,
}: Readonly<WorkOrderCardProps>) {
  const router = useRouter();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [message, setMessage] = useState<WorkOrderActionResult | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [note, setNote] = useState("");
  const [assigneeId, setAssigneeId] = useState(assignees[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const life = issueLifecycle(order, now);
  const priority = workOrderPriorityPresentation(order.priority);
  const primary = primaryWorkOrderAction(order, { canManage, canWork, userId: currentUserId });

  function run(action: () => Promise<WorkOrderActionResult>, closeOnSuccess = false) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result);
      if (result.ok) {
        if (closeOnSuccess) setOverlay(null);
        router.refresh();
      }
    });
  }

  function runPrimary() {
    if (primary === "claim") run(() => claimWorkOrderAction(order.id, order.updatedAt));
    if (primary === "acknowledge") run(() => acknowledgeWorkOrderAction(order.id, order.updatedAt));
    if (primary === "start") run(() => startWorkOrderAction(order.id, order.updatedAt));
    if (primary === "resolve") setOverlay("resolve");
  }

  const primaryControl = primary === "view" ? (
    <Link className={buttonStyles("primary", "w-full sm:w-auto")} href={detailHref}>View Details</Link>
  ) : (
    <button className={buttonStyles("primary", "w-full sm:w-auto")} disabled={pending} onClick={runPrimary} type="button">
      {pending ? "Updating…" : actionLabels[primary]}
    </button>
  );

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> {fieldName}
            </p>
            <h2 className="mt-2 text-lg font-black leading-snug">{order.title}</h2>
          </div>
          <StatusChip tone={stageTones[life.stage]}>{issueStageLabel(life.stage)}</StatusChip>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-4 w-4" />{workOrderAgeLabel(order.createdAt, now)}</span>
          <StatusChip tone={priority.tone}>{priority.label}</StatusChip>
        </div>

        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          {assigneeName ? `Assigned to ${assigneeName}` : life.stage === "open" ? "Nobody assigned yet" : "Assigned team member"}
        </p>

        {life.isOverdue ? <p className="mt-3 flex items-center gap-2 text-sm font-black text-red-800"><AlertTriangle aria-hidden="true" className="h-4 w-4" />Overdue by {Math.abs(life.minutesUntilDue ?? 0)} minutes</p> : null}

        {game ? (
          <div className="mt-4 rounded-lg bg-[var(--background)] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Related game</p>
            <p className="mt-1 text-sm font-black">{game.label}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{game.startLabel} · {game.statusLabel}</p>
          </div>
        ) : null}

        <div className="mt-4">{primaryControl}</div>
        {message ? <p className={`mt-3 rounded-lg p-3 text-sm font-bold ${message.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`} role="status">{message.message}</p> : null}
      </div>

      <details className="group border-t border-[var(--line)]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-black text-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:px-5">
          More Actions <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-2 border-t border-[var(--line)] bg-[var(--background)] p-3 sm:grid-cols-2 sm:p-4">
          <Link className={buttonStyles("secondary", "justify-start")} href={detailHref}>Details &amp; History</Link>
          {fieldHref ? <Link className={buttonStyles("secondary", "justify-start")} href={fieldHref}>Back to {fieldName}</Link> : null}
          {game ? <Link className={buttonStyles("secondary", "justify-start")} href={game.href}>Open Related Game</Link> : null}
          {disruptionHref ? <Link className={buttonStyles("secondary", "justify-start")} href={disruptionHref}>View Affected Games</Link> : null}
          {canWork ? <button className={buttonStyles("secondary", "justify-start")} onClick={() => setOverlay("note")} type="button">Add Note</button> : null}
          {canManage && life.stage !== "resolved" && assignees.length > 0 ? <button className={buttonStyles("secondary", "justify-start")} onClick={() => setOverlay("assign")} type="button">{assigneeName ? "Reassign" : "Assign Teammate"}</button> : null}
          {canManage && life.stage !== "resolved" && order.priority !== "urgent" ? <button className={buttonStyles("secondary", "justify-start")} onClick={() => setOverlay("escalate")} type="button">Escalate</button> : null}
          {canManage && life.stage === "resolved" ? <button className={buttonStyles("secondary", "justify-start")} onClick={() => setOverlay("reopen")} type="button">Reopen</button> : null}
        </div>
      </details>

      {overlay === "assign" ? <Sheet description="Choose a teammate assigned to this venue." onClose={() => setOverlay(null)} open title="Assign Work Order">
        <label className="grid gap-2 text-sm font-black">Teammate
          <select className="ui-input" onChange={(event) => setAssigneeId(event.target.value)} value={assigneeId}>
            {assignees.map((person) => <option key={person.id} value={person.id}>{person.displayName}{person.roleLabel ? ` · ${person.roleLabel}` : ""}</option>)}
          </select>
        </label>
        <button className={buttonStyles("primary", "mt-5 w-full")} disabled={pending || !assigneeId} onClick={() => run(() => assignWorkOrderAction(order.id, assigneeId, order.updatedAt), true)} type="button">{pending ? "Assigning…" : "Assign"}</button>
      </Sheet> : null}

      {overlay === "resolve" ? <Sheet description={`${order.title} · ${fieldName}`} onClose={() => setOverlay(null)} open title="Resolve Work Order">
        <label className="grid gap-2 text-sm font-black">What was done? <span className="font-semibold text-[var(--muted)]">Optional</span>
          <textarea className="ui-input min-h-28" maxLength={2000} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Replaced power supply" value={resolutionNote} />
        </label>
        <button className={buttonStyles("primary", "mt-5 w-full")} disabled={pending} onClick={() => run(() => resolveWorkOrderAction(order.id, order.updatedAt, resolutionNote), true)} type="button">{pending ? "Resolving…" : "Mark Resolved"}</button>
      </Sheet> : null}

      {overlay === "note" ? <Sheet description="This note becomes part of the authoritative work-order history." onClose={() => setOverlay(null)} open title="Add Note">
        <label className="grid gap-2 text-sm font-black">Update
          <textarea className="ui-input min-h-28" maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder="Waiting for a replacement cable" value={note} />
        </label>
        <button className={buttonStyles("primary", "mt-5 w-full")} disabled={pending || !note.trim()} onClick={() => run(() => addWorkOrderNoteAction(order.id, note), true)} type="button">{pending ? "Saving…" : "Save Note"}</button>
      </Sheet> : null}

      {overlay === "escalate" ? <Modal description="This flags the work order as urgent for venue management. It does not send an automatic external notification." onClose={() => setOverlay(null)} open title="Escalate Work Order?">
        <button className={buttonStyles("destructive", "w-full")} disabled={pending} onClick={() => run(() => escalateWorkOrderAction(order.id, order.updatedAt), true)} type="button">{pending ? "Escalating…" : "Escalate"}</button>
      </Modal> : null}

      {overlay === "reopen" ? <Modal description="The work order will return to New. Field status will not change." onClose={() => setOverlay(null)} open title="Reopen Work Order?">
        <button className={buttonStyles("primary", "w-full")} disabled={pending} onClick={() => run(() => reopenWorkOrderAction(order.id, order.updatedAt), true)} type="button">{pending ? "Reopening…" : "Reopen"}</button>
      </Modal> : null}
    </article>
  );
}
