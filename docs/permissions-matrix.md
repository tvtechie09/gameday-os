# GameDay OS Identity Platform Permission Matrix

Date: June 30, 2026

## Principle

Frontend visibility is not security. Future enforcement must happen server-side through scoped permission checks.

The matrix below documents expected access for the Identity Platform foundation. Route-level enforcement is not enabled yet.

## Access Levels

- **manage:** Can configure and administer the scope.
- **operate:** Can perform day-to-day operations in the scope.
- **assigned:** Can act only when explicitly assigned to a game/team/family/session.
- **view:** Can view approved records.
- **none:** No expected access.

## Role Matrix

| Role | Venue Command Center | Game Day Center | Status Board | Sessions | Fields | Scoreboards | Sponsors | Resources | Team | Family | Identity | Settings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| super_admin | manage | manage | manage | manage | manage | manage | manage | manage | manage | manage | manage | manage |
| organization_admin | operate | operate | operate | operate | operate | operate | operate | operate | operate | view | manage | manage |
| venue_director | manage | operate | operate | operate | manage | manage | view | manage | none | none | none | none |
| venue_staff | operate | operate | operate | operate | operate | operate | none | operate | none | none | none | none |
| tournament_director | view | view | view | manage | view | none | view | none | view | none | none | none |
| league_director | none | none | none | operate | none | none | none | none | manage | none | none | none |
| coach | none | none | none | assigned | none | none | none | none | manage | view | none | none |
| parent | none | none | none | none | none | none | none | none | view | manage | none | none |
| player | none | none | none | none | none | none | none | none | view | view | none | none |
| scorekeeper | none | none | none | assigned | none | assigned | none | none | none | none | none | none |
| stream_operator | none | none | none | assigned | none | none | none | none | none | none | none | none |
| read_only | view | view | view | view | view | none | none | none | none | none | none | none |

## Required Future Enforcement

Sensitive actions must eventually call server-side checks:

- venue status changes
- Venue Command Center alerts and emergency alerts
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

## Identity Platform Scope

This sprint displays and documents permissions. It does not enforce route-level auth yet.

Admin visibility route:

- `/admin/identity/roles`
