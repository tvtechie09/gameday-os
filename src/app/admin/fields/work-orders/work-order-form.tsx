"use client";

import { useState, useTransition } from "react";
import { createWorkOrderAction, type CreateWorkOrderResult } from "./actions";

type FieldOption = { id: string; name: string; venueName: string };

export function WorkOrderForm({ fields }: { fields: FieldOption[] }) {
  const [result, setResult] = useState<CreateWorkOrderResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5"
      action={(formData) => {
        startTransition(async () => {
          const next = await createWorkOrderAction(formData);
          setResult(next);
          if (next.ok) {
            (document.getElementById("work-order-form") as HTMLFormElement | null)?.reset();
          }
        });
      }}
      id="work-order-form"
    >
      <h2 className="text-lg font-black">Report a field issue</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-bold">
          Field
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="fieldId" required>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.venueName} — {field.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold sm:col-span-2">
          What needs attention?
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="title" placeholder="Sprinkler head broken near first base" required />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Priority
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" defaultValue="normal" name="priority">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent — field unusable</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold sm:col-span-2">
          Details (optional)
          <input className="min-h-11 rounded-lg border border-[var(--line)] px-3" name="detail" />
        </label>
      </div>
      <button className="min-h-12 w-fit rounded-lg bg-[var(--accent)] px-6 text-sm font-black text-white disabled:opacity-50" disabled={pending} type="submit">
        {pending ? "Saving…" : "Create work order"}
      </button>
      {result?.error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">{result.error}</p> : null}
      {result?.ok ? <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-800">Work order created.</p> : null}
    </form>
  );
}
