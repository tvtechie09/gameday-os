# GameDay OS Permissions Matrix

Date: June 30, 2026

## Principle

Frontend visibility is not security. Future enforcement must happen server-side through scoped permission checks.

The matrix below documents expected access for the Phase 1 Sprint 2 identity foundation. Route-level enforcement is not enabled yet.

## Access Levels

- **manage:** Can configure and administer the scope.
- **operate:** Can perform day-to-day operations in the scope.
- **assigned:** Can act only when explicitly assigned to a game/team/family/session.
- **view:** Can view approved records.
- **none:** No expected access.

## Role Matrix

| Role | Organization | Venue | Tournament | League | Team | Family | Game | Stream | Read |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| super_admin | manage | manage | manage | manage | manage | manage | manage | manage | view |
| organization_admin | manage | operate | operate | operate | operate | view | operate | operate | view |
| venue_director | none | manage | view | none | none | none | operate | operate | view |
| venue_staff | none | operate | none | none | none | none | operate | operate | view |
| tournament_director | none | view | manage | none | view | none | operate | none | view |
| league_director | none | none | view | manage | operate | none | operate | none | view |
| coach | none | none | none | none | manage | view | assigned | none | view |
| parent | none | none | none | none | view | manage | none | none | view |
| player | none | none | none | none | view | view | none | none | view |
| scorekeeper | none | none | none | none | none | none | assigned | none | view |
| stream_operator | none | none | none | none | none | none | assigned | assigned | view |
| read_only | none | none | none | none | none | none | none | none | view |

## Required Future Enforcement

Sensitive actions must eventually call server-side checks:

- venue status changes
- operations alerts and emergency alerts
- field status changes
- scoreboard updates
- stream controls
- tournament schedule updates
- team roster updates
- family/guardian changes
- role assignment changes
- integration writes

## Existing Enforcement Foundation

Already present:

- `canUser(userId, permissionKey, scopeType, scopeId)`
- `requirePermission(userId, permissionKey, scopeType, scopeId)`
- temporary `starts_at` / `ends_at` support
- assignment statuses
- audit logs
- invites/access request/approval workflow tables

## Sprint 2 Scope

This sprint displays and documents permissions. It does not enforce route-level auth yet.

Admin visibility route:

- `/admin/identity/roles`

