# GameDay Identity

GameDay Identity is the long-term identity and access-control foundation for GameDay OS.

The core rule is scoped permission assignment: a user does not simply become an admin everywhere. A user receives a role inside a specific scope, and that scoped role grants specific permissions.

Examples:

- Kyle can be `venue_director` for Venue A.
- Kyle can be `parent` for Player B.
- Kyle can be `scorekeeper` for Game C.
- Kyle can be `tournament_director` for Tournament D.
- A vendor can be `third_party_developer` for Integration E.

Frontend screens may hide buttons for convenience, but every sensitive backend action must enforce permissions server-side and write an audit log after a successful mutation.

## Supported Entities

GameDay Identity is designed to support these long-term entities without redesign:

- Platform
- Organization
- Venue
- Field
- Tournament
- League
- Team
- Game/session
- Player
- Family
- Device
- Integration

## Scope Model

`user_role_assignments` stores the scope:

- `user_id`: the authenticated user receiving access.
- `role_id`: the role being granted.
- `scope_type`: the boundary where the role applies.
- `scope_id`: the exact organization, venue, field, play surface, tournament, league, team, game/session, player, family, device, or integration id.
- `starts_at` / `ends_at`: optional access window for temporary game-day roles.
- `granted_by`: the user who granted the assignment.

Supported scope types:

- `platform`
- `organization`
- `venue`
- `field`
- `play_surface`
- `tournament`
- `league`
- `team`
- `player`
- `family`
- `game`
- `session`
- `device`
- `integration`

Temporary game-day roles are first-class. A scorekeeper or livestream operator can be assigned to one game/session and automatically lose access when `ends_at` passes.

## Layer 1: Identity Core

Core tables:

- `users`: GameDay app user profile records mapped to future Supabase Auth, SSO, API, or service identities.
- `organizations`: existing tenant boundary for GameDay OS.
- `organization_memberships`: user-to-organization membership state.
- `roles`: named role definitions.
- `permissions`: named permission definitions.
- `role_permissions`: role-to-permission mapping.
- `user_role_assignments`: scoped grants tying one user to one role in one scope.

This layer answers: who is the actor, what organizations do they belong to, what roles exist, what permissions exist, and what role does this actor hold in this exact scope?

## Layer 2: Enforcement

Enforcement is server-side only.

- `canUser()` checks active scoped assignments, role mappings, and the requested permission.
- `requirePermission()` fails with `403` when the actor does not have permission.
- Protected service functions call `assertActorUserId()` and fail closed without a trusted actor.
- RLS is enabled on identity tables, with no broad public policies.
- `audit_logs` record permission-sensitive mutations after success.

This layer answers: can this actor perform this action on this resource right now?

## Layer 3: Operations

Operations tables and workflows sit above Core and Enforcement:

- `identity_invites`: scoped invitations to join with a role.
- `identity_access_requests`: requested access that must be reviewed.
- temporary access through `starts_at` and `ends_at` on `user_role_assignments`.
- role management UI that must use trusted server-side actor context.
- approval workflows that call Enforcement before granting or denying access.

This layer answers: how do admins safely invite, approve, grant, expire, and review access over time?

## Role Model

Default roles:

- `platform_admin`
- `venue_director`
- `venue_staff`
- `tournament_director`
- `tournament_staff`
- `league_director`
- `league_staff`
- `coach`
- `team_manager`
- `parent`
- `player`
- `fan`
- `scorekeeper`
- `livestream_operator`
- `sponsor_manager`
- `media_operator`
- `emergency_coordinator`
- `audit_reviewer`
- `third_party_developer`

One user can hold many roles across many scopes. For example, a user may be a venue director for one venue, a tournament director for one tournament, and a parent inside one family account.

## Venue vs Tournament Control

Venue control and tournament control are intentionally separate.

Venue roles control venue infrastructure and operations:

- Venue settings
- Fields
- Venue staff
- Devices
- Venue alerts
- Emergency overrides

Tournament roles control tournament operations:

- Tournament setup
- Tournament schedule
- Brackets
- Tournament game delays
- Score approval

A `tournament_director` does not automatically control venue devices, field infrastructure, or emergency venue overrides. If that person also needs venue control, they need a separate venue-scoped role.

## Permission Families

Venue:

- `venue.manage`
- `venue.staff.manage`
- `venue.field.manage`
- `venue.device.control`
- `venue.alert.send`
- `venue.emergency.override`

Device:

- `device.manage`
- `device.control`

Tournament:

- `tournament.manage`
- `tournament.schedule.manage`
- `tournament.bracket.manage`
- `tournament.game.delay`
- `tournament.score.approve`

League:

- `league.manage`
- `league.schedule.manage`
- `league.team.manage`

Team:

- `team.manage`
- `team.roster.manage`
- `team.invite.manage`
- `team.lineup.manage`

Game:

- `game.score.update`
- `game.stream.control`
- `game.music.control`
- `game.status.update`

Family and player:

- `family.child.view`
- `family.child.manage`
- `player.profile.view`
- `player.profile.manage`

Fan:

- `fan.follow`
- `fan.stream.view`

Sponsor and media:

- `sponsor.manage`
- `media.manage`
- `media.publish`

Identity, integration, and audit:

- `identity.role.manage`
- `integration.api.read`
- `integration.api.write`
- `integration.webhook.manage`
- `audit.review`

## Default Mapping Rules

- `venue_director`: venue operations, fields, devices, staff, sponsors, media, emergency override, and audit review for the venue scope.
- `venue_staff`: limited field, alert, device, and game-status operations.
- `tournament_director`: tournament setup, schedule, brackets, game delays, score approval, and scoped role management for tournament operations.
- `tournament_staff`: brackets, delays, scores, and game updates.
- `coach`: team, roster, lineup, invitations, assigned game controls, and scoped team role management.
- `team_manager`: team, roster, and family invitations.
- `parent`: child and team-family visibility only.
- `fan`: follow and view public streams/content.
- `scorekeeper`: score and status update for assigned game/session only.
- `livestream_operator`: stream control and media publishing for assigned game/session only.
- `sponsor_manager`: sponsor records, sponsor assignments, and sponsor reporting for the approved scope.
- `media_operator`: stream support, media operations, and public display content for the approved scope.
- `emergency_coordinator`: emergency alerts, emergency override, and device control for the approved venue scope.
- `audit_reviewer`: audit/compliance review for the approved scope.
- `third_party_developer`: integration permissions only when scoped to an approved organization or integration.

## Enforcement Helpers

Server-side helpers live in `src/lib/services/identity.ts`.

- `canUser(userId, permissionKey, scopeType, scopeId)`: returns `true` or `false`.
- `requirePermission(userId, permissionKey, scopeType, scopeId)`: throws `PermissionDeniedError` with status `403`.
- `assertActorUserId(actorUserId)`: fails closed when no authenticated actor is present.
- `logAudit({...})`: writes an immutable audit event for permission-sensitive actions.

Mutation services must:

1. Resolve a real authenticated actor id from the trusted server-side auth context.
2. Call `requirePermission()` before mutation.
3. Mutate data.
4. Call `logAudit()` or `safelyLogAudit()` after success.

If no trusted actor is present, the action must fail closed.

## API and Integration Readiness

The schema supports future SSO, API keys, and third-party integrations by keeping authorization data in database tables rather than frontend state.

Future integration work should map incoming identities to a trusted `user_id` or service actor, then call the same `canUser()` / `requirePermission()` helpers with a concrete scope.

Do not trust user-editable metadata, client-provided display names, or frontend-hidden controls for authorization decisions.

## Testing Checklist

Use `supabase/identity-test-seed.sql` for repeatable seed assignments, then replace fake ids with real Supabase Auth user ids as authentication is connected.

- Venue director can manage the assigned venue.
- Tournament director cannot control venue devices without a separate venue role.
- Scorekeeper can update the assigned game/session only.
- Parent cannot update score.
- Livestream operator cannot update score.
- Fan can follow/view public content only.
- Expired scorekeeper role no longer grants score update permission.
- Emergency coordinator can send emergency operations alerts inside the venue scope.
- Third-party developer can use integration permissions only inside the approved organization/integration scope.
- Audit reviewer can inspect audit records but cannot mutate venue, game, or tournament state.

## Phased Roadmap

### Phase 1 — Identity Core

Status: started.

Includes roles, permissions, role-permission mappings, scoped user role assignments, temporary access windows, `canUser()`, `requirePermission()`, audit logs, seed data, and this documentation.

### Phase 2 — Access Workflows

Status: underway.

Includes scoped invites, access requests, approval records, pending/approved/denied/expired/revoked lifecycle states, invited/requested/approved/revoked actor tracking, approval notes, temporary access support, server-side permission checks, and audit logs for every successful workflow mutation.

Primary use cases:

- Coach invites parent to team/family.
- Coach assigns scorekeeper for one game.
- Tournament Director requests venue device access.
- Venue Director approves or denies tournament access.
- Venue Staff grants temporary press box/livestream access.
- Parent requests child/family access.
- Third-party developer requests integration access.
- Sponsor manager requests sponsor campaign access.

### Phase 3 — Identity Admin UI

Add real UI for viewing users, role assignments, invites, access requests, approvals, audit logs, creating scoped assignments, setting `starts_at` / `ends_at`, revoking assignments, and approving or denying requests.

UI must never replace backend enforcement. Every mutation must call server-side permission checks.

### Phase 4 — Organization Hierarchy

Add `organization_owner`, `organization_admin`, `organization_staff`, organization-scoped permissions, and organization ownership links for venues, teams, tournaments, leagues, sponsors, and integrations.

Permissions:

- `organization.manage`
- `organization.staff.manage`
- `organization.billing.view`
- `organization.integration.manage`
- `organization.audit.review`

### Phase 5 — Device Hierarchy

Formalize devices as permissioned resources.

Device types:

- `scoreboard`
- `camera`
- `audio_zone`
- `tv_display`
- `kiosk`
- `radar_display`
- `lighting`
- `future_device`

Venue owns infrastructure. Tournament and team access to devices must be requested, approved, scoped, and time-bound.

Permissions:

- `device.manage`
- `device.control`
- `device.assign`
- `device.status.view`
- `device.emergency.override`

### Phase 6 — Emergency Hierarchy

Emergency priority order:

1. Platform emergency
2. Venue emergency
3. Venue operations
4. Tournament operations
5. League operations
6. Team operations
7. Family/fan preferences

Emergency use cases include lightning delay, shelter in place, field evacuation, medical emergency, missing child, facility closure, and all-clear.

Permissions:

- `emergency.alert.send`
- `emergency.alert.clear`
- `emergency.override`
- `emergency.audit.review`

Emergency actions must require server-side permission, create audit logs, override lower-priority operational controls, and be visible to affected scopes.

### Phase 7 — Family / Follower Model

Extend family access beyond parent/child to guardians, grandparents, relatives, fans/followers, scout/recruiter placeholders, and media follower placeholders.

Parents/guardians manage child access. Relatives/fans can view approved content. Scout/recruiter access requires future approval and privacy controls.

### Phase 8 — Sponsor / Media Access

Support revenue and media workflows with `sponsor_manager`, `sponsor_rep`, `advertiser`, and `media_operator`.

Permissions:

- `sponsor.asset.upload`
- `sponsor.campaign.manage`
- `sponsor.report.view`
- `media.manage`
- `media.publish`
- `media.asset.manage`

Sponsors cannot control operations. Media operators can publish approved content but cannot alter scores, rosters, or venue settings.

### Phase 9 — Integration / Third-Party Developer Access

Support integrations such as GameChanger, TeamSnap, SportsEngine, SprocketSports, HomeTeams Online, Daktronics, MuscoVision, LeagueApps, and PlayMetrics.

Third-party access must be scoped. API tokens must map to service actors or trusted user identities. Integration writes must use `canUser()` / `requirePermission()` and audit every successful mutation.
