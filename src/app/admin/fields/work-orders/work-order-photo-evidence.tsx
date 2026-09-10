"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/gameday-ui";
import type { WorkOrderPhoto } from "@/lib/services/work-order-photos";
import { addWorkOrderPhotoAction, removeWorkOrderPhotoAction, type WorkOrderActionResult } from "./actions";
import { useRouter } from "next/navigation";
import { offlineMutationMessage } from "@/lib/client-network";

const purposeLabels = { report: "Problem", progress: "In progress", resolution: "After repair" } as const;

export function WorkOrderPhotoEvidence({
  photos,
  workOrderId,
  resolved,
  removableIds,
}: {
  photos: WorkOrderPhoto[];
  workOrderId: string;
  resolved: boolean;
  removableIds: string[];
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

  function upload(formData: FormData) {
    setResult(null);
    const offlineMessage = offlineMutationMessage("photo");
    if (offlineMessage) { setResult({ ok: false, code: "temporary", message: offlineMessage }); return; }
    startTransition(async () => {
      const next = await addWorkOrderPhotoAction(formData).catch(() => ({ ok: false, code: "temporary", message: "Could not upload the photo. Check your connection and try again." } as WorkOrderActionResult));
      setResult(next);
      if (next.ok) {
        formRef.current?.reset();
        setPreviewUrl(null);
        router.refresh();
      }
    });
  }

  function remove(mediaId: string) {
    setResult(null);
    const offlineMessage = offlineMutationMessage("photo removal");
    if (offlineMessage) { setResult({ ok: false, code: "temporary", message: offlineMessage }); return; }
    startTransition(async () => {
      const next = await removeWorkOrderPhotoAction(workOrderId, mediaId).catch(() => ({ ok: false, code: "temporary", message: "Could not remove the photo. Try again." } as WorkOrderActionResult));
      setResult(next);
      if (next.ok) router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-black">Photo evidence</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Optional, private evidence for this Work Order. Up to five photos. Avoid people or unrelated sensitive information.</p>

      {photos.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li className="min-w-0 rounded-lg border border-[var(--line)] p-2" key={photo.id}>
              <a aria-label={`Open ${purposeLabels[photo.purpose]} photo`} className="block h-28 rounded-md bg-slate-100 bg-cover bg-center" href={photo.signedUrl} rel="noreferrer" style={{ backgroundImage: `url(${photo.signedUrl})` }} target="_blank" />
              <p className="mt-2 truncate text-xs font-black">{purposeLabels[photo.purpose]}</p>
              {removableIds.includes(photo.id) ? <button className="mt-2 min-h-11 text-xs font-black text-red-700 underline" disabled={pending} onClick={() => remove(photo.id)} type="button">Remove</button> : null}
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No photos added.</p>}

      {photos.length < 5 ? (
        <form action={upload} className="mt-5 grid gap-3" ref={formRef}>
          <input name="workOrderId" type="hidden" value={workOrderId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-black">What it shows
              <select className="ui-input min-h-11" defaultValue={resolved ? "resolution" : "progress"} name="purpose">
                <option value="report">Problem</option>
                <option value="progress">In progress</option>
                <option value="resolution">After repair</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black">Add photo
              <input accept="image/jpeg,image/png,image/webp" capture="environment" className="ui-input min-h-11 py-2" disabled={pending} name="photo" onChange={(event) => preview(event.target.files?.[0])} required type="file" />
            </label>
          </div>
          {previewUrl ? <div aria-label="Selected photo preview" className="h-40 rounded-lg bg-slate-100 bg-contain bg-center bg-no-repeat" role="img" style={{ backgroundImage: `url(${previewUrl})` }} /> : null}
          <button className={buttonStyles("secondary", "w-full sm:w-fit")} disabled={pending} type="submit">{pending ? "Uploading photo…" : "Add Photo"}</button>
        </form>
      ) : <p className="mt-4 text-sm font-bold text-[var(--muted)]">Five-photo limit reached. Remove an accidental photo before adding another.</p>}

      {result ? <p className={`mt-3 rounded-lg p-3 text-sm font-bold ${result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`} role={result.ok ? "status" : "alert"}>{result.message}</p> : null}
    </section>
  );
}
