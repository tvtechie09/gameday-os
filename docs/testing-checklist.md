# GameDay OS Testing Checklist

Last reviewed: June 27, 2026

## Build And Smoke Tests

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
- Open `/admin/dashboard`.
- Open `/admin/operations-center`.
- Open `/admin/status-board`.
- Open `/admin/game-day`.
- Open `/admin/schema-audit`.
- Open `/admin/system-health`.

## Organization Filtering

- Select All Organizations.
- Confirm admin pages show all eligible records.
- Select one organization.
- Confirm venues, fields, sessions, sponsors, alerts, resources, and dashboards are filtered.
- Confirm "Viewing as [Organization]" badge appears where expected.
- Reset to All Organizations.

## Crossroads Field/Subfield Setup

- Create one organization.
- Create one venue.
- Add venue branding.
- Add venue map and map notes.
- Create 9 parent fields.
- Configure field map labels and coordinates.
- Create Field 3 as a parent field.
- Configure Field 3 full-size play surface.
- Configure Field 3 split play surfaces: 3A, 3B, 3C.
- Create sessions on Field 3 full-size.
- Create sessions on 3A, 3B, and 3C.
- Confirm Venue Mode groups today's schedule by play surface.
- Confirm QR entries exist for venue, parent field, and play surface targets.

## Operations Center All-Clear

- Start a venue delay.
- Create active weather/delay alert.
- Mark one or more fields delayed.
- Click All Clear.
- Confirm venue status is Normal Operations.
- Confirm active delay/weather alerts are closed.
- Confirm field delays reset to On Time.
- Confirm only one all-clear history item is created.
- Confirm no duplicate all-clear alert appears publicly.

## Venue-Wide Alerts

- Create a venue-wide public alert.
- Confirm it appears on public venue page.
- Confirm it appears on relevant public field pages.
- Confirm it appears on venue display board.
- Confirm urgent alerts appear above other content.
- Clear or expire the alert.
- Confirm it moves to Recent Updates.

## Field-Specific Alerts

- Create a field-specific alert.
- Confirm it appears only on the affected field page.
- Confirm it is counted on Status Board for that field.
- Confirm it does not appear as a primary alert for unrelated fields.
- Clear or expire the alert.
- Confirm it leaves active alert sections.

## Manual Scoreboard

- Create or select a session.
- Open session dashboard.
- Open Score Control.
- Update home score.
- Update away score.
- Update inning/period/count/status.
- Open public scoreboard.
- Confirm display updates within polling interval.
- Confirm score changes do not affect unrelated sessions.

## Public Venue Page

- Open `/venues/[venueId]`.
- Confirm venue branding loads.
- Confirm active alerts render at top.
- Confirm "Today at this venue" is clear.
- Confirm field list is scannable on mobile.
- Confirm field status is visible.
- Confirm map is responsive.
- Confirm sponsors and resources appear only when configured.

## Public Field Page

- Open `/fields/[fieldId]`.
- Confirm field name and venue name are obvious.
- Confirm current/next game appears first.
- Confirm score/status is clear.
- Confirm active operations alerts appear above schedule.
- Confirm today's schedule is visible.
- Confirm sponsors appear below game/schedule content.
- Confirm resource/volunteer/community actions do not overwhelm parent view.

## Permissions Framework

- Confirm `canUser()` returns true only for active scoped assignments.
- Confirm expired assignments fail.
- Confirm revoked assignments fail.
- Confirm venue roles do not grant tournament permissions unless separately assigned.
- Confirm tournament roles do not grant venue device/operations control.
- Confirm scorekeeper can update only assigned game/session/play surface.
- Confirm stream operator cannot update score unless separately assigned.
- Confirm parent cannot update score or venue operations.
- Confirm successful sensitive mutations write audit logs.

## Schema Audit

- Open `/admin/schema-audit`.
- Confirm expected tables include identity, operations, alerts, resources, scoreboards, audio, venue mode, and analytics tables.
- Confirm missing tables/columns are reported clearly.
- Confirm SQL snippets are read-only display and not executed automatically.
- Confirm Schema Audit links from System Health and Executive Dashboard still work.

## Venue Mode

- Open `/admin/venues/[venueId]/mode`.
- Confirm venue map section renders.
- Confirm zones and play surfaces display when configured.
- Confirm fallback surfaces use existing fields when no play surfaces exist.
- Confirm today's schedule is grouped by play surface.
- Confirm live status counts open, active, delayed, closed, maintenance, and active sessions.
- Confirm QR entry points include venue, venue display, parent field, play surface, and configured QR endpoints.
- Confirm equipment endpoints show as placeholders only.
- Confirm Meraki and Cisco Spaces are not called.

## Regression Checks

- Existing venue list loads.
- Existing field list loads.
- Existing session list loads.
- Existing sponsor list loads.
- Existing public field pages load.
- Existing public venue pages load.
- Existing scoreboard pages load.
- Existing QR pages load.
