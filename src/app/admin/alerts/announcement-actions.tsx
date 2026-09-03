"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertBanner, buttonStyles } from "@/components/ui/gameday-ui";
import { Modal } from "@/components/ui/overlays";
import { clearAlertAction, hideAlertFromPublicAction } from "./actions";

type Confirmation = "end" | "hide" | null;

export function AnnouncementActions({ alertId, isPublic }: { alertId: string; isPublic: boolean }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: (formData: FormData) => Promise<void>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("alert_id", alertId);
      try {
        await action(formData);
        setConfirmation(null);
        setMessage({ ok: true, text: success });
        router.refresh();
      } catch {
        setMessage({ ok: false, text: "Couldn't update this announcement. Check your connection and try again." });
      }
    });
  }

  return (
    <>
      {message ? <AlertBanner title={message.ok ? "Announcement updated" : "Announcement not updated"} tone={message.ok ? "success" : "danger"}>{message.text}</AlertBanner> : null}
      <button className={buttonStyles("secondary", "w-full justify-start")} onClick={() => setConfirmation("end")} type="button">End announcement</button>
      {isPublic ? <button className={buttonStyles("secondary", "w-full justify-start")} onClick={() => setConfirmation("hide")} type="button">Make staff-only</button> : null}

      {confirmation === "end" ? (
        <Modal
          description="The announcement will stop appearing on venue and field pages. Its history is not deleted."
          footer={<div className="grid gap-2 sm:grid-cols-2"><button className={buttonStyles("secondary")} disabled={pending} onClick={() => setConfirmation(null)} type="button">Keep active</button><button className={buttonStyles("destructive")} disabled={pending} onClick={() => run(clearAlertAction, "Announcement ended.")} type="button">{pending ? "Ending…" : "End announcement"}</button></div>}
          onClose={() => setConfirmation(null)}
          open
          title="End this announcement?"
        ><p className="text-sm font-semibold leading-6">Families and staff may still have seen the announcement before it ended.</p></Modal>
      ) : null}

      {confirmation === "hide" ? (
        <Modal
          description="The announcement will remain available to venue staff but disappear from public venue and field pages."
          footer={<div className="grid gap-2 sm:grid-cols-2"><button className={buttonStyles("secondary")} disabled={pending} onClick={() => setConfirmation(null)} type="button">Keep public</button><button className={buttonStyles("primary")} disabled={pending} onClick={() => run(hideAlertFromPublicAction, "Announcement is now staff-only.")} type="button">{pending ? "Updating…" : "Make staff-only"}</button></div>}
          onClose={() => setConfirmation(null)}
          open
          title="Make this announcement staff-only?"
        ><p className="text-sm font-semibold leading-6">Its content and history will not be deleted.</p></Modal>
      ) : null}
    </>
  );
}
