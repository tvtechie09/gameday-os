# GameDay Identity Implementation Plan

GameDay Identity is the long-term identity and access-control foundation for GameDay OS. Permissions are scoped, venue infrastructure control remains separate from tournament operations, and backend enforcement is mandatory.

## Phase 1 — Identity Core

Status: partially complete.

Database:

- `users`
- `organization_memberships`
- `roles`
- `permissions`
- `role_permissions`
- `user_role_assignments`
- `audit_logs`

Service/API:

- `canUser()`
- `requirePermission()`
- `assertActorUserId()`
- `logAudit()`
- scoped role assignment helpers
- active assignment checks using `starts_at`, `ends_at`, and assignment lifecycle state

UI:

- `/admin/identity` read-only Identity Center

Tests:

- venue director can manage assigned venue scope
- tournament director cannot control venue infrastructure
- scorekeeper can update assigned game only
- expired/revoked access fails closed

Deferred:

- trusted Supabase Auth/SSO actor resolution
- RLS policies for authenticated client reads

## Phase 2 — Access Workflows

Status: implemented in this sprint at the service/schema layer.

Database:

- `identity_invites`
- `identity_access_requests`
- `identity_approvals`
- assignment lifecycle fields on `user_role_assignments`

Lifecycle values:

- `pending`
- `approved`
- `denied`
- `expired`
- `revoked`

Tracked actors:

- `invited_by`
- `requested_by`
- `approved_by`
- `revoked_by`

Service/API:

- create scoped invite
- approve/deny invite
- revoke invite
- create access request
- approve/deny access request
- revoke access request
- revoke role assignment
- write audit logs for invite/request/approval/revoke actions

UI:

- `/admin/identity` shows invites, requests, approvals, and temporary grants
- mutation UI is deferred until trusted actor context exists

Tests:

- coach invites parent to team/family
- coach assigns scorekeeper for one game with `ends_at`
- tournament director requests venue device access
- venue director approves or denies tournament access
- venue staff grants temporary press box/livestream access
- parent requests family access
- third-party developer requests integration access
- sponsor manager requests sponsor campaign access

Deferred:

- email delivery
- accept-invite flow
- authenticated approval buttons
- request forms for public/family flows

## Phase 3 — Identity Admin UI

Database:

- no new tables required

Service/API:

- server actions wired to trusted actor resolution
- role assignment create/revoke endpoints
- invite create/revoke endpoints
- request approve/deny/revoke endpoints
- audit log listing with filters

UI:

- view users
- view role assignments
- create scoped role assignment
- set `starts_at` and `ends_at`
- revoke assignment
- view invites
- view access requests
- approve/deny requests
- view audit logs

Tests:

- UI never mutates without server-side permission
- denied user cannot create/revoke grants
- successful grant writes audit log
- revoked grant immediately fails `canUser()`

Deferred:

- bulk role management
- reusable identity picker

## Phase 4 — Organization Hierarchy

Database:

- extend roles with `organization_owner`, `organization_admin`, `organization_staff`
- ensure owned resources have `organization_id`

Permissions:

- `organization.manage`
- `organization.staff.manage`
- `organization.billing.view`
- `organization.integration.manage`
- `organization.audit.review`

Service/API:

- organization-scoped permission checks
- organization membership management
- organization audit review

UI:

- organization staff page
- organization role assignment workflows

Deferred:

- billing integration

## Phase 5 — Device Hierarchy

Database:

- formal device table or extension of resources
- device assignment table if resource model is insufficient

Device types:

- `scoreboard`
- `camera`
- `audio_zone`
- `tv_display`
- `kiosk`
- `radar_display`
- `lighting`
- `future_device`

Permissions:

- `device.manage`
- `device.control`
- `device.assign`
- `device.status.view`
- `device.emergency.override`

Rules:

- venue owns infrastructure
- tournament requests temporary device access
- coach/team can only control approved game-level devices
- scorekeeper cannot control unrelated devices
- livestream operator controls only approved stream/camera resources

## Phase 6 — Emergency Hierarchy

Priority:

1. Platform emergency
2. Venue emergency
3. Venue operations
4. Tournament operations
5. League operations
6. Team operations
7. Family/fan preferences

Permissions:

- `emergency.alert.send`
- `emergency.alert.clear`
- `emergency.override`
- `emergency.audit.review`

Rules:

- server-side permission required
- audit log required
- emergency override beats lower-priority controls
- affected scopes must render emergency state publicly

## Phase 7 — Family / Follower Model

Roles:

- guardian
- grandparent
- relative
- fan/follower
- scout/recruiter placeholder
- media follower placeholder

Rules:

- parent/guardian can manage child access
- grandparent/relative can view approved content only
- fan can follow public teams/games only
- scout/recruiter requires privacy approval

## Phase 8 — Sponsor / Media Access

Roles:

- `sponsor_manager`
- `sponsor_rep`
- `advertiser`
- `media_operator`

Permissions:

- `sponsor.asset.upload`
- `sponsor.campaign.manage`
- `sponsor.report.view`
- `media.manage`
- `media.publish`
- `media.asset.manage`

Rules:

- sponsor cannot control operations
- sponsor manages approved assets/campaigns only
- media operator can publish approved content
- media operator cannot alter scores, rosters, or venue settings

## Phase 9 — Integration / Third-Party Developer Access

Use cases:

- GameChanger
- TeamSnap
- SportsEngine
- SprocketSports
- HomeTeams Online
- Daktronics
- MuscoVision
- LeagueApps
- PlayMetrics

Rules:

- third-party access must be scoped
- API tokens map to service actors or trusted users
- integrations use `canUser()` / `requirePermission()`
- integration writes create audit logs

## Manual Testing Checklist

- Seed identity users and scoped roles with `supabase/identity-test-seed.sql`.
- Confirm active assignment returns true through `canUser()`.
- Confirm expired assignment returns false.
- Confirm revoked assignment returns false.
- Confirm invite creation requires `identity.role.manage`.
- Confirm access request approval requires `identity.role.manage`.
- Confirm approval creates a role assignment when a user and role are present.
- Confirm deny/revoke actions do not create active permissions.
- Confirm every successful invite/request/approval/revoke writes an audit log.
- Confirm tournament roles do not grant venue device permissions.
- Confirm venue emergency roles override tournament/team operations.
