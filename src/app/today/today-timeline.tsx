"use client";

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/overlays";
import {
  EmptyState,
  GameDayCard,
  ScheduleChangeBanner,
  SectionHeader,
  buttonStyles,
  cx,
  type StatusTone,
} from "@/components/ui/gameday-ui";
import {
  buildTodayTimeline,
  eventChangePresentation,
  todayEventNeedsAttention,
  type TodayEvent,
} from "@/lib/services/today-timeline";
import { fieldStatusPresentation, gameStatusPresentation } from "@/lib/ui/status-presentation";

type QuickFilter = "all" | "mine" | "attention";
type EventStateFilter = "all" | "live" | "scheduled" | "changed";

function EventCard({ event, venueName }: { event: TodayEvent; venueName: string }) {
  const change = eventChangePresentation(event);
  const gameStatus = gameStatusPresentation(event.status, event.lifecycleStatus);
  const fieldStatus = fieldStatusPresentation(event.fieldStatus);
  return (
    <GameDayCard
      assignment={event.assignment ? `Assigned: ${event.assignment}` : undefined}
      date={event.dateLabel}
      details={event.status === "active" ? (
        <p className="font-bold">{event.homeTeam} <span className="tabular-nums">{event.homeScore}</span> · {event.awayTeam} <span className="tabular-nums">{event.awayScore}</span></p>
      ) : <p className="capitalize text-[var(--muted)]">{event.sportType} · {event.lifecycleStatus.replaceAll("_", " ")}</p>}
      eventName={event.eventName}
      fieldStatus={fieldStatus.label.replace("FIELD ", "")}
      location={event.fieldName}
      opponent={event.opponent}
      primaryAction={<Link className={buttonStyles("primary")} href={`/scoreboard/${event.id}`}>{event.status === "active" ? "Open live game" : "View game"}</Link>}
      scheduleChange={change ? <ScheduleChangeBanner title={change.title} tone={change.tone}>{change.detail}</ScheduleChangeBanner> : undefined}
      secondaryActions={<Link className={buttonStyles("secondary")} href={`/fields/${event.fieldId}`}>View field</Link>}
      startTime={event.timeLabel}
      status={gameStatus.label}
      statusTone={gameStatus.tone as StatusTone}
      venue={venueName}
    />
  );
}

export function TodayTimeline({ events, venueName }: Readonly<{ events: TodayEvent[]; venueName: string }>) {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [fieldId, setFieldId] = useState("all");
  const [eventState, setEventState] = useState<EventStateFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const hasAssignments = events.some((event) => Boolean(event.assignment));
  const fields = useMemo(() => Array.from(new Map(events.map((event) => [event.fieldId, event.fieldName]))), [events]);
  const showAdvanced = events.length > 5 || fields.length > 2;

  const filtered = useMemo(() => events.filter((event) => {
    if (quickFilter === "mine" && !event.assignment) return false;
    if (quickFilter === "attention" && !todayEventNeedsAttention(event)) return false;
    if (fieldId !== "all" && event.fieldId !== fieldId) return false;
    if (eventState === "live" && event.status !== "active") return false;
    if (eventState === "scheduled" && event.status !== "scheduled") return false;
    if (eventState === "changed" && !todayEventNeedsAttention(event)) return false;
    return true;
  }), [eventState, events, fieldId, quickFilter]);

  const timeline = buildTodayTimeline(filtered);
  const sections = [
    { key: "attention", title: "Changed or needs attention", description: "Cancelled, delayed, closed, or unavailable.", events: timeline.attention },
    { key: "now", title: "Now", description: "Games currently in progress.", events: timeline.now },
    { key: "next", title: "Next", description: "The next events to prepare for.", events: timeline.next },
    { key: "later", title: "Later today", description: "Everything still ahead after next up.", events: timeline.later },
  ].filter((section) => section.events.length > 0);

  const quickFilters: Array<{ key: QuickFilter; label: string }> = [
    { key: "all", label: "All" },
    ...(hasAssignments ? [{ key: "mine" as const, label: "My Events" }] : []),
    { key: "attention", label: "Needs Attention" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Today quick filters">
        {quickFilters.map((filter) => (
          <button
            aria-pressed={quickFilter === filter.key}
            className={cx("min-h-11 rounded-full px-4 text-sm font-extrabold ring-1 ring-inset", quickFilter === filter.key ? "bg-[var(--black-soft)] text-white ring-[var(--black-soft)]" : "bg-white text-[var(--foreground)] ring-[var(--line-strong)]")}
            key={filter.key}
            onClick={() => setQuickFilter(filter.key)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
        {showAdvanced ? (
          <button className={buttonStyles("secondary", "rounded-full")} onClick={() => setSheetOpen(true)} type="button">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
          </button>
        ) : null}
      </div>

      {sections.length ? (
        <div className="mt-6 grid gap-8">
          {sections.map((section) => (
            <section key={section.key}>
              <SectionHeader description={section.description} title={section.title} />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {section.events.map((event) => <EventCard event={event} key={event.id} venueName={venueName} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState className="mt-6" message={quickFilter === "attention" ? "No changed, cancelled, or delayed events need your attention." : "There are no events in this view."} title={quickFilter === "attention" ? "You’re all caught up" : "No games today"} />
      )}

      <Sheet description="Narrow the timeline only when the quick filters are not enough." onClose={() => setSheetOpen(false)} open={sheetOpen} title="Filter today">
        <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-extrabold" htmlFor="today-field-filter">
            Field
            <select className="ui-input" id="today-field-filter" onChange={(event) => setFieldId(event.target.value)} value={fieldId}>
              <option value="all">All fields</option>
              {fields.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-extrabold" htmlFor="today-state-filter">
            Event state
            <select className="ui-input" id="today-state-filter" onChange={(event) => setEventState(event.target.value as EventStateFilter)} value={eventState}>
              <option value="all">All states</option>
              <option value="live">Live now</option>
              <option value="scheduled">Scheduled</option>
              <option value="changed">Changed or needs attention</option>
            </select>
          </label>
          <button className={buttonStyles("primary")} onClick={() => setSheetOpen(false)} type="button">Show events</button>
          <button className={buttonStyles("quiet")} onClick={() => { setFieldId("all"); setEventState("all"); }} type="button">Clear advanced filters</button>
        </div>
      </Sheet>
    </div>
  );
}
