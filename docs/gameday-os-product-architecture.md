# GameDay OS Product Architecture

Last reviewed: June 29, 2026

## Product Position

GameDay OS is a venue-first operations platform for sports facilities. The venue owns the physical environment: fields, play surfaces, scoreboards, audio, displays, weather decisions, emergency communications, QR entry points, resources, and public venue/field pages.

Tournaments, leagues, and teams operate inside that venue environment. They can manage schedules, brackets, teams, and game/session context, but they do not automatically control venue infrastructure.

## Core Hierarchy

The current operating hierarchy is:

Organization
-> Venue
-> Venue Command Center
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

The Identity Platform extends the people and access graph:

Organization
-> Venue
-> Tournament / League
-> Team
-> Family
-> Person

The Connected Game Platform centers the game/session graph:

Organization
-> Team / Tournament
-> Session
-> Field
-> Venue

## Entity Responsibilities

Organization:
- Tenant boundary.
- Owns venues, tournaments, sponsors, integrations, and role assignments.
- Supports selected-organization filtering for admin/demo views.

Venue:
- Physical location and operational authority.
- Owns branding, maps, fields, resources, alerts, scoreboards, audio, displays, and public venue pages.

Venue Command Center:
- Venue-wide source of truth for venue status, communications, delay management, weather awareness, incidents, all-clear events, automation targets, digital venue awareness, and decision-support placeholders.
- Should affect public venue page, public field pages, venue display board, Game Day Center, Status Board, Executive Dashboard, and Pilot Launch Dashboard.
- Preserves `/admin/operations-center` for route compatibility and adds `/admin/venue-command-center` as a clearer alias.

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
- Central Connected Game Platform object.
- Connects home team, away team, venue, field, tournament, scoreboard, streaming/media, sponsors, operations status, and timeline.
- Can remain linked to a field for legacy behavior or attach to `play_surface_id` when configured.

## Current Route/Module Audit

Admin operations:
- `/admin/dashboard`
- `/admin/executive`
- `/admin/game-day`
- `/admin/operations-center`
- `/admin/venue-command-center`
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
- `/admin/sessions/[sessionId]/command-center`
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
- `/admin/identity/people`
- `/admin/identity/families`
- `/admin/identity/teams`
- `/admin/identity/roles`
- `/admin/roles`

Public surfaces:
- `/venues/[venueId]`
- `/fields/[fieldId]`
- `/display/venue/[venueId]`
- `/scoreboard/[sessionId]`
- `/scoreboard/field/[fieldId]`

## Venue Command Center Alignment

Venue Command Center is the primary write surface for live venue authority:

- Venue Status: Normal Operations, Weather Delay, Schedule Delay, Closed, Emergency, Maintenance.
- Communications: Weather, Parking, Tournament, General, Emergency, Concessions, Field Change, Lost Child, Medical, Maintenance.
- Delay Management: venue delay, field delay, and future session delay.
- Incident Management: injury, medical emergency, lost child, equipment failure, power outage, network outage, security event.
- Timeline: status changes, announcements, delays, all clear, incidents, and field closures.
- Automation Targets: Public Pages, Venue Displays, Scoreboards, Audio / PA, Push Notifications, Streaming Overlays.
- Digital Venue Awareness: asset and resource issues that affect live decisions.
- Decision Support: rules-based recommendation placeholders only; no real AI automation implied.

Other pages consume Venue Command Center state:

- Public Venue Page
- Public Field Pages
- Venue Display Board
- Game Day Center
- Status Board
- Executive Dashboard
- Pilot Launch Dashboard

## Identity Platform Alignment

Identity Platform is the shared graph for who someone is, what organization they belong to, what venue/team/tournament/family they touch, what role they hold, and what they are allowed to do.

Core identity entities:

- `organizations`
- `people`
- `families`
- `family_members`
- `teams`
- `team_members`
- `role_assignments`
- `user_role_assignments`

Core Identity Platform roles:

- super_admin
- organization_admin
- venue_director
- venue_staff
- tournament_director
- league_director
- coach
- parent
- player
- scorekeeper
- stream_operator
- read_only

Identity Platform supports organization-scoped admin visibility today. Future auth can attach through Supabase Auth, SSO, Okta-style organization controls, parent login, coach login, and staff login without changing the core graph.

## Connected Game Platform Alignment

Connected Game Platform treats `Session` as the central game object connecting:

- Home team
- Away team
- Venue
- Field
- Tournament
- Scoreboard
- Streaming / Media
- Sponsors
- Operations status
- Timeline

The Team app owns team and roster truth. The Venue app owns venue, field, and session operations. Session connects them through lightweight relationships such as `team_session_links`, existing session display fields, public field pages, public scoreboard pages, sponsor placements, operations alerts, and session events.

`/admin/sessions/[sessionId]/command-center` is the admin command surface for one game. It should show Game Summary, Teams, Scoreboard, Streaming / Media, Sponsors, Operations Alerts, Timeline, and Public Links.

No scoreboard hardware integration, streaming API integration, roster sync, or repository merge with DiamondOS/GameDay Team is implied by this foundation.

## Alignment Notes

- The app is still venue-first.
- The Venue Command Center is correctly positioned above field/session workflows.
- Complex venues are now represented without breaking simple field/session behavior.
- Public venue and field pages remain the parent-facing surface.
- The Venue Mode shell is a read-only operational layer for maps, surfaces, schedules, QR entry points, and future provider endpoints.
- Equipment providers such as Meraki and Cisco Spaces remain placeholders only.

## Current Gaps To Track

- Field creation/edit UI does not yet fully manage zones, field layouts, or play surfaces.
- Public field pages accept the existing field route; play-surface query targeting exists as QR URL structure but not yet a full public play-surface-specific view.
- Permissions framework supports scoped roles, including play-surface scope, but enforcement coverage is still being expanded route by route.
- Venue Mode endpoint records exist as a provider-ready shell; there are no real equipment integrations yet.
# Connected Game Platform Note

Phase 1 Sprint 3 defines `Session` as the central connected-game object for Team, Venue, Operations, Streaming, Scoreboards, Sponsors, Media, and future integrations.

See [connected-game-platform.md](./connected-game-platform.md).

# Digital Venue Platform Note

Phase 1 Sprint 4 adds a durable venue asset registry so sports complexes can model physical infrastructure such as scoreboards, displays, audio zones, cameras, network equipment, lighting, parking signs, Wi-Fi, and emergency devices.

See [digital-venue-platform.md](./digital-venue-platform.md).
