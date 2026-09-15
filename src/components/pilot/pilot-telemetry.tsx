"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  pageEventForPath,
  viewportCategory,
  workflowSource,
  type PilotEventContext,
  type PilotEventName,
} from "@/lib/pilot-telemetry-core";

const previousPathKey = "gameday-pilot-previous-path";

export function trackPilotEvent(eventName: PilotEventName, context: PilotEventContext = {}) {
  try {
    void fetch("/api/pilot/events", {
      body: JSON.stringify({ eventName, context }),
      headers: { "content-type": "application/json" },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined);
  } catch {
    // Analytics must never interrupt the operator workflow.
  }
}

export function PilotTelemetry({ enabled }: Readonly<{ enabled: boolean }>) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    try {
      const eventName = pageEventForPath(pathname);
      const previousPath = window.sessionStorage.getItem(previousPathKey);
      if (eventName) {
        trackPilotEvent(eventName, {
          source: workflowSource(previousPath),
          viewport: viewportCategory(window.innerWidth),
        });
      }
      window.sessionStorage.setItem(previousPathKey, pathname);
    } catch {
      // Storage or telemetry failures must never interrupt navigation.
    }
  }, [enabled, pathname]);

  return null;
}
