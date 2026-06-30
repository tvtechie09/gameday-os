# GameDay Identity Platform

Date: June 30, 2026

## Purpose

GameDay Identity is the shared identity graph for GameDay OS. It connects organizations, venues, tournaments, leagues, teams, families, and people without requiring full authentication yet.

This is not a login system. It is the long-term identity foundation that future auth, SSO, invitations, team accounts, family access, scorekeeper QR access, and third-party integrations can attach to.

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

## Current Identity Audit

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

New foundation models:

- `people`
- `families`
- `family_members`
- `teams`
- `team_members`
- `team_session_links`

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

Canonical roles for this sprint:

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

Existing broader GameDay Identity roles may still exist, such as tournament staff, team manager, livestream operator, sponsor/media roles, and third-party developer. They remain compatible with the longer-term model, but the Sprint 2 admin matrix focuses on the requested core role set.

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
- operations center communications

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

These pages provide visibility only. They do not implement authentication or full CRUD workflows yet.

## Deferred

- Supabase Auth connection
- SSO providers
- route-level auth enforcement
- public family pages
- Team roster sync
- Team/Venue repo merge
- Okta/Auth0 integration
- full invitation UI
- API tokens and third-party developer flows

