# Permissions And Access Control

Last reviewed: June 27, 2026

## Core Principle

Permissions are scoped, not global.

A user can hold different roles in different scopes:

- Super Admin at platform scope.
- Organization Admin at organization scope.
- Venue Director at venue scope.
- Scorekeeper at session or play-surface scope.
- Stream Operator at session or device scope.
- Parent at family/team scope.

Frontend visibility can improve usability, but backend enforcement is mandatory for sensitive actions.

## Required Role Coverage

The permission model must include:

- Super Admin
- Organization Admin
- Venue Director
- Venue Staff
- Tournament Director
- League Director
- Coach
- Parent
- Scorekeeper
- Stream Operator
- Read Only

The current GameDay Identity model also supports additional long-term roles such as platform admin, tournament staff, league staff, team manager, fan, livestream operator, sponsor manager, media operator, emergency coordinator, audit reviewer, and third-party developer.

## Scope Model

Supported scopes should include:

- platform
- organization
- venue
- field
- play_surface
- tournament
- league
- team
- player
- family
- game
- session
- device
- integration

`play_surface` is important for complex venues where a parent field can be split into surfaces such as 3A, 3B, and 3C.

## Venue Control

Venue control includes:

- operations status
- field status
- weather, delay, closure, and emergency alerts
- resources
- scoreboards
- audio
- displays
- venue map and QR entry points
- equipment endpoint configuration

Venue Director:
- Can manage venue settings, venue operations, field status, resources, alerts, and infrastructure workflows inside the assigned venue.

Venue Staff:
- Can support day-of operations, field status, alerts, resources, and approved game operations inside assigned scopes.

Emergency Coordinator:
- Can override lower-priority operations only inside the approved venue/emergency scope.

## Tournament Control

Tournament control includes:

- schedule
- bracket/session management
- field assignments
- delay impacts
- tournament announcements

Tournament Director:
- Can manage tournament schedule, bracket, sessions, and tournament communications.
- Does not automatically control venue infrastructure, scoreboards, audio, displays, or emergency overrides.

Tournament Staff:
- Can support tournament check-ins, scores, schedules, and bracket operations when assigned.

## League And Team Control

League Director:
- Can manage league-level schedules, teams, and league operations inside assigned league scope.

Coach:
- Can manage team context, roster, lineup, invites, and game controls only where assigned.

Parent:
- Can view family/team information and follow public content.
- Cannot update scores, manage venue status, or control devices.

Scorekeeper:
- Can update score/status only for the assigned game/session or approved play surface.
- Temporary access should expire after the game.

Stream Operator:
- Can operate streaming/media controls only for the assigned game/session/device.
- Cannot update score unless a separate scorekeeper role is assigned.

Read Only:
- Can view operational context but cannot mutate data.

## Server-Side Enforcement Checklist

For every sensitive mutation:

- Determine the resource.
- Determine the exact scope.
- Call `requirePermission(userId, permissionKey, scopeType, scopeId)`.
- Fail closed when the role is missing, expired, revoked, or scoped elsewhere.
- Write an audit log after successful mutation.

Examples:

- Venue status update: `venue.alert.send` or `venue.manage` at venue scope.
- Field status update: `venue.field.manage` at venue or field scope.
- Play-surface score/status update: `game.score.update` at session or play_surface scope.
- Scoreboard device control: `device.control` at device, field, play_surface, or venue scope depending on assignment.
- Tournament schedule change: `tournament.schedule.manage` at tournament scope.

## Audit Notes

- No global admin shortcut should exist except true platform-level Super Admin/Platform Admin.
- Tournament authority must not imply venue infrastructure authority.
- Venue emergency override must win over tournament, league, team, family, and fan preferences.
- Temporary access must respect `starts_at` and `ends_at`.
- Expired or revoked assignments must fail closed.
