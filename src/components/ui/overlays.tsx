"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cx, IconButton } from "./gameday-ui";

type OverlayProps = {
  children: React.ReactNode;
  description?: string;
  footer?: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

function OverlayDialog({ children, description, footer, onClose, open, title, variant }: Readonly<OverlayProps & { variant: "modal" | "sheet" }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("button")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-describedby={description ? `${variant}-description` : undefined}
      aria-labelledby={`${variant}-title`}
      className={cx("m-0 max-h-[min(88dvh,48rem)] w-full border-0 bg-white p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-slate-950/45", variant === "modal" ? "inset-1/2 max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)]" : "inset-x-0 bottom-0 top-auto max-w-none rounded-t-[var(--radius-xl)] pb-[env(safe-area-inset-bottom)] sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none")}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onClose={onClose}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}
      ref={dialogRef}
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div><h2 className="text-xl font-black" id={`${variant}-title`}>{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]" id={`${variant}-description`}>{description}</p> : null}</div>
          <IconButton aria-label={`Close ${title}`} onClick={onClose}><X className="h-5 w-5" aria-hidden="true" /></IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="border-t border-[var(--line)] px-5 py-4">{footer}</footer> : null}
      </div>
    </dialog>
  );
}

export function Modal(props: Readonly<OverlayProps>) {
  return <OverlayDialog variant="modal" {...props} />;
}

export function Sheet(props: Readonly<OverlayProps>) {
  return <OverlayDialog variant="sheet" {...props} />;
}

export const Drawer = Sheet;
