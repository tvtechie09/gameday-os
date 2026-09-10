"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/gameday-ui";
import { createWorkOrderAction, type WorkOrderActionResult } from "./actions";
import { trackPilotEvent } from "@/components/pilot/pilot-telemetry";
import { durationBucket, outcomeForFailureCode } from "@/lib/pilot-telemetry-core";
import { offlineMutationMessage } from "@/lib/client-network";

type FieldOption = { id: string; name: string; venueName: string };

export function WorkOrderForm({
  fields,
  initialFieldId,
  initialFieldName,
}: {
  fields: FieldOption[];
  initialFieldId?: string;
  initialFieldName?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<WorkOrderActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function preview(file: File | undefined) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  return (
    <form
      action={(formData) => {
        setResult(null);
        const offlineMessage = offlineMutationMessage("work order");
        if (offlineMessage) { setResult({ ok: false, code: "temporary", message: offlineMessage }); return; }
        const startedAt = Date.now();
        startTransition(async () => {
          let next: WorkOrderActionResult;
          try {
            next = await createWorkOrderAction(formData);
          } catch {
            next = { ok: false, code: "temporary", message: "Couldn't create the work order. Check your connection and try again." };
          }
          setResult(next);
          trackPilotEvent(next.ok ? "pilot_work_order_created" : "pilot_work_order_failed", {
            actionType: "create",
            durationBucket: durationBucket(Date.now() - startedAt),
            outcome: next.ok ? "completed" : outcomeForFailureCode(next.code),
          });
          if (next.ok && next.workOrderId) {
            formRef.current?.reset();
            setPreviewUrl(null);
            const query = new URLSearchParams();
            if (initialFieldId) query.set("fieldId", initialFieldId);
            if (next.photoWarning) query.set("photo", "failed");
            router.push(`/admin/fields/work-orders/${next.workOrderId}${query.size ? `?${query}` : ""}`);
          }
        });
      }}
      className="grid gap-4"
      ref={formRef}
    >
      <div>
        <h2 className="text-lg font-black">Report a Field Issue</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">Describe the problem. Assignment and progress happen after the work order is created.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {initialFieldId ? (
          <div className="rounded-lg bg-[var(--background)] p-3 text-sm sm:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Field</p>
            <p className="mt-1 font-black">{initialFieldName ?? "Selected field"}</p>
            <input name="fieldId" type="hidden" value={initialFieldId} />
          </div>
        ) : (
          <label className="grid gap-2 text-sm font-black">
            Field
            <select className="ui-input min-h-12" defaultValue={fields[0]?.id} name="fieldId" required>
              {fields.map((field) => <option key={field.id} value={field.id}>{field.venueName} — {field.name}</option>)}
            </select>
          </label>
        )}

        <label className="grid gap-2 text-sm font-black sm:col-span-2">
          What needs attention?
          <input className="ui-input min-h-12" maxLength={160} name="title" placeholder="Sprinkler head broken near first base" required />
        </label>

        <label className="grid gap-2 text-sm font-black">
          Priority
          <select className="ui-input min-h-12" defaultValue="normal" name="priority">
            <option value="normal">Normal</option>
            <option value="high">Important</option>
            <option value="urgent">Urgent — field unusable</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black sm:col-span-2">
          Details <span className="font-semibold text-[var(--muted)]">Optional</span>
          <textarea className="ui-input min-h-24" maxLength={1000} name="detail" placeholder="Location, symptoms, or anything the next person needs to know" />
        </label>

        <label className="grid gap-2 text-sm font-black sm:col-span-3">
          Photo <span className="font-semibold text-[var(--muted)]">Optional · JPEG, PNG, or WebP · up to 8 MB</span>
          <input accept="image/jpeg,image/png,image/webp" capture="environment" className="ui-input min-h-12 py-2" disabled={pending} name="photo" onChange={(event) => preview(event.target.files?.[0])} type="file" />
        </label>
        {previewUrl ? <div aria-label="Selected photo preview" className="h-40 rounded-lg bg-slate-100 bg-contain bg-center bg-no-repeat sm:col-span-3" role="img" style={{ backgroundImage: `url(${previewUrl})` }} /> : null}
      </div>

      <button className={buttonStyles("primary", "w-full sm:w-fit")} disabled={pending} type="submit">{pending ? "Creating…" : "Create Work Order"}</button>
      {result ? <p className={`rounded-lg p-3 text-sm font-bold ${result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`} role={result.ok ? "status" : "alert"}>{result.message}</p> : null}
    </form>
  );
}
