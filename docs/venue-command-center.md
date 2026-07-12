# Venue Command Center

Last reviewed: June 29, 2026

## Purpose

Venue Command Center is the core venue-wide operating layer for GameDay OS.

It replaces the older "Operations Center" product language while preserving the existing `/admin/operations-center` route for compatibility. The clearer long-term route alias is `/admin/venue-command-center`.

## Core Hierarchy

GameDay OS uses this venue-first command model:

Organization
-> Venue
-> Venue Command Center
-> Fields
-> Sessions

The Venue Command Center is the source of truth for venue authority. Tournaments, leagues, teams, and sessions may consume venue status, but they do not own venue infrastructure, emergency state, weather delay decisions, or public venue communications.

## Responsibilities

Venue Command Center owns:

- Venue Status
- Communications
- Delay Management
- Weather Awareness
- Incident Management placeholders
- Operations Timeline
- Automation Targets placeholders
- Digital Venue Awareness
- Decision Support placeholders

## Venue Status Options

Supported operator-facing states:

- Normal Operations
- Weather Delay
- Schedule Delay
- Closed
- Emergency
- Maintenance

These statuses are represented through existing alert lifecycle records and field status updates. No separate hardware or push notification control is active in v1.

## Announcement Types

Supported announcement categories:

- Weather
- Parking
- Tournament
- General
- Emergency
- Concessions
- Field Change
- Lost Child
- Medical
- Maintenance

Public pages should show active public announcements first and move cleared or expired messages into recent updates.

## Delay Management

Delay management has three levels:

- Venue delay: affects the venue-wide command state.
- Field delay: tracks field-level delay and closure.
- Session delay: placeholder for future per-session delay workflow.

Field delay values:

- On Time
- 15 min behind
- 30 min behind
- 45 min behind
- 60+ min behind
- Closed

## Incident Management

Incident management is currently a platform placeholder. The supported taxonomy is:

- Injury
- Medical Emergency
- Lost Child
- Equipment Failure
- Power Outage
- Network Outage
- Security Event

Future incident workflows must create audit records, respect scoped permissions, and surface the right public impact without implying emergency integrations are live.

## Public Impact

Venue Command Center state is consumed by:

- Public Venue Page
- Public Field Pages
- Venue Display Board
- Game Day Center
- Status Board
- Executive Dashboard
- Pilot Launch Dashboard

The command center should remain the write surface for venue status, venue-wide announcements, delay state, all-clear actions, and emergency/closure communications.

## Automation Targets

Automation targets are placeholders only:

- Public Pages
- Venue Displays
- Scoreboards
- Audio / PA
- Push Notifications
- Streaming Overlays

GameDay OS does not control hardware, PA systems, scoreboards, streaming overlays, or push notifications yet.

## Decision Support

Decision Support is rules-based in v1 and should not be presented as live AI automation. Example cards:

- Field 3 is 45 minutes behind. Consider notifying parents.
- Venue is delayed. Confirm resume time.
- Emergency mode active. Public display override recommended.

Future AI, optimization, and automation modules may read Venue Command Center state, but sensitive actions must still be permission checked and audit logged server-side.
