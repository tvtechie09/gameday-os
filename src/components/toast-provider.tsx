"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastKind = "success" | "error";

type Toast = {
  id: number;
  kind: ToastKind;
  text: string;
};

type ToastEventDetail = {
  kind?: ToastKind;
  text?: string;
};

declare global {
  interface WindowEventMap {
    "gameday-toast": CustomEvent<ToastEventDetail>;
  }
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function addToast(kind: ToastKind, text: string) {
      const id = Date.now();
      setToasts((current) => [...current, { id, kind, text }].slice(-3));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 5200);
    }

    const searchParams = new URLSearchParams(window.location.search);
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) addToast("success", success);
    if (error) addToast("error", error);

    function handleToast(event: CustomEvent<ToastEventDetail>) {
      const text = event.detail.text?.trim();
      if (!text) return;
      addToast(event.detail.kind === "error" ? "error" : "success", text);
    }

    window.addEventListener("gameday-toast", handleToast);
    return () => window.removeEventListener("gameday-toast", handleToast);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-24 z-50 grid w-[calc(100vw-2rem)] max-w-sm gap-3">
      {toasts.map((toast) => {
        const Icon = toast.kind === "success" ? CheckCircle2 : AlertCircle;
        return (
          <div
            className={`ui-card flex items-start gap-3 p-4 shadow-xl ${toast.kind === "success" ? "border-green-200 bg-green-50 text-green-950" : "border-red-200 bg-red-50 text-red-950"}`}
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm font-bold leading-6">{toast.text}</p>
            <button
              aria-label="Dismiss notification"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md hover:bg-black/5"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
