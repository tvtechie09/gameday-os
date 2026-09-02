import Link from "next/link";
import { AiRecommendationsPanel } from "@/components/ai/ai-recommendations-panel";
import { generateAiRecommendations } from "@/lib/ai-recommendations";
import { getActiveAlerts, getAlerts } from "@/lib/services/alerts";
import { getFields } from "@/lib/services/fields";
import { getResources } from "@/lib/services/resources";
import { getScoreboardProfiles } from "@/lib/services/scoreboards";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAssignments, getSponsors } from "@/lib/services/sponsors";
import { getVenues } from "@/lib/services/venues";
import type { Alert, Field, Resource, ScoreboardProfile, Session, Sponsor, SponsorAssignment, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

async function safeLoad<T>(label: string, loader: () => Promise<T[]>): Promise<T[]> {
  try {
    return await loader();
  } catch (error) {
    console.error(`Failed to load ${label} for AI Assistant`, error);
    return [];
  }
}

function ContextCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

export default async function AiAssistantPage() {
  const [venues, fields, sessions, alerts, activeAlerts, scoreboards, sponsors, sponsorAssignments, resources] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Session>("sessions", getSessions),
    safeLoad<Alert>("alerts", getAlerts),
    safeLoad<Alert>("active alerts", getActiveAlerts),
    safeLoad<ScoreboardProfile>("scoreboards", getScoreboardProfiles),
    safeLoad<Sponsor>("sponsors", getSponsors),
    safeLoad<SponsorAssignment>("sponsor assignments", getSponsorAssignments),
    safeLoad<Resource>("resources", getResources),
  ]);
  const recommendations = generateAiRecommendations({
    activeAlerts,
    alerts,
    fields,
    resources,
    scoreboards,
    sessions,
    sponsorAssignments,
    sponsors,
    venues,
  });
  const urgentCount = recommendations.filter((recommendation) => recommendation.severity === "urgent").length;
  const warningCount = recommendations.filter((recommendation) => recommendation.severity === "warning").length;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">GameDay AI</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">AI Assistant</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            A rules-based operations assistant framework for venue staff. This version does not call OpenAI, does not require an API key, and does not send data to a paid AI service.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link className="ui-button ui-button-secondary" href="/admin/operations-center">
            Venue Status
          </Link>
          <Link className="ui-button ui-button-primary" href="/admin/system-health">
            System Health
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ContextCard label="Open Suggestions" value={recommendations.length} />
        <ContextCard label="Urgent" value={urgentCount} />
        <ContextCard label="Warnings" value={warningCount} />
        <ContextCard label="Fields Checked" value={fields.length} />
        <ContextCard label="Active Alerts" value={activeAlerts.length} />
      </section>

      <div className="mt-8">
        <AiRecommendationsPanel recommendations={recommendations} title="Venue Command Suggestions" />
      </div>

      <section className="mt-8 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">AI context sources</p>
        <h2 className="mt-1 text-2xl font-black">Data checked by the v1 rules engine</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ContextCard label="Venues" value={venues.length} />
          <ContextCard label="Fields" value={fields.length} />
          <ContextCard label="Sessions" value={sessions.length} />
          <ContextCard label="Alerts" value={alerts.length} />
          <ContextCard label="Scoreboards" value={scoreboards.length} />
          <ContextCard label="Sponsors" value={sponsors.length} />
          <ContextCard label="Sponsor Assignments" value={sponsorAssignments.length} />
          <ContextCard label="Resources" value={resources.length} />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-dashed border-[var(--line)] bg-[var(--background)] p-5">
        <h2 className="text-xl font-black">Framework boundaries</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          v1 is intentionally deterministic: recommendations are generated from application data and can be reviewed or dismissed locally in the UI. The database table is ready for persisted recommendation states when the assistant becomes workflow-driven.
        </p>
      </section>
    </section>
  );
}
