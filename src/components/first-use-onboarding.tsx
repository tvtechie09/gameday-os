"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CalendarDays, ClipboardCheck, MapPin, Menu, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/overlays";
import { trackPilotEvent } from "@/components/pilot/pilot-telemetry";
import { viewportCategory } from "@/lib/pilot-telemetry-core";
import {
  hasFinishedOnboarding,
  onboardingRecord,
  onboardingStorageKey,
  type OnboardingModel,
  type OnboardingOutcome,
} from "@/lib/first-use-onboarding-core";

const conceptIcons: Record<string, LucideIcon> = {
  today: Activity,
  fields: MapPin,
  schedule: CalendarDays,
  "work-orders": ClipboardCheck,
  more: Menu,
};
const telemetryAction = "venue_version_one";

export function FirstUseOnboarding({ model, reopenToken, telemetryEnabled, userId }: Readonly<{
  model: OnboardingModel | null;
  reopenToken: number;
  telemetryEnabled: boolean;
  userId: string;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!model || !userId) return;
    const timer = window.setTimeout(() => {
      let finished = false;
      try { finished = hasFinishedOnboarding(window.localStorage.getItem(onboardingStorageKey({ product: model.product, role: model.role, userId }))); } catch { /* A blocked storage API must not block entry. */ }
      if (!finished) {
        setOpen(true);
        if (telemetryEnabled) trackPilotEvent("onboarding_shown", { actionType: telemetryAction, viewport: viewportCategory(window.innerWidth) });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [model, telemetryEnabled, userId]);

  useEffect(() => {
    if (!model || reopenToken < 1) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      if (telemetryEnabled) trackPilotEvent("onboarding_reopened", { actionType: telemetryAction, viewport: viewportCategory(window.innerWidth) });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [model, reopenToken, telemetryEnabled]);

  if (!model) return null;

  const finish = (outcome: OnboardingOutcome, navigate: boolean) => {
    if (!open) return;
    try {
      const key = onboardingStorageKey({ product: model.product, role: model.role, userId });
      if (!hasFinishedOnboarding(window.localStorage.getItem(key))) window.localStorage.setItem(key, onboardingRecord(outcome));
    } catch { /* Completion remains non-blocking when storage is unavailable. */ }
    setOpen(false);
    if (telemetryEnabled) trackPilotEvent(outcome === "completed" ? "onboarding_completed" : "onboarding_dismissed", { actionType: telemetryAction, viewport: viewportCategory(window.innerWidth) });
    if (navigate) router.push(model.startHref);
  };

  return <Sheet
    description={model.description}
    footer={<div className="grid gap-2 sm:grid-cols-[1fr_auto]"><button className="min-h-12 rounded-[var(--radius-md)] border border-[var(--line)] px-4 text-sm font-extrabold" onClick={() => finish("dismissed", false)} type="button">Not now</button><button className="min-h-12 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 text-sm font-black text-white" onClick={() => finish("completed", true)} type="button">{model.startLabel}</button></div>}
    onClose={() => finish("dismissed", false)}
    open={open}
    title={model.title}
  >
    <p className="ui-eyebrow">{model.eyebrow} · 30-second guide</p>
    <ol className="mt-4 grid gap-3">
      {model.concepts.map((concept) => {
        const Icon = conceptIcons[concept.key] ?? Activity;
        return <li className="grid min-w-0 grid-cols-[44px_1fr] gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--background)] p-3" key={concept.key}><span className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Icon aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><h3 className="text-base font-black">{concept.title}</h3><p className="mt-1 text-sm leading-5 text-[var(--muted)]">{concept.description}</p></div></li>;
      })}
    </ol>
  </Sheet>;
}
