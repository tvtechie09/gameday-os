"use client";

import { useEffect, useMemo } from "react";
import type { CSSProperties } from "react";

type SponsorImpressionTrackerProps = {
  sponsorIds: string[];
  fieldId: string;
  sessionId?: string | null;
};

type SponsorWebsiteLinkProps = {
  sponsorId: string;
  fieldId: string;
  sessionId?: string | null;
  href: string;
  className: string;
  style?: CSSProperties;
};

function sendAnalytics(url: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export function SponsorImpressionTracker({ sponsorIds, fieldId, sessionId }: SponsorImpressionTrackerProps) {
  const uniqueSponsorIds = useMemo(() => [...new Set(sponsorIds)].filter(Boolean), [sponsorIds]);

  useEffect(() => {
    if (uniqueSponsorIds.length === 0) {
      return;
    }

    sendAnalytics("/api/sponsor-analytics/impressions", {
      sponsorIds: uniqueSponsorIds,
      fieldId,
      sessionId,
      pageType: "field_page",
    });
  }, [fieldId, sessionId, uniqueSponsorIds]);

  return null;
}

export function SponsorWebsiteLink({ sponsorId, fieldId, sessionId, href, className, style }: SponsorWebsiteLinkProps) {
  return (
    <a
      className={className}
      href={href}
      onClick={() => {
        sendAnalytics("/api/sponsor-analytics/clicks", {
          sponsorId,
          fieldId,
          sessionId,
          pageType: "field_page",
        });
      }}
      rel="noreferrer"
      style={style}
      target="_blank"
    >
      Visit Website
    </a>
  );
}
