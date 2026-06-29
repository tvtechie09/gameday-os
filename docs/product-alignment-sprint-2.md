# GameDay OS Product Alignment Sprint 2

Date: June 29, 2026

## Executive Summary

GameDay OS remains aligned with the long-term venue-first strategy. The product has grown from basic venue/session management into a broad operations platform with public pages, QR entry points, scoreboards, resources, alerts, identity, integrations, Crossroads demo modes, and executive/asset views.

The primary alignment risk is not direction; it is consolidation. Several pages now describe adjacent slices of venue operations, and the navigation exposes many dashboards that should eventually merge into clearer operating surfaces.

Recommended product center of gravity:

- **Operations Center** remains the primary venue communication and delay-management hub.
- **Game Day Center** remains the live event operations view across games.
- **Status Board** remains field-by-field status visibility.
- **Executive Dashboard / GM Mode** remains leadership reporting, health, utilization, maintenance, assets, and revenue opportunities.
- **Field Control Center** remains one-field operations.
- **Public Venue / Public Field / Venue Display / Scoreboard Display** remain outward-facing surfaces.

## Core Hierarchy Validation

Target hierarchy:

```text
GameDay OS
├── Organization
├── Venue
│   ├── Operations Center
│   ├── Game Day Center
│   ├── Executive Dashboard
│   ├── Status Board
│   ├── Venue Display
│   ├── Public Venue Page
│   └── Fields
│       ├── Field Control Center
│       ├── Public Field Page
│       ├── Scoreboard
│       ├── Resources
│       └── Sessions
├── Team
├── Tournament
├── Family
└── Stream
```

Current state:

- **Organization:** Implemented as tenant/scope concept with organization switcher and organization-scoped services.
- **Venue:** Strongest product area. Venues own fields, operations, public pages, alerts, resources, assets, QR, scoreboards, audio, display, and Crossroads Venue Mode.
- **Operations Center:** Present and should remain the official communications source of truth.
- **Game Day Center:** Present as live operational overview.
- **Executive Dashboard:** Present in admin and expanded through Crossroads GM Mode.
- **Status Board:** Present and aligned with field status operations.
- **Venue Display:** Present as public display route.
- **Public Venue Page:** Present.
- **Fields:** Strong support through admin list, edit, QR, control center, public field page, scoreboards, resources, and sessions.
- **Team:** Not yet a first-class implemented module in this repo. Integration blueprint exists.
- **Tournament:** Implemented with admin tournament pages, tournament assignment, and Crossroads Tournament Mode.
- **Family:** Public field/venue pages and Crossroads Family Mode exist. Account/family model is future.
- **Stream:** Streaming/resource/volunteer concepts exist, but Stream is not yet a cohesive top-level module.

## Module Review

### Organizations

Keep:

- `/admin/organizations`
- `/admin/organizations/new`
- `/admin/organizations/[organizationId]/edit`
- organization switcher in admin shell
- organization-scoped service helpers

Merge:

- `/admin/organizations/branding` should eventually become a tab or section inside organization edit.

Rename:

- “Organization Dashboard” in nav may become “Organizations” once executive/venue dashboards mature.

Future:

- Organization ownership, billing placeholder, SSO, API keys, and enterprise admin views.

### Venues And Venue Mode

Keep:

- `/admin/venues`
- `/admin/venues/new`
- `/admin/venues/[venueId]/edit`
- `/admin/venues/[venueId]/mode`
- `/admin/venues/[venueId]/qr`
- `/venues/[venueId]`
- `/display/venue/[venueId]`

Merge:

- Venue QR/report areas should converge into a single “Venue Launch Kit” surface.

Future:

- Full venue hierarchy editing for zones, parent fields, layouts, play surfaces, and POIs in admin UI.

### Fields

Keep:

- `/admin/fields`
- `/admin/fields/new`
- `/admin/fields/[fieldId]/edit`
- `/admin/fields/[fieldId]/control`
- `/admin/fields/[fieldId]/qr`
- `/fields/[fieldId]`

Merge:

- Field QR links, public links, and scoreboard launch links could become tabs inside Field Control Center.

Future:

- Public play-surface-specific page for complex venues.

### Sessions / Games

Keep:

- `/admin/sessions`
- `/admin/sessions/new`
- `/admin/sessions/[sessionId]`
- `/admin/sessions/[sessionId]/edit`
- `/admin/sessions/bulk`

Merge:

- Session dashboard and score control should become a clearer single “Game Control” surface.

Future:

- Team season/session mapping and roster-aware scoreboard.

### Operations Center

Keep:

- `/admin/operations-center`

Strategic role:

- Must remain the primary venue communications hub.
- Owns venue status, operational alerts, weather/delay/emergency messages, all-clear, field delay state, and public impact.

Merge:

- `/admin/weather/operations` should be deprecated or redirected into `/admin/operations-center`.

Future:

- Emergency priority hierarchy enforcement and automation targets for displays, audio, scoreboards, and public pages.

### Game Day Center

Keep:

- `/admin/game-day`

Strategic role:

- Live operating grid across fields, sessions, alerts, volunteers, and resources.

Merge:

- Some overlap with `/admin/dashboard` and `/admin/status-board`; keep differentiated by use case.

Future:

- Tournament and venue filters should become first-class and saved per operator.

### Status Board

Keep:

- `/admin/status-board`

Strategic role:

- Fast field-by-field status view for operators and tablet/laptop operations.

Merge:

- Quick field status controls overlap with Field Control Center. Keep both, but make Status Board bulk/overview oriented.

Future:

- Auto-refresh/realtime updates.

### Executive / GM

Keep:

- `/admin/executive`
- `/demo/crossroads/gm`

Strategic role:

- Admin executive route is product dashboard.
- Crossroads GM Mode is demo/reference implementation for leadership storytelling.

Merge:

- Long term, the reusable GM components should feed `/admin/executive` and Crossroads GM Mode should remain demo-configured.

Future:

- Real analytics service and date filtering.

### Scoreboards

Keep:

- `/admin/scoreboards`
- `/admin/scoreboards/new`
- `/admin/scoreboards/[scoreboardId]/edit`
- `/admin/scoreboards/adapters`
- `/admin/scoreboards/display`
- `/scoreboard/[sessionId]`
- `/scoreboard/field/[fieldId]`

Merge:

- Scoreboard display controls should be reachable from Field Control and Session Dashboard, not a separate destination users must remember.

Future:

- Vendor-neutral adapter interfaces remain correct. Hardware commands are future.

### Resources, Activations, Assets, Maintenance

Keep:

- `/admin/resources`
- `/admin/resources/new`
- `/admin/resources/[resourceId]/edit`
- `/admin/resources/activations`
- `/admin/resources/dashboard`
- Crossroads maintenance and asset register demo components

Merge:

- Resource Inventory, Resource Activation, Asset Register, and Maintenance Requests should eventually be organized under a single “Venue Assets & Resources” area.

Rename:

- “Resources” should be clarified as “Operational Resources” if Asset Register becomes a platform module.

Future:

- CMMS/work-order sync, municipal asset integrations, and asset lifecycle reporting.

### Alerts, Notifications, Weather

Keep:

- `/admin/alerts`
- `/admin/alerts/new`
- `/admin/alerts/[alertId]/edit`
- `/admin/notifications`
- `/admin/weather`
- `/admin/weather/new`
- `/admin/weather/[weatherProfileId]/edit`

Merge:

- `/admin/weather/operations` should merge into Operations Center.
- Alert creation templates should be surfaced from Operations Center.

Future:

- Real weather provider integration and emergency hierarchy enforcement.

### Sponsors / Engagement

Keep:

- `/admin/sponsors`
- `/admin/sponsors/new`
- `/admin/sponsors/[sponsorId]`
- `/admin/sponsors/[sponsorId]/edit`

Future:

- Sponsorship management, campaign inventory, public display placements, and reporting.

### Integrations / Sync

Keep:

- `/admin/integrations`
- `/admin/integrations/new`
- `/admin/integrations/health`
- `/admin/sync`
- `/admin/sync/jobs`
- `/admin/sync/review`

Merge:

- Integration Health and Sync Engine should be visually connected as “External Data Sources.”

Future:

- Credentials, API tokens, API actor identity, webhooks, and replayable sync jobs.

### Identity / Roles

Keep:

- `/admin/identity`
- `/admin/roles`
- `canUser()`
- `requirePermission()`
- audit logging helpers

Current alignment:

- Scoped permission model aligns with long-term plan.
- Backend enforcement exists for key venue/field/session/tournament mutations, but coverage is not complete.

Future:

- Apply server-side checks to all sensitive mutations and add route-level test coverage.

### Crossroads Experience Center

Keep:

- `/venue/crossroads`
- `/venue/crossroads/family`
- `/venue/crossroads/tournament`
- `/venue/crossroads/operations`
- `/demo/crossroads/presentation`
- `/demo/crossroads/gm`
- QR-style routes for parking, field, surface, concession, and maintenance intake

Current validation:

- 9 parent fields exist.
- 22 youth play-surface configurations exist.
- A/B/C subfields exist where expected.
- Venue map, POIs, operations workflows, tournament mode, family mode, executive demo, maintenance, and asset register are present.

Keep as demo/reference implementation, not production hardcoding.

## Duplicate / Overlap Findings

Merge candidates:

- `/admin/dashboard`, `/admin/game-day`, `/admin/status-board`, `/admin/operations-center`, and `/admin/executive` are all valid but need clearer jobs-to-be-done.
- `/admin/weather/operations` overlaps with `/admin/operations-center`.
- `/admin/resources/dashboard` overlaps with Game Day Center and future Asset Register.
- `/admin/integrations/health` overlaps with `/admin/sync`.
- `/admin/roles` overlaps partially with `/admin/identity`.
- `/admin/pilot-launch`, `/admin/pilot-prep`, `/admin/pilot-script`, `/admin/showcase`, and `/admin/demo` are all demo/pilot tools and should be grouped visually.

Unused or low-confidence routes:

- `/admin/organization/route.ts` is an API-like route under an admin path and should be reviewed for naming/placement.
- `/admin/weather/operations` should likely redirect to `/admin/operations-center`.
- `/admin/demo` may be redundant with Pilot Launch, Showcase, and Crossroads demo routes.

Naming inconsistencies:

- “Operations Dashboard” and “Venue Operations Center” are easy to confuse.
- “Executive Dashboard” and “GM Mode” are related but currently split between admin product and Crossroads demo.
- “Resources,” “Resource Activations,” “Asset Register,” and “Equipment Endpoints” need a shared language model.
- “Sessions” should increasingly be presented as “Games” in operator-facing contexts, while Session remains the technical model.

UI inconsistencies:

- Admin pages use shared shell, but Crossroads demo pages intentionally use separate public/demo shell.
- Several admin pages have different card density and action button styles.
- Some dashboards are operationally dense, while others still read as prototype/report pages.

## Keep / Merge / Remove / Rename / Future

Keep:

- Operations Center as communication hub.
- Game Day Center as live game operations.
- Status Board as field status grid.
- Field Control Center as one-field command screen.
- Public venue and field pages as family-facing surfaces.
- Scoreboard displays as public/OBS display surfaces.
- Crossroads as flagship reference implementation.
- Scoped GameDay Identity foundation.

Merge:

- Weather Operations into Operations Center.
- Integration Health and Sync Engine into one External Data Sources workflow.
- Resource Dashboard, Resource Activations, Asset Register, and Maintenance into Venue Assets & Resources.
- Organization Branding into Organization edit.
- Pilot tools into a single Pilot / Demo Tools group.

Remove:

- Do not remove routes yet. Mark low-confidence routes for deprecation after pilot feedback.
- Avoid deleting old pilot/demo pages until Crossroads GM demo is stable.

Rename:

- “Operations Dashboard” -> “Venue Activity Dashboard” or merge into Game Day Center.
- “Sessions” in user-facing copy -> “Games” where appropriate.
- “Resources” -> “Operational Resources” once Asset Register exists as a product module.
- “Venue Operations Mode” -> “Venue Operations” for plain language consistency.

Future:

- Team module.
- Family account model.
- Stream module.
- Real analytics service.
- Full asset/CMMS integration.
- Hardware adapter runtime.
- Enterprise org admin, SSO, and API actor model.

## Roadmap

### Phase 1: Pilot

- Stabilize Crossroads demo and GM Mode.
- Keep mock/demo data clearly labeled.
- Harden Operations Center all-clear and alert lifecycle.
- Keep public venue/field pages clean for QR testing.
- Add missing permission checks to high-risk mutations.
- Consolidate pilot links and demo tools.

### Phase 2: Venue

- Build full Venue Assets & Resources area.
- Promote maintenance and asset register from demo-ready to platform module.
- Add venue hierarchy admin UI for zones, layouts, play surfaces, POIs.
- Connect executive dashboard to real aggregate services.
- Expand public venue page for maps, schedules, alerts, sponsors, and resources.

### Phase 3: Automation

- Sync Engine approval workflows for external data sources.
- Operations automation targets for public pages, displays, scoreboards, and audio placeholders.
- Real weather provider integration behind approval.
- Notification routing framework beyond internal records.

### Phase 4: Hardware

- Scoreboard adapter runtime.
- Audio/PA integration runtime.
- Digital signage runtime.
- Equipment health monitoring.
- Camera/security awareness integrations without exposing streams.

### Phase 5: Enterprise

- SSO and organization membership lifecycle.
- API tokens mapped to service actors.
- Enterprise audit/compliance review.
- Municipal asset/CMMS integrations.
- Billing/contract/reporting modules.
- Multi-venue and multi-organization portfolio dashboards.

## Organization Filtering Audit

Current strengths:

- Core Supabase services for venues, fields, sessions, tournaments, sponsors, alerts, resources, audio profiles, external sources, and roles use organization scope helpers.
- Admin shell exposes organization switching and demo client mode.
- Organization-scoped services generally write `organization_id` on create/update paths.

Current gaps:

- Crossroads demo routes are local demo data and intentionally not organization-filtered.
- Some newer demo/reporting components are configuration-driven rather than tenant-scoped.
- Route-level enforcement is uneven; service-layer filtering is stronger than page-level guarantees.

Recommendation:

- Add a standard “organization scope required?” checklist to every new admin page.
- Add tests around core pages to confirm selected organization affects service calls.

## Role / Permission Alignment

Current strengths:

- GameDay Identity uses scoped assignments, role permissions, temporary access, `canUser()`, `requirePermission()`, and audit logs.
- Venue, field, session score, tournament, and identity service mutations already use permission checks in important paths.
- Crossroads GM Mode explicitly models visibility for venue GM, venue admin, maintenance manager, maintenance staff, asset manager, executive viewer, and hides parent users.

Current gaps:

- Not every sensitive mutation across all modules has backend permission enforcement yet.
- Frontend visibility exists in some demo contexts but should not be treated as enforcement.
- API routes need a systematic permission audit.

Recommendation:

- Treat backend permission coverage as Phase 1/2 platform hardening.

## Operations Center Validation

Operations Center remains the primary venue communication hub and should continue to own:

- venue status
- delay state
- weather/closure/emergency alerts
- all-clear
- field delay resets
- public impact preview
- announcement workflow
- recent operations timeline

Do not move these responsibilities to Game Day Center, Tournament Mode, Weather Operations, or Status Board. Those pages may display or act on operations state, but Operations Center should remain the source of truth.

