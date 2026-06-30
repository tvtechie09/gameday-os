# Phase 1 Platform Refactor - Operations First

Date: June 30, 2026

## Goal

Refactor GameDay OS so major venue workflows revolve around Operations Center rather than isolated feature pages.

This phase is architecture-only. No new product features are introduced here.

## Executive Summary

GameDay OS is directionally aligned with an operations-first venue platform, but the implementation still has several pages independently assembling operational state from alerts, fields, sessions, notifications, and display payloads.

The strongest current source of truth is `/admin/operations-center`, specifically its server actions in `src/app/admin/operations-center/actions.ts`. Those actions already own the most important venue operations mutations:

- venue status actions
- delay and all-clear workflows
- public announcements
- emergency and weather communications
- field delay state through `field.status`
- clearing operational alerts
- revalidating public venue, public field, display, dashboard, and status surfaces

The refactor should formalize this into an Operations Data Layer so dashboards and public pages consume the same operations state instead of reconstructing it in parallel.

## Operations Center Source Of Truth

Operations Center should own these concepts:

- **Venue Status:** Normal Operations, Delay, Closed, Emergency
- **Announcements:** venue-wide, field-specific, tournament-aware public communications
- **Delays:** venue-level delay, field-level delay, all-clear, reset to on-time
- **Emergency:** urgent venue-owned communication and override path
- **Public Communications:** active public alerts, cleared/recent updates, all-clear lifecycle

Current implementation already maps these concepts mostly through:

- `alerts`
- `fields.field_status`
- `notifications`
- Operations Center server actions

Phase 1 should not create a second operations table unless the current alert/field model proves insufficient. The next refactor should first centralize read models and helper functions.

## Current Module Audit

### Operations Center

Keep as the operational command surface.

Current responsibilities:

- Creates operations alerts and announcements.
- Clears delay/weather/emergency/closure alerts through `clearActiveOperationsAlerts`.
- Updates field status for delays, closures, reopen, and all-clear.
- Creates notification records for operations events.
- Revalidates all affected admin and public surfaces.

Issues:

- Venue status is inferred from alerts and field statuses at render time.
- Operations history is represented as inactive/expired alert records rather than a dedicated read model.
- Delay state is coupled to `field.status`, which works for v1 but limits richer delay durations like 15/30/45 minutes.

Recommendation:

- Keep `/admin/operations-center` as the only write surface for venue-wide status, delays, all-clear, emergency, and public operations announcements.
- Extract shared read helpers into an operations service.

### Game Day Center

Keep as the live command view.

Current overlap:

- Counts active alerts.
- Flags delayed/closed fields.
- Displays field status.
- Links to weather delay alert creation.
- Computes active/upcoming sessions independently.

Recommendation:

- Game Day Center should consume an Operations Snapshot per venue/field.
- It should not infer public communication state itself.
- It may keep game/session-specific calculations, but operational alert, delay, and venue status should come from Operations Center data helpers.

### Executive Dashboard

Keep as leadership summary.

Current overlap:

- Summarizes active alerts, active games, resources, volunteers, and health.
- Re-derives some operational health signals independently.

Recommendation:

- Executive Dashboard should consume aggregated Operations KPIs:
  - active operations alerts
  - delayed fields
  - closed fields
  - emergency state
  - active announcements
- It should not contain its own alert lifecycle logic.

### Status Board

Keep as tactical field board.

Current overlap:

- Shows field status.
- Shows active alerts count.
- Allows quick status updates.

Recommendation:

- Status Board should remain a field-by-field operating view.
- Quick status changes should route through Operations Center actions or a shared operations service, not directly duplicate field/alert mutation behavior.
- Field cards should consume the same operations status/read model used by public displays.

### Public Venue Page

Keep as public family/visitor surface.

Current overlap:

- Loads active alerts.
- Shows active operations-style alerts.
- Shows today’s schedule and field status.

Recommendation:

- Public Venue Page should consume a public operations payload:
  - active public operations alerts
  - recent cleared updates
  - venue status
  - field status/delay state
- It should not independently decide which alerts are operational beyond using shared filters.

### Public Field Page

Keep as QR landing page.

Current overlap:

- Separates active alerts and recent updates.
- Filters venue-wide, field-specific, and tournament alerts.
- Shows field delayed/closed/maintenance banners.
- Computes current/next game locally.

Recommendation:

- Keep game/session display local to the field page.
- Move alert filtering, recent-update de-duping, and operational banner logic into a shared public operations helper.
- Field Page should read `operationsStatus`, `activeOperationsAlerts`, and `recentOperationsUpdates` from that helper.

### Notifications

Keep as internal event stream.

Current overlap:

- Alert creation and session status changes create notification rows.
- Operations actions create notification records for some lifecycle events.

Recommendation:

- Notifications should be treated as internal event receipts, not the canonical public communication state.
- Operations Center should continue to create notifications for major operations events.
- Future notification sending should subscribe to operations events, not bypass Operations Center.

### Alerts

Keep as communication records.

Current overlap:

- Alerts act as public communications, operations history, field closures, weather events, parking notices, and tournament notices.

Recommendation:

- Alerts remain the public communication table for v1.
- Add service-level semantics around operations-created alerts:
  - active operations alerts
  - cleared operations updates
  - venue status inference
  - all-clear duplicate protection
- Avoid adding direct alert mutations in pages outside Operations Center and Alerts Admin.

## Identified Overlap

| Capability | Current Duplicate Areas | Recommended Owner |
| --- | --- | --- |
| Venue status inference | Operations Center, public pages, display/dashboard surfaces | Operations service |
| Active public alert filtering | Alerts service, Public Field, Public Venue, Venue Display, Game Day | Alerts/operations service |
| Recent updates / cleared alerts | Public Field and Operations Center history | Operations service |
| Field delay status | Operations Center, Status Board, Field Control, Game Day | Operations service for mutations; fields service for primitive update |
| Weather delay actions | Operations Center and legacy Weather Operations route | Operations Center |
| All-clear lifecycle | Operations Center actions and public pages | Operations Center actions + shared read helpers |
| Active/upcoming session logic | Game Day, Public Field, Venue Display, System Health | Shared session status helper |
| Dashboard alert counts | Game Day, Executive, Status Board, Public Display | Operations snapshot |

## Suggested Page Consolidation

### Keep Primary Surfaces

- `/admin/operations-center` - source of truth for venue status, announcements, delays, emergency, all-clear.
- `/admin/game-day` - live field/session operating grid.
- `/admin/status-board` - fast field status board.
- `/admin/executive` - leadership summary.
- `/venues/[venueId]` - public venue landing page.
- `/fields/[fieldId]` - public field QR landing page.
- `/admin/alerts` - alert record administration.
- `/admin/notifications` - internal event feed.

### Merge Or Redirect

- `/admin/weather/operations` should be merged into or redirected to `/admin/operations-center`.
- Weather delay creation links should point to Operations Center actions rather than generic alert creation when the intent is operational delay.
- Repeated dashboard cards for active alerts, delayed fields, and closed fields should come from one Operations Snapshot helper.

### Rename For Clarity

- “Game Day” can become “Game Day Center” consistently in navigation and headers.
- “Operations Dashboard” should be differentiated from “Venue Operations Center”; if it remains, position it as metrics/overview rather than control.
- “Alerts” should be described as “Alert Records” or “Communications Admin” where needed so users understand Operations Center is where live communications happen.

## Proposed Operations Data Layer

Create a reusable service in a future implementation pass:

```text
src/lib/services/operations.ts
```

Recommended functions:

- `getVenueOperationsSnapshot(venueId)`
- `getPublicVenueOperations(venueId)`
- `getPublicFieldOperations({ venueId, fieldId, tournamentId })`
- `getOperationsHistory(venueId)`
- `inferVenueOperationsStatus({ alerts, fields })`
- `getActiveOperationsAlerts(venueId)`
- `getRecentOperationsUpdates(venueId)`
- `createOperationsAnnouncement(input)`
- `startVenueDelay(input)`
- `clearVenueOperations(input)`
- `setFieldDelay(input)`

Recommended read shape:

```ts
type VenueOperationsSnapshot = {
  venueId: string;
  status: "normal" | "delay" | "closed" | "emergency";
  activeAnnouncements: Alert[];
  activeOperationsAlerts: Alert[];
  recentUpdates: Alert[];
  delayedFields: Field[];
  closedFields: Field[];
  fieldStatuses: Array<{
    fieldId: string;
    status: Field["status"];
    activeAlerts: Alert[];
  }>;
};
```

This keeps existing tables intact while giving all pages a shared operations contract.

## How Other Pages Should Consume Operations Data

### Game Day Center

Consume:

- venue status
- delayed/closed fields
- active operations alerts
- public communication gaps

Keep local:

- active games
- upcoming games
- resource/volunteer coverage
- scoreboard/audio summaries

### Status Board

Consume:

- field status
- active field alerts
- venue status
- delay/closed highlight state

Use shared operations mutations for:

- quick status update
- reset field delay
- reopen field

### Executive Dashboard

Consume:

- operations health KPIs
- active urgent alerts
- delayed/closed field counts
- all-clear/incident recent activity

Keep local:

- sponsor summary
- utilization summary
- integration summary

### Public Venue And Field Pages

Consume:

- public active operations alerts
- recent cleared updates
- field/venue operational status

Keep local:

- schedule rendering
- sponsor rendering
- field-specific game card layout

### Notifications

Consume:

- operations event records for display

Do not own:

- active public status
- public communications lifecycle

## Technical Debt List

### High Priority

- **No dedicated operations read model:** Pages reassemble operations state from alerts and fields independently.
- **Venue status is inferred in multiple places:** Need one `inferVenueOperationsStatus` helper.
- **Alert filtering is duplicated:** Public field, venue display, Game Day, and alerts service contain overlapping filtering logic.
- **All-clear is represented as inactive alert history:** Works for v1 but should be formalized through operations history helpers.
- **Weather Operations route remains separate:** Creates conceptual split from Operations Center.

### Medium Priority

- **Session active/upcoming logic is duplicated:** Game Day, Public Field, Venue Display, and System Health each compute similar session state.
- **Field delay amount is not modeled separately:** `field.status = delayed` cannot represent 15/30/45/60+ minute delay without relying on alert text.
- **Status Board quick controls risk bypassing operations intent:** Any direct field mutation should use operations-layer semantics when it affects public status.
- **Notifications and alerts are easy to confuse:** Need clearer product language: alerts communicate publicly; notifications record internal events.

### Lower Priority

- **Route names overlap:** Operations Dashboard, Operations Center, Game Day Center, Status Board, Executive Dashboard are valid but need clearer navigation descriptions.
- **Public display payload has custom operations assembly:** Should consume the same operations snapshot as public venue/field.
- **Schema Audit and System Health may grow separate recommendation logic:** AI Assistant and System Health should share diagnostic context over time.

## Refactor Sequence

### Step 1 - Extract Shared Read Helpers

Create `src/lib/services/operations.ts` and move read-only logic first:

- active operations alerts
- public operations alerts
- recent updates
- venue status inference
- delayed/closed field summaries

No UI behavior should change in this step.

### Step 2 - Move Consumers To Operations Snapshot

Update:

- Game Day Center
- Status Board
- Public Venue Page
- Public Field Page
- Venue Display
- Executive Dashboard

Each page should stop manually filtering operational alerts once snapshot helpers exist.

### Step 3 - Centralize Mutations

Move Operations Center server action internals into service functions while keeping server actions as the route boundary.

Target:

- `startVenueDelay`
- `endVenueDelay`
- `allClearVenue`
- `closeVenue`
- `reopenVenue`
- `createVenueAnnouncement`
- `clearOperationsAlert`
- `setFieldDelay`

### Step 4 - Retire Or Redirect Legacy Surfaces

- Redirect `/admin/weather/operations` to `/admin/operations-center`.
- Replace weather-delay alert links with Operations Center links.

### Step 5 - Add Tests Around Operations Contracts

Tests should cover:

- venue delay creates public active alert and delayed field status
- all-clear closes active delay/weather/emergency alerts
- all-clear creates one recent update
- public field page receives active alerts from operations helper
- public venue page excludes cleared alerts from active section
- status board counts active operations alerts from snapshot

## Acceptance Criteria For Phase 1

- Operations Center is documented as the only source of truth for venue status, announcements, delays, emergency, and public communications.
- No new feature surfaces are introduced.
- Existing pages continue to render.
- Other pages have a clear migration path to consume Operations Snapshot data.
- Technical debt and page consolidation recommendations are captured for the next implementation sprint.

