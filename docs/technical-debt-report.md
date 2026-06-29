# GameDay OS Technical Debt Report

Date: June 29, 2026

## Highest Priority

### Dashboard Sprawl

Issue:

The app now has multiple operational dashboards:

- `/admin/dashboard`
- `/admin/executive`
- `/admin/game-day`
- `/admin/status-board`
- `/admin/operations-center`
- `/admin/resources/dashboard`
- `/admin/integrations/health`
- `/demo/crossroads/gm`

Risk:

Operators may not know which surface owns which workflow.

Recommendation:

Define canonical jobs:

- Operations Center: communications, delays, alerts, all-clear.
- Game Day Center: live games across fields.
- Status Board: field statuses and quick updates.
- Executive Dashboard / GM Mode: leadership summary.
- Resource Dashboard: merge into future Venue Assets & Resources.

### Permission Coverage Is Partial

Issue:

GameDay Identity exists and key services use `requirePermission()`, but enforcement is not yet systematic across every mutation and API route.

Risk:

Frontend visibility may be mistaken for authorization.

Recommendation:

Create a route/service permission matrix and mark every mutation as:

- protected
- read-only
- public insert
- needs scope decision
- demo-only

### Organization Filtering Is Strong In Services, Uneven In Pages

Issue:

Core services use organization scope helpers, but newer demo/reporting pages and local Crossroads routes do not use organization scope because they are configuration-driven.

Risk:

Future real-data versions of demo/report pages may accidentally bypass tenant scoping.

Recommendation:

Every admin page should declare:

- data source: Supabase or local demo config
- organization scope behavior
- public/private/admin visibility

### Supabase Schema Drift Risk

Issue:

The app has grown many tables, migrations, and schema audit helpers.

Risk:

Pages may fail when a Supabase project is missing a newer table or column.

Recommendation:

Keep Schema Audit updated and promote a single catch-up migration workflow for demo/pilot environments.

## Medium Priority

### Naming Drift

Examples:

- Sessions vs Games
- Resources vs Assets vs Equipment
- Executive Dashboard vs GM Mode
- Operations Dashboard vs Venue Operations Center

Recommendation:

Adopt product vocabulary:

- “Game” for operator-facing session copy.
- “Session” for technical data model.
- “Operational Resources” for temporary/claimable resources.
- “Assets” for durable venue infrastructure.
- “Operations Center” for official venue communications.

### Demo And Product Code Boundary

Issue:

Crossroads is intentionally a reference implementation, but demo config and reusable platform models now sit close together.

Recommendation:

Keep reusable models under `src/lib` and generic components under `src/components`.
Keep venue-specific data under `src/lib/demo`.

### Admin Navigation Scale

Issue:

Admin navigation is large and contains overlapping dashboards/tools.

Recommendation:

Next nav pass should group by operator intent:

- Today
- Venue Setup
- Games
- Operations
- Assets & Resources
- Engagement
- Integrations
- Identity
- Demo/Pilot Tools

### Local Demo State

Issue:

Presentation Mode, Maintenance Requests, and GM Mode use local/demo state.

Risk:

Demo users may expect persistence.

Recommendation:

Keep labels explicit. Only persist once platform data model is approved.

## Lower Priority

### Repeated Card/Table Patterns

Issue:

Many pages implement cards, filters, empty states, and action buttons locally.

Recommendation:

Extract shared page header, metric card, filter bar, status badge, and action button components after product surfaces stabilize.

### Browser Test Coverage

Issue:

Node tests cover data/model logic, but UI behavior is mostly smoke-tested manually.

Recommendation:

Add Playwright or equivalent route smoke tests for demo-critical flows once route set stabilizes.

### Public Route Naming

Issue:

Crossroads demo routes use `/venue/crossroads`, while production public venues use `/venues/[venueId]`.

Recommendation:

Keep `/venue/crossroads` for demo storytelling, but do not expand this convention to production.

## Technical Debt Backlog

1. Create permission matrix for all mutation routes.
2. Merge Weather Operations into Operations Center.
3. Design Venue Assets & Resources module boundary.
4. Add organization-filter contract comments/tests to admin pages.
5. Consolidate pilot/demo tools.
6. Update Schema Audit expected tables/columns after each migration.
7. Introduce shared admin UI primitives.
8. Add route smoke tests for Crossroads demo, GM Mode, public venue, public field, and operations pages.
9. Move executive/GM reusable components toward production `/admin/executive`.
10. Clarify session/game vocabulary in UI copy.

