# GameDay OS Product Architecture

Last reviewed: June 27, 2026

## Product Position

GameDay OS is a venue-first operations platform for sports facilities. The venue owns the physical environment: fields, play surfaces, scoreboards, audio, displays, weather decisions, emergency communications, QR entry points, resources, and public venue/field pages.

Tournaments, leagues, and teams operate inside that venue environment. They can manage schedules, brackets, teams, and game/session context, but they do not automatically control venue infrastructure.

## Core Hierarchy

The current operating hierarchy is:

Organization
-> Venue
-> Operations Center
-> Field
-> Session

The complex venue foundation extends the physical model:

Organization
-> Venue
-> Zone
-> Parent Field
-> Field Layout
-> Play Surface
-> Session

The original hierarchy remains valid for simpler venues. A field can still be used directly without configuring zones, layouts, or play surfaces.

## Entity Responsibilities

Organization:
- Tenant boundary.
- Owns venues, tournaments, sponsors, integrations, and role assignments.
- Supports selected-organization filtering for admin/demo views.

Venue:
- Physical location and operational authority.
- Owns branding, maps, fields, resources, alerts, scoreboards, audio, displays, and public venue pages.

Operations Center:
- Venue-wide source of truth for operational status, delays, closures, all-clear events, and public communications.
- Should affect public venue page, public field pages, venue display board, Game Day Center, Status Board, and Pilot Launch Dashboard.

Zone:
- Optional physical grouping inside a venue.
- Examples: east complex, west complex, indoor courts, parking, concessions, entrance gates.

Parent Field:
- Physical field asset that may be used as one full surface or subdivided.
- Example: Field 3 can be used full-size or split into 3A, 3B, and 3C.

Field Layout:
- Defines how a parent field is being used.
- Examples: full field, split field, temporary overlay.

Play Surface:
- The schedulable surface where a game/session can occur.
- Can map to a full field or a split child surface.

Session:
- Game/event instance.
- Can remain linked to a field for legacy behavior or attach to `play_surface_id` when configured.

## Current Route/Module Audit

Admin operations:
- `/admin/dashboard`
- `/admin/executive`
- `/admin/game-day`
- `/admin/operations-center`
- `/admin/status-board`
- `/admin/system-health`
- `/admin/schema-audit`
- `/admin/pilot-launch`
- `/admin/pilot-prep`

Tenant and venue setup:
- `/admin/organizations`
- `/admin/organizations/new`
- `/admin/organizations/[organizationId]/edit`
- `/admin/organizations/branding`
- `/admin/venues`
- `/admin/venues/new`
- `/admin/venues/[venueId]/edit`
- `/admin/venues/[venueId]/mode`
- `/admin/venues/[venueId]/qr`

Game operations:
- `/admin/fields`
- `/admin/fields/new`
- `/admin/fields/[fieldId]/edit`
- `/admin/fields/[fieldId]/control`
- `/admin/fields/[fieldId]/qr`
- `/admin/sessions`
- `/admin/sessions/new`
- `/admin/sessions/[sessionId]`
- `/admin/sessions/[sessionId]/edit`
- `/admin/sessions/bulk`
- `/admin/tournaments`
- `/admin/tournaments/new`
- `/admin/tournaments/[tournamentId]/edit`

Venue systems:
- `/admin/scoreboards`
- `/admin/scoreboards/new`
- `/admin/scoreboards/[scoreboardId]/edit`
- `/admin/scoreboards/adapters`
- `/admin/scoreboards/display`
- `/admin/audio`
- `/admin/audio/new`
- `/admin/audio/[audioProfileId]/edit`
- `/admin/resources`
- `/admin/resources/new`
- `/admin/resources/[resourceId]/edit`
- `/admin/resources/activations`
- `/admin/resources/dashboard`
- `/admin/weather`
- `/admin/weather/new`
- `/admin/weather/[weatherProfileId]/edit`
- `/admin/weather/operations`

Engagement and data:
- `/admin/sponsors`
- `/admin/sponsors/new`
- `/admin/sponsors/[sponsorId]`
- `/admin/sponsors/[sponsorId]/edit`
- `/admin/alerts`
- `/admin/alerts/new`
- `/admin/alerts/[alertId]/edit`
- `/admin/notifications`
- `/admin/volunteers`
- `/admin/import`
- `/admin/integrations`
- `/admin/integrations/new`
- `/admin/integrations/health`
- `/admin/sync`
- `/admin/sync/jobs`
- `/admin/sync/review`

Identity:
- `/admin/identity`
- `/admin/roles`

Public surfaces:
- `/venues/[venueId]`
- `/fields/[fieldId]`
- `/display/venue/[venueId]`
- `/scoreboard/[sessionId]`
- `/scoreboard/field/[fieldId]`

## Alignment Notes

- The app is still venue-first.
- The Operations Center is correctly positioned above field/session workflows.
- Complex venues are now represented without breaking simple field/session behavior.
- Public venue and field pages remain the parent-facing surface.
- The Venue Mode shell is a read-only operational layer for maps, surfaces, schedules, QR entry points, and future provider endpoints.
- Equipment providers such as Meraki and Cisco Spaces remain placeholders only.

## Current Gaps To Track

- Field creation/edit UI does not yet fully manage zones, field layouts, or play surfaces.
- Public field pages accept the existing field route; play-surface query targeting exists as QR URL structure but not yet a full public play-surface-specific view.
- Permissions framework supports scoped roles, including play-surface scope, but enforcement coverage is still being expanded route by route.
- Venue Mode endpoint records exist as a provider-ready shell; there are no real equipment integrations yet.
