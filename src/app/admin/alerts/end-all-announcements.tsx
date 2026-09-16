"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertBanner, buttonStyles } from "@/components/ui/gameday-ui";
import { Modal } from "@/components/ui/overlays";
import { clearAllActiveOperationsAlertsAction } from "./actions";

export function EndAllAnnouncements({ venues }: { venues: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [venueId, setVenueId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const venueName = venues.find((venue) => venue.id === venueId)?.name ?? "this venue";

  function endAll() {
    const formData = new FormData();
    formData.set("venue_id", venueId);
    setMessage(null);
    startTransition(async () => {
      try {
        await clearAllActiveOperationsAlertsAction(formData);
        setConfirming(false);
        setMessage({ ok: true, text: `Active operational announcements ended for ${venueName}.` });
        router.refresh();
      } catch {
        setMessage({ ok: false, text: "Couldn't end these announcements. Check your connection and try again." });
      }
    });
  }

  return (
    <>
      <div className="grid gap-3 sm:min-w-72">
        {message ? <AlertBanner title={message.ok ? "Announcements ended" : "Announcements not updated"} tone={message.ok ? "success" : "danger"}>{message.text}</AlertBanner> : null}
        <select aria-label="Venue" className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" onChange={(event) => setVenueId(event.target.value)} value={venueId}>
          <option value="">Choose venue</option>
          {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
        </select>
        <button className={buttonStyles("secondary")} disabled={!venueId} onClick={() => setConfirming(true)} type="button">End active operational announcements</button>
      </div>
      {confirming ? <Modal description={`This ends active delay, weather, emergency, and field-closure announcements for ${venueName}.`} footer={<div className="grid gap-2 sm:grid-cols-2"><button className={buttonStyles("secondary")} disabled={pending} onClick={() => setConfirming(false)} type="button">Keep active</button><button className={buttonStyles("destructive")} disabled={pending} onClick={endAll} type="button">{pending ? "Ending…" : "End announcements"}</button></div>} onClose={() => setConfirming(false)} open title="End all operational announcements?"><p className="text-sm font-semibold leading-6">This does not delete announcement history.</p></Modal> : null}
    </>
  );
}
