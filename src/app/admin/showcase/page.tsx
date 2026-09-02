import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, QrCode, Radio, Sparkles, Trophy, Wrench } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { FieldQrCode } from "@/components/field-qr-code";
import { getCurrentOrganizationScope } from "@/lib/organization-scope";
import {
  getPublicAppUrl,
  getPublicFieldScoreboardUrl,
  getPublicFieldUrl,
  getPublicVenueDisplayUrl,
  getPublicVenueUrl,
} from "@/lib/public-url";
import { getFields, getFieldStatusLabel } from "@/lib/services/fields";
import { getOrganization } from "@/lib/services/organizations";
import { getResourceTypeLabel, getResources } from "@/lib/services/resources";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAssignments, getSponsors } from "@/lib/services/sponsors";
import { getVenues } from "@/lib/services/venues";
import type { Field, Resource, Session, Sponsor, SponsorAssignment, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

type ShowcaseLink = {
  href: string;
  label: string;
  note: string;
};

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load showcase ${label}`, error);
    return [];
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isToday(value: string, now: Date) {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function groupTodaySchedule(fields: Field[], sessions: Session[], now: Date) {
  const sessionsByFieldId = new Map<string, Session[]>();

  for (const session of sessions.filter((item) => isToday(item.startTime, now))) {
    sessionsByFieldId.set(session.fieldId, [...(sessionsByFieldId.get(session.fieldId) ?? []), session]);
  }

  return fields.map((field) => ({
    field,
    sessions: (sessionsByFieldId.get(field.id) ?? []).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  }));
}

function getRelevantSponsors({
  assignments,
  fields,
  sessions,
  sponsors,
  venues,
}: {
  assignments: SponsorAssignment[];
  fields: Field[];
  sessions: Session[];
  sponsors: Sponsor[];
  venues: Venue[];
}) {
  const venueIds = new Set(venues.map((venue) => venue.id));
  const fieldIds = new Set(fields.map((field) => field.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const sponsorIds = new Set(assignments.filter((assignment) => (
    Boolean(assignment.venueId && venueIds.has(assignment.venueId))
    || Boolean(assignment.fieldId && fieldIds.has(assignment.fieldId))
    || Boolean(assignment.sessionId && sessionIds.has(assignment.sessionId))
  )).map((assignment) => assignment.sponsorId));

  return sponsors.filter((sponsor) => sponsorIds.has(sponsor.id));
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: number | string }) {
  return (
    <article className="rounded-lg border border-white/15 bg-white/10 p-4 text-white">
      <Icon className="h-5 w-5 text-white/70" aria-hidden="true" />
      <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-white/55">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
    </article>
  );
}

function SectionHeader({ note, title }: { note: string; title: string }) {
  return (
    <div>
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
    </div>
  );
}

function LinkPanel({ link }: { link: ShowcaseLink }) {
  return (
    <article className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-black">{link.label}</p>
        <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{link.note}</p>
        <p className="mt-2 break-all rounded-lg bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--accent-strong)]">{link.href}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyLinkButton value={link.href} />
        <Link className="ui-button ui-button-secondary min-h-11 px-3 py-2 text-xs" href={link.href}>
          Open
        </Link>
      </div>
    </article>
  );
}

function DemoPreview({ href, note, title }: { href: string; note: string; title: string }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <div className="h-64 overflow-hidden bg-[var(--black-soft)]">
        <iframe className="h-[520px] w-full origin-top scale-[0.5] border-0 sm:scale-[0.62]" src={href} title={`${title} preview`} />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-black">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
        <Link className="ui-button ui-button-primary mt-4 w-full" href={href}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open Demo View
        </Link>
      </div>
    </article>
  );
}

export default async function ShowcasePage() {
  const selectedOrganizationId = await getCurrentOrganizationScope();
  const [venues, fields, sessions, sponsors, sponsorAssignments, resources] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Session>("sessions", getSessions),
    safeLoad<Sponsor>("sponsors", getSponsors),
    safeLoad<SponsorAssignment>("sponsor assignments", getSponsorAssignments),
    safeLoad<Resource>("resources", getResources),
  ]);

  const organization = selectedOrganizationId
    ? await getOrganization(selectedOrganizationId).catch((error: unknown) => {
      console.error("Failed to load selected showcase organization", error);
      return null;
    })
    : null;

  const now = new Date();
  const organizationName = organization?.name ?? "All Organizations";
  const activeResources = resources.filter((resource) => resource.status === "active");
  const todaySchedule = groupTodaySchedule(fields, sessions, now);
  const relevantSponsors = getRelevantSponsors({ assignments: sponsorAssignments, fields, sessions, sponsors, venues });
  const firstVenue = venues[0] ?? null;
  const firstField = fields[0] ?? null;
  const appUrl = getPublicAppUrl();

  const publicLinks: ShowcaseLink[] = [
    ...venues.map((venue) => ({
      href: getPublicVenueUrl(venue.id),
      label: `${venue.name} Public Venue Page`,
      note: "Parent-facing venue landing page",
    })),
    ...fields.map((field) => ({
      href: getPublicFieldUrl(field.id),
      label: `${field.name} Public Field Page`,
      note: "QR landing page for live game info",
    })),
    ...fields.slice(0, 6).map((field) => ({
      href: getPublicFieldScoreboardUrl(field.id),
      label: `${field.name} Scoreboard`,
      note: "Public field scoreboard display",
    })),
  ];

  const qrLinks: ShowcaseLink[] = [
    ...venues.map((venue) => ({
      href: `${appUrl}/admin/venues/${venue.id}/qr`,
      label: `${venue.name} Venue QR`,
      note: "Printable public venue QR",
    })),
    ...fields.map((field) => ({
      href: `${appUrl}/admin/fields/${field.id}/qr`,
      label: `${field.name} Field QR`,
      note: "Printable public field QR",
    })),
  ];

  const demoReadyLinks: ShowcaseLink[] = [
    ...(firstVenue ? [{
      href: getPublicVenueUrl(firstVenue.id),
      label: "Public Venue Page",
      note: "Parent-facing venue landing page for the selected demo client.",
    }] : []),
    ...(firstField ? [{
      href: getPublicFieldUrl(firstField.id),
      label: "Field Page",
      note: "QR landing experience with live game info, sponsors, resources, and alerts.",
    }] : []),
    ...(firstField ? [{
      href: getPublicFieldScoreboardUrl(firstField.id),
      label: "Scoreboard Display",
      note: "Full-screen public scoreboard display for phones, TVs, projectors, or OBS.",
    }] : []),
    ...(firstVenue ? [{
      href: getPublicVenueDisplayUrl(firstVenue.id),
      label: "Venue Display",
      note: "Venue-wide display board for lobby screens, concession stands, websites, or OBS.",
    }] : []),
    {
      href: "/admin/pilot-launch",
      label: "Pilot Launch",
      note: "Guided setup, rehearsal evidence, support ownership, and launch approval.",
    },
  ];

  const previewCards = [
    { href: "/today", note: "Chronological view of changed, live, upcoming, and completed events.", title: "Today" },
    { href: "/admin/fields", note: "Field status and QR codes for operations staff.", title: "Fields" },
    { href: "/admin/pilot-launch", note: "Guided setup, rehearsal evidence, support ownership, and launch approval.", title: "Pilot Launch" },
    ...(firstVenue ? [{ href: getPublicVenueDisplayUrl(firstVenue.id), note: "TV, lobby, concession, website, or OBS venue display.", title: "Venue Display" }] : []),
    ...(firstField ? [{ href: getPublicFieldScoreboardUrl(firstField.id), note: "High-contrast scoreboard display for the selected demo field.", title: "Scoreboard Display" }] : []),
    ...(firstVenue ? [{ href: getPublicVenueUrl(firstVenue.id), note: "Parent-facing public venue page with fields, schedule, sponsors, and alerts.", title: "Public Venue Page" }] : []),
  ];

  return (
    <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--black-soft)] text-white shadow-sm">
          {organization?.bannerUrl ? (
            <div className="relative h-44 border-b border-white/10 sm:h-64">
              <Image alt="" className="object-cover" fill priority src={organization.bannerUrl} unoptimized />
              <div className="absolute inset-0 bg-black/45" />
            </div>
          ) : null}
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                {organization?.logoUrl ? (
                  <Image alt="" className="h-14 w-14 rounded-lg bg-white object-contain p-2" height={56} src={organization.logoUrl} unoptimized width={56} />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-lg bg-white/10 text-lg font-black">GD</div>
                )}
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">Client Showcase</p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">{organizationName}</h1>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/70">
                A presentation-ready view of venues, fields, QR experiences, public pages, schedules, sponsors, and resources for the selected organization.
              </p>
              <div className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-emerald-400/15 px-3 py-2 text-xs font-black text-emerald-100 ring-1 ring-emerald-300/25">
                Viewing as {organizationName}
              </div>
              {!organization ? (
                <p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-bold leading-6 text-amber-100">
                  Select a demo client in the sidebar to show client-specific branding and filtered data.
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[28rem]">
              <SummaryCard icon={MapPin} label="Venues" value={venues.length} />
              <SummaryCard icon={QrCode} label="Fields" value={fields.length} />
              <SummaryCard icon={CalendarDays} label="Today" value={todaySchedule.reduce((total, group) => total + group.sessions.length, 0)} />
              <SummaryCard icon={Radio} label="Active Resources" value={activeResources.length} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <article className="ui-card p-5 lg:col-span-2">
            <SectionHeader note="Venues and fields available in the selected client view." title="Venue & Field Footprint" />
            <div className="mt-5 grid gap-3">
              {venues.length === 0 ? (
                <p className="ui-empty">No venues are available for this organization view.</p>
              ) : venues.map((venue) => {
                const venueFields = fields.filter((field) => field.venueId === venue.id);

                return (
                  <div className="rounded-lg border border-[var(--line)] p-4" key={venue.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black">{venue.name}</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{venue.address || "No address configured"}</p>
                      </div>
                      <Link className="ui-button ui-button-secondary min-h-10 px-3 py-2 text-xs" href={`/venues/${venue.id}`}>
                        Open Demo View
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {venueFields.length === 0 ? (
                        <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-bold text-[var(--muted)]">No fields yet</span>
                      ) : venueFields.map((field) => (
                        <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-black text-[var(--accent-strong)]" key={field.id}>
                          {field.name} · {getFieldStatusLabel(field.status)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="ui-card p-5 lg:col-span-2">
            <SectionHeader note="Today's schedule grouped by field." title="Today's Schedule" />
            <div className="mt-5 grid gap-3">
              {todaySchedule.every((group) => group.sessions.length === 0) ? (
                <p className="ui-empty">No sessions are scheduled for today.</p>
              ) : todaySchedule.filter((group) => group.sessions.length > 0).map((group) => (
                <div className="rounded-lg border border-[var(--line)] p-4" key={group.field.id}>
                  <h3 className="font-black">{group.field.name}</h3>
                  <div className="mt-3 grid gap-2">
                    {group.sessions.map((session) => (
                      <div className="grid gap-2 rounded-lg bg-[var(--background)] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center" key={session.id}>
                        <p className="text-sm font-black">{formatTime(session.startTime)}</p>
                        <p className="text-sm font-semibold">{session.title}</p>
                        <span className="w-fit rounded-md bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{session.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="ui-card p-5">
            <SectionHeader note="Parent-facing destinations and scoreboard displays." title="Public Links" />
            <div className="mt-5 grid gap-3">
              {publicLinks.length === 0 ? <p className="ui-empty">No public links are available yet.</p> : publicLinks.slice(0, 12).map((link) => <LinkPanel key={`${link.label}-${link.href}`} link={link} />)}
            </div>
          </article>

          <article className="ui-card p-5">
            <SectionHeader note="Printable QR pages for public venue and field experiences." title="QR Links" />
            <div className="mt-5 grid gap-3">
              {qrLinks.length === 0 ? (
                <p className="ui-empty">Create venues and fields to generate QR links.</p>
              ) : qrLinks.slice(0, 10).map((link) => (
                <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 sm:grid-cols-[auto_1fr] sm:items-center" key={`${link.label}-${link.href}`}>
                  <div className="w-fit rounded-lg border border-[var(--line)] bg-white p-2">
                    <FieldQrCode title={link.label} value={link.href} size={92} />
                  </div>
                  <LinkPanel link={link} />
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="ui-card p-5">
            <SectionHeader note="Sponsors assigned to selected venues, fields, or sessions." title="Sponsors" />
            <div className="mt-5 grid gap-3">
              {relevantSponsors.length === 0 ? (
                <p className="ui-empty">No sponsors are assigned in this showcase view.</p>
              ) : relevantSponsors.slice(0, 6).map((sponsor) => (
                <div className="rounded-lg border border-[var(--line)] p-4" key={sponsor.id}>
                  <div className="flex items-center gap-3">
                    {sponsor.logoUrl ? <Image alt="" className="h-12 w-16 rounded bg-[var(--background)] object-contain p-2" height={48} src={sponsor.logoUrl} unoptimized width={64} /> : null}
                    <div>
                      <p className="font-black">{sponsor.name}</p>
                      {sponsor.description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{sponsor.description}</p> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="ui-card p-5">
            <SectionHeader note="Configured venue and field resources." title="Resources" />
            <div className="mt-5 grid gap-3">
              {resources.length === 0 ? (
                <p className="ui-empty">No resources are configured in this showcase view.</p>
              ) : resources.slice(0, 8).map((resource) => (
                <div className="rounded-lg border border-[var(--line)] p-4" key={resource.id}>
                  <p className="font-black">{resource.resourceName}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{getResourceTypeLabel(resource.resourceType)} · {resource.status}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="ui-card p-5">
            <SectionHeader note="Fast launch buttons for a live client demo." title="Open Demo Views" />
            <div className="mt-5 grid gap-3">
              <Link className="ui-button ui-button-primary" href="/today">Today</Link>
              <Link className="ui-button ui-button-secondary" href="/admin/fields">Fields</Link>
              {demoReadyLinks.map((link) => (
                <div className="rounded-lg border border-[var(--line)] p-3" key={`${link.label}-${link.href}`}>
                  <Link className="ui-button ui-button-secondary w-full justify-center" href={link.href}>{link.label}</Link>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--muted)]">{link.note}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="ui-card p-5">
          <SectionHeader note="Preview the main demo surfaces directly from the showcase." title="Screenshots & Demo Links" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {previewCards.map((card) => <DemoPreview href={card.href} key={card.title} note={card.note} title={card.title} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
