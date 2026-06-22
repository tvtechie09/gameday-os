"use client";

import { useEffect, useRef, useState } from "react";

export function CopyLinkButton({ value }: { value: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => setStatus("idle"), 1800);
    } catch (error) {
      console.error("Failed to copy pilot launch link", error);
      setStatus("error");
    }
  }

  return (
    <button
      className="ui-button ui-button-secondary min-h-11 shrink-0 px-3 py-2 text-xs"
      onClick={copyValue}
      type="button"
    >
      {status === "copied" ? "Copied" : status === "error" ? "Copy failed" : "Copy"}
    </button>
  );
}
