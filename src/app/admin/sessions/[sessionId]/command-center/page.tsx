import Link from "next/link";
import type { ReactNode } from "react";
import { getPublicFieldUrl, getPublicScoreboardUrl } from "@/lib/public-url";
import { filterAlertsForFieldPage, getActiveAlerts, getAlertLabel } from "@/lib/services/alerts";
import { getAudioModeLabel, getAudioProfileForField, getAudioStatusLabel } from "@/lib/services/audio-profiles";
import { getField } from "@/lib/services/fields";
import { getIdentityTeams, getIdentityTeamSessionLinks } from "@/lib/services/identity-platform";
import { getActiveResourceActivationsForField } from "@/lib/services/resource-activations";
import { getScoreboardIntegrationModeLabel, getScoreboardProfileForField, getScoreboardStatusLabel } from "@/lib/services/scoreboards";
import { getConnectedSessionProfile } from "@/lib/services/session-command-center";
import { getSessionEvents, getSessionEventTypeLabel } from "@/lib/services/session-events";
import { getSession } from "@/lib/services/sessions";
import { getSponsorPlacementsForFieldPage } from "@/lib/services/sponsors";
import { getVenue } from "@/lib/services/venues";
import { getVolunteerRolesBySessionId } from "@/lib/services/volunteer-roles";

type CommandCenterPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(value: string) {
  if (value === "active" || value === "normal") return "bg-green-50 text-green-800";
  if (value === "delayed" || value === "suspended" || value === "testing" || value === "configured") return "bg-amber-50 text-amber-900";
  if (value === "emergency" || value === "offline") return "bg-red-50 text-red-800";
  return "bg-slate-100 text-slate-700";
}

function SectionCard({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  const displayValue = value === 0 ? "0" : value;

  return (
    <div className="rounded-lg bg-[var(--background)] p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-black">{displayValue || "Not configured"}</p>
    </div>
  );
}

function Badge({ children, tone = "bg-slate-100 text-slate-700" }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${tone}`}>
      {children}
    </span>
  );
}

const futureStreamingIntegrations = ["GameChanger", "SidelineHD", "YouTube", "Hudl", "Pixellot"];

export default async function SessionCommandCenterPage({ params }: CommandCenterPageProps) {
  const { sessionId } = await params;
  const session = await getSession(sessionId).catch((error: unknown) => {
    console.error("Failed to load command center session", error);
    return null;
  });

  if (!session) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link className="text-sm font-bold text-[var(--accent-strong)]" href="/admin/sessions">Back to sessions</Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Session not found</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This command center is unavailable because the session could not be loaded.</p>
        </div>
      </section>
    );
  }

  const field = await getField(session.fieldId).catch((error: unknown) => {
    console.error("Failed to load command center field", error);
    return null;
  });
  const venue = field ? await getVenue(field.venueId).catch((error: unknown) => {
    console.error("Failed to load command center venue", error);
    return null;
  }) : null;

  const [
    connectedProfile,
    activeAlerts,
    scoreboardProfile,
    audioProfile,
    activeResources,
    volunteerRoles,
    sessionEvents,
    sponsorPlacements,
    teamLinks,
    teams,
  ] = await Promise.all([
    getConnectedSessionProfile(session.id),
    getActiveAlerts().catch((error: unknown) => {
      console.error("Failed to load command center alerts", error);
      return [];
    }),
    field ? getScoreboardProfileForField(field.id) : Promise.resolve(null),
    field ? getAudioProfileForField({ fieldId: field.id, sessionId: session.id }) : Promise.resolve(null),
    getActiveResourceActivationsForField({ fieldId: session.fieldId, sessionId: session.id }).catch((error: unknown) => {
      console.error("Failed to load command center resources", error);
      return [];
    }),
    getVolunteerRolesBySessionId(session.id).catch((error: unknown) => {
      console.error("Failed to load command center volunteer roles", error);
      return [];
    }),
    getSessionEvents(session.id).catch((error: unknown) => {
      console.error("Failed to load command center timeline", error);
      return [];
    }),
    venue && field ? getSponsorPlacementsForFieldPage({ fieldId: field.id, sessionId: session.id, venueId: venue.id }).catch((error: unknown) => {
      console.error("Failed to load command center sponsors", error);
      return [];
    }) : Promise.resolve([]),
    getIdentityTeamSessionLinks().catch((error: unknown) => {
      console.error("Failed to load team-session links", error);
      return [];
    }),
    getIdentityTeams().catch((error: unknown) => {
      console.error("Failed to load identity teams", error);
      return [];
    }),
  ]);

  const operationAlerts = venue && field ? filterAlertsForFieldPage({
    alerts: activeAlerts,
    fieldId: field.id,
    publicOnly: false,
    tournamentId: session.tournamentId,
    venueId: venue.id,
  }) : [];
  const linkedTeams = teamLinks
    .filter((link) => link.sessionId === session.id)
    .map((link) => ({ link, team: teams.find((team) => team.id === link.teamId) ?? null }));
  const homeLinkedTeam = linkedTeams.find(({ link }) => link.relationshipType === "home");
  const awayLinkedTeam = linkedTeams.find(({ link }) => link.relationshipType === "away");
  const mediaLinks = [
    ...(session.primaryLinkUrl && session.primaryLinkLabel ? [{ label: session.primaryLinkLabel, url: session.primaryLinkUrl }] : []),
    ...(session.secondaryLinkUrl && session.secondaryLinkLabel ? [{ label: session.secondaryLinkLabel, url: session.secondaryLinkUrl }] : []),
    ...connectedProfile.mediaLinks,
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link className="text-sm font-bold text-[var(--accent-strong)]" href={`/admin/sessions/${session.id}`}>
            Back to live dashboard
          </Link>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Connected Game Platform</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{session.title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Connected Game Platform command center for one game: Team, Venue, Tournament, Scoreboard, Streaming, Sponsors, Operations, and Timeline connected through Session.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          <Link className="ui-button ui-button-secondary" href={`/admin/sessions/${session.id}`}>Score Control</Link>
          <Link className="ui-button ui-button-secondary" href={getPublicScoreboardUrl(session.id)}>Public Scoreboard</Link>
          {field ? <Link className="ui-button ui-button-secondary" href={getPublicFieldUrl(field.id)}>Public Field</Link> : null}
          <Link className="ui-button ui-button-primary" href="/admin/operations-center">Venue Command Center</Link>
        </div>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Detail label="Venue" value={venue?.name} />
        <Detail label="Field" value={field?.name} />
        <Detail label="Tournament" value={session.tournamentId} />
        <Detail label="Game Status" value={session.gameStatus} />
        <Detail label="Operations Status" value={connectedProfile.operationsStatus} />
      </section>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <SectionCard eyebrow="Game Summary" title="Session as central game object">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Home Team" value={session.homeTeam} />
            <Detail label="Away Team" value={session.awayTeam} />
            <Detail label="Start Time" value={formatDateTime(session.startTime)} />
            <Detail label="Sport" value={session.sportType} />
          </div>
          <div className="mt-4 rounded-lg bg-[var(--black-soft)] p-5 text-center text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Current Score</p>
            <p className="mt-2 text-6xl font-black leading-none">{session.homeScore}-{session.awayScore}</p>
            <p className="mt-3 text-sm font-bold text-white/70">{session.sportType} · {session.status}</p>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Teams" title="Team bridge placeholders">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Home Team" value={homeLinkedTeam?.team?.name ?? session.homeTeam} />
            <Detail label="Away Team" value={awayLinkedTeam?.team?.name ?? session.awayTeam} />
            <Detail label="Home Organization" value={connectedProfile.homeOrganizationId} />
            <Detail label="Away Organization" value={connectedProfile.awayOrganizationId} />
            <Detail label="Team Source" value={linkedTeams.length > 0 ? "Identity Platform team_session_links" : "Session display fields"} />
            <Detail label="Roster Sync" value="Placeholder only" />
            <Detail label="Lineup" value="Placeholder only" />
          </div>
          <div className="mt-4 grid gap-2">
            {linkedTeams.length > 0 ? linkedTeams.map(({ link, team }) => (
              <div className="rounded-lg bg-[var(--background)] p-3" key={link.id}>
                <p className="font-black">{team?.name ?? link.teamId}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{link.relationshipType}</p>
              </div>
            )) : (
              <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No team-session links yet. Team sync, roster sync, and lineup handoff are intentionally deferred.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Operations Alerts" title="Venue Command impact">
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(connectedProfile.operationsStatus)}>{connectedProfile.operationsStatus}</Badge>
            <Badge tone={statusTone(session.gameStatus)}>{session.gameStatus}</Badge>
          </div>
          <div className="mt-4 grid gap-3">
            {operationAlerts.length > 0 ? operationAlerts.slice(0, 4).map((alert) => (
              <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3" key={alert.id}>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{getAlertLabel(alert.alertType)}</p>
                <p className="mt-1 font-black">{alert.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{alert.message}</p>
              </article>
            )) : (
              <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No active operations alerts for this game.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Scoreboard" title="Scoreboard connection">
          {scoreboardProfile ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Profile" value={`${scoreboardProfile.manufacturer} ${scoreboardProfile.model}`} />
              <Detail label="Status" value={getScoreboardStatusLabel(scoreboardProfile.scoreboardStatus)} />
              <Detail label="Mode" value={getScoreboardIntegrationModeLabel(scoreboardProfile.integrationMode)} />
              <Detail label="Session Link" value={connectedProfile.scoreboardProfileId ?? "Field fallback profile"} />
            </div>
          ) : (
            <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No scoreboard profile configured. Manual GameDay OS scoreboard remains available.</p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link className="ui-button ui-button-secondary" href={`/admin/sessions/${session.id}`}>Score Control</Link>
            <Link className="ui-button ui-button-secondary" href={getPublicScoreboardUrl(session.id)}>Public Scoreboard</Link>
            <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">
              Future adapter placeholder
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Streaming / Media" title="Livestream and media links">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Livestream Source" value={session.primaryLinkLabel ?? "Not configured"} />
            <Detail label="Active Resources" value={activeResources.filter((resource) => resource.activationType === "livestream_link" || resource.activationType === "parent_camera").length} />
            <Detail label="Configured Profile" value={Object.keys(connectedProfile.streamingProfile).length > 0 ? "Configured placeholder" : "Not configured"} />
          </div>
          <div className="mt-4 grid gap-3">
            {mediaLinks.length > 0 ? mediaLinks.map((link) => (
              <a className="rounded-lg bg-[var(--background)] p-3 text-sm font-black text-[var(--accent-strong)]" href={link.url} key={`${link.label}-${link.url}`} rel="noreferrer" target="_blank">
                {link.label}
              </a>
            )) : (
              <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No media links configured.</p>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {futureStreamingIntegrations.map((provider) => (
              <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--background)] p-3 text-center text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]" key={provider}>
                {provider}
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No streaming API integration is live yet. These providers are future integration placeholders.</p>
        </SectionCard>

        <SectionCard eyebrow="Sponsors" title="Sponsor package">
          <div className="grid gap-3">
            {sponsorPlacements.length > 0 ? sponsorPlacements.map((placement) => (
              <div className="rounded-lg bg-[var(--background)] p-3" key={placement.id}>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{placement.placementLabel}</p>
                <p className="mt-1 font-black">{placement.sponsor.name}</p>
              </div>
            )) : (
              <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No sponsors assigned to this game yet.</p>
            )}
          </div>
          <p className="mt-3 text-xs font-semibold text-[var(--muted)]">Sponsor package metadata: {Object.keys(connectedProfile.sponsorPackage).length > 0 ? "Configured" : "Not configured"}</p>
        </SectionCard>

        <SectionCard eyebrow="Weather" title="Weather and delay context">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Weather Alerts" value={operationAlerts.filter((alert) => alert.alertType === "weather").length} />
            <Detail label="Delay Alerts" value={operationAlerts.filter((alert) => alert.alertType === "delay").length} />
          </div>
          <p className="mt-4 rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">Weather automation is not connected. Venue Command Center remains the source of truth for delay and all-clear workflow.</p>
        </SectionCard>

        <SectionCard eyebrow="Timeline" title="Connected game timeline">
          <p className="mb-4 rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">
            Important session events should appear here: game started, score updated, delay applied, all clear, and game final.
          </p>
          <div className="grid gap-3">
            {sessionEvents.length > 0 ? sessionEvents.slice(0, 8).map((event) => (
              <article className="rounded-lg bg-[var(--background)] p-3" key={event.id}>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">{getSessionEventTypeLabel(event.eventType)}</p>
                <p className="mt-1 text-sm font-black">{event.eventMessage}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{formatDateTime(event.createdAt)}</p>
              </article>
            )) : (
              <p className="rounded-lg bg-[var(--background)] p-3 text-sm font-semibold text-[var(--muted)]">No timeline events recorded yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Public Links" title="Parent and display links">
          <div className="grid gap-3 sm:grid-cols-2">
            {field ? <Link className="ui-button ui-button-secondary" href={getPublicFieldUrl(field.id)}>Open Public Field Page</Link> : null}
            <Link className="ui-button ui-button-secondary" href={getPublicScoreboardUrl(session.id)}>Open Public Scoreboard</Link>
            {field ? <Detail label="Field URL" value={getPublicFieldUrl(field.id)} /> : null}
            <Detail label="Scoreboard URL" value={getPublicScoreboardUrl(session.id)} />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Officials and Audio" title="Game support roles">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Officials" value={connectedProfile.officials.length} />
            <Detail label="Volunteers" value={volunteerRoles.length} />
            <Detail label="Audio Mode" value={audioProfile ? getAudioModeLabel(audioProfile.audioMode) : "Not configured"} />
            <Detail label="Audio Status" value={audioProfile ? getAudioStatusLabel(audioProfile.status) : "Not configured"} />
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
