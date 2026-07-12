# GameDay Identity Platform

Date: June 30, 2026

## Purpose

GameDay OS Identity Platform is the shared identity graph for GameDay OS. It connects organizations, venues, tournaments, leagues, teams, families, and people without requiring full authentication yet.

This is not a login system yet. It is the long-term identity foundation that future Supabase Auth, SSO, invitations, team accounts, family access, scorekeeper QR access, staff access, and third-party integrations can attach to.

## Core Hierarchy

```text
Organization
-> Venue
-> Tournament / League
-> Team
-> Family
-> Person
```

The hierarchy is intentionally graph-friendly. A person can be a parent in one family, a coach on one team, a scorekeeper for one session, and venue staff for one venue.

Identity Platform answers five product questions:

- Who someone is.
- What organization they belong to.
- What venue, team, tournament, league, family, or session they are connected to.
- What scoped role they have.
- What they are allowed to do.

## Current Identity Platform Entities

Existing identity-related models:

- `organizations`: tenant/root ownership layer.
- `users`: auth-adjacent internal user record, not full auth implementation.
- `organization_memberships`: connects users to organizations.
- `roles`: canonical role definitions.
- `permissions`: canonical permission definitions.
- `role_permissions`: role-to-permission map.
- `user_role_assignments`: long-term scoped assignment model with `scope_type`, `scope_id`, `starts_at`, `ends_at`, and lifecycle status.
- `identity_invites`: access invitation workflow.
- `identity_access_requests`: access request workflow.
- `identity_approvals`: approval/revocation tracking.
- `audit_logs`: sensitive action history.
- `role_assignments`: older/simple admin visibility table, now aligned with broader role names and scope columns.
- `volunteer_roles`: game-day volunteer/operations role requests, separate from durable identity roles.
- organization filtering: implemented in services through organization scope helpers.

Core identity graph models:

- `people`
- `families`
- `family_members`
- `teams`
- `team_members`
- `team_session_links`

Every identity graph object supports `organization_id` where appropriate. Admin Identity Platform pages respect the current organization selection through the same organization scope used by venues, fields, sessions, sponsors, and resources.

## Model Responsibilities

### People

`people` represents a real-world person in the GameDay graph.

Examples:

- parent
- guardian
- player
- coach
- venue staff member
- fan/follower placeholder

A person may optionally link to a `users` row later when authentication exists.

### Families

`families` groups related people.

`family_members` defines the relationship:

- parent
- guardian
- player
- grandparent
- relative
- fan
- other

This keeps parent/guardian access separate from venue staff and tournament access.

### Teams

`teams` represents the shared Team/Venue bridge.

`team_members` connects people to teams as:

- coach
- assistant coach
- team manager
- player
- scorekeeper
- stream operator
- other

### Team Session Links

`team_session_links` is a placeholder relationship between a team and a GameDay Venue session.

Supported relationship types:

- home
- away
- participant

This enables future Team season to Venue session mapping without syncing full rosters yet.

## Role Model

Canonical Identity Platform roles:

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

Existing broader GameDay Identity roles may still exist, such as tournament staff, team manager, livestream operator, sponsor/media roles, and third-party developer. They remain compatible with the longer-term model, but the current admin matrix focuses on the core role set above.

## Scope Model

Permissions must be scoped. They are not global by default.

Example assignments:

- Kyle is `venue_director` scoped to Venue A.
- A coach is `coach` scoped to Team B.
- A parent is `parent` scoped to Family C.
- A scorekeeper is `scorekeeper` scoped to Session D with an expiration time.
- A tournament director is `tournament_director` scoped to Tournament E.

## Venue vs Tournament Separation

Venue controls:

- venue status
- field status
- weather/delay/emergency alerts
- resources
- scoreboards/audio/displays
- Venue Command Center communications

Tournament controls:

- schedule
- brackets/session management
- field assignment requests
- delay impacts
- tournament announcements

Tournament access should never automatically control venue infrastructure.

## Admin Visibility

Admin routes:

- `/admin/identity`
- `/admin/identity/people`
- `/admin/identity/families`
- `/admin/identity/teams`
- `/admin/identity/roles`

These pages provide visibility only. They do not implement full authentication or CRUD workflows yet.

Dashboard checks include:

- People count
- Families count
- Teams count
- Role assignment count
- Missing role assignments
- Duplicate people warning placeholder
- Unlinked teams warning placeholder

## Future Authentication Placeholders

Identity Platform is designed to accept future auth providers without redesign:

- Supabase Auth
- SSO
- Okta-style organization control
- Parent login
- Coach login
- Staff login

Frontend visibility can hide buttons, but backend enforcement must use scoped server-side permission checks before sensitive writes.

## Deferred

- Supabase Auth connection
- SSO providers
- Okta-style organization control
- route-level auth enforcement
- public family pages
- parent login
- coach login
- staff login
- Team roster sync
- Team/Venue repo merge
- Okta/Auth0 integration
- full invitation UI
- API tokens and third-party developer flows
