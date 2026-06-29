# Operations Center Roadmap

Last reviewed: June 27, 2026

## Role In The Product

The Operations Center is the venue-wide communication and delay management layer for GameDay OS.

It is the source of truth for:

- venue status
- venue-wide announcements
- delay state
- field closures
- weather decisions
- emergency notices
- all-clear events
- public operations messages

## Current Alignment

The current route is:

`/admin/operations-center`

Related routes:

- `/admin/game-day`
- `/admin/status-board`
- `/admin/pilot-launch`
- `/admin/weather/operations`
- `/venues/[venueId]`
- `/fields/[fieldId]`
- `/display/venue/[venueId]`

## Venue Status

Venue status should support:

- Normal Operations
- Delay
- Closed
- Emergency

Status must be visible wherever operations matter:

- Operations Center
- Game Day Center
- Status Board
- Pilot Launch Dashboard
- Public venue page
- Public field pages
- Venue display board

## Alert Lifecycle

Active operations alerts should:

- appear above public content
- include alert type
- include message
- include timestamp
- indicate active/cleared state where relevant

Cleared or expired alerts should:

- disappear from primary active alert sections
- move to Recent Updates
- avoid duplicate all-clear messages

All Clear should:

- set venue status to Normal Operations
- clear active delay/closure/emergency/weather alerts
- reset affected field delays to On Time
- create one history entry
- prevent duplicate all-clear announcements

## Venue Control vs Tournament Control

Venue controls:

- operations status
- weather/delay/emergency alerts
- field status
- resources
- scoreboards
- audio
- displays
- public venue communications

Tournament controls:

- tournament schedule
- bracket/session management
- field assignments
- delay impacts to tournament schedule
- tournament announcements

Tournament announcements may be public, but they must not override venue emergency or facility closure decisions.

## Roadmap

Phase 1: Stabilize venue operations
- Ensure all-clear behavior is reliable.
- Ensure alert lifecycle is consistent across admin/public/display pages.
- Ensure duplicate all-clear messages are suppressed.
- Ensure recent updates are visible but not confused with active alerts.

Phase 2: Field delay management
- Manage per-field delay state.
- Support reset all fields to On Time.
- Support closed/reopened field actions.
- Reflect field delay state in Status Board and Venue Mode.

Phase 3: Complex venue operations
- Add zone-level views.
- Add parent field vs play surface status views.
- Support split-field delay handling.
- Show play-surface schedule in Venue Mode.

Phase 4: Equipment awareness
- Surface scoreboard/audio/display readiness.
- Keep provider endpoints as metadata until real integrations exist.
- Add health states for equipment endpoints.

Phase 5: Emergency hierarchy
- Enforce venue emergency override above tournament/league/team operations.
- Audit every emergency action.
- Add emergency review views for owners/admins.

## QA Focus

- All Clear clears active operations alerts.
- Venue status returns to Normal Operations.
- Field delays reset.
- Public venue page shows only active alerts at top.
- Public field page shows only relevant active alerts at top.
- Recent Updates contains cleared/expired messages.
- Status Board alert counts match active alerts.
- Game Day Center highlights delayed/closed fields.
- Venue Display Board refreshes operational state.
