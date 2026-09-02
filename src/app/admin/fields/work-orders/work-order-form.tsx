"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/gameday-ui";
import { createWorkOrderAction, type WorkOrderActionResult } from "./actions";

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

  return (
    <form
      action={(formData) => {
        setResult(null);
        startTransition(async () => {
          let next: WorkOrderActionResult;
          try {
            next = await createWorkOrderAction(formData);
          } catch {
            next = { ok: false, code: "temporary", message: "Couldn't create the work order. Check your connection and try again." };
          }
          setResult(next);
          if (next.ok && next.workOrderId) {
            formRef.current?.reset();
            const query = initialFieldId ? `?fieldId=${encodeURIComponent(initialFieldId)}` : "";
            router.push(`/admin/fields/work-orders/${next.workOrderId}${query}`);
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
      </div>

      <button className={buttonStyles("primary", "w-full sm:w-fit")} disabled={pending} type="submit">{pending ? "Creating…" : "Create Work Order"}</button>
      {result ? <p className={`rounded-lg p-3 text-sm font-bold ${result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`} role={result.ok ? "status" : "alert"}>{result.message}</p> : null}
    </form>
  );
}
