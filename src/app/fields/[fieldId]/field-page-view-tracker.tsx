"use client";

import { useEffect } from "react";

export function FieldPageViewTracker({
  venueId,
  fieldId,
  sessionId,
}: {
  venueId: string;
  fieldId: string;
  sessionId?: string | null;
}) {
  useEffect(() => {
    void fetch("/api/field-page-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueId,
        fieldId,
        sessionId,
        pageType: "field_page",
      }),
    }).catch((error: unknown) => {
      console.error("Failed to record field page view", error);
    });
  }, [fieldId, sessionId, venueId]);

  return null;
}
