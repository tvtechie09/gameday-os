# GameDay Team to GameDay Venue Integration Plan

Date: June 30, 2026

## Goal

Create the Identity Platform bridge between GameDay Team and GameDay Venue without merging the repos or syncing full rosters yet.

## Shared Identity Model

Shared records:

- Organization
- Person
- Family
- Team
- Team Member
- Session

GameDay Team can eventually own team-centric records. GameDay Venue can own venue/session operations. The shared Identity Platform graph allows both products to reference the same organizations, people, families, teams, and sessions.

## Team to Venue Relationship

The bridge is:

```text
Organization -> Team / Tournament -> Session -> Field -> Venue
```

`team_session_links` supports:

- home
- away
- participant

This is intentionally lightweight. It lets a team be associated with a session without importing rosters or changing scoreboards yet.

The Session is the Connected Game Platform object. It connects:

- home team
- away team
- venue
- field
- tournament
- scoreboard
- streaming/media
- sponsors
- operations status
- timeline

## Team Season to Session Mapping

Future mapping:

- Team season game becomes a GameDay Venue session.
- Session may link to one or more teams.
- Home/away values can be derived from `team_session_links` or copied into session display fields.

The current foundation only adds the placeholder relationship. It does not build full roster sync, player stats, or login workflows.

## Roster to Scoreboard/Public Page Mapping

Future:

- Team roster can power player names, lineup, and scoreboard context.
- Public field pages can show team context only when privacy rules allow.
- Scoreboard can remain team-level until player-level features are approved.

Deferred:

- lineup management
- individual player stats
- player public profiles
- roster sync

The Session Command Center may show roster sync and lineup placeholders, but full Team roster sync remains deferred.

## Parent/Guardian Relationship

Identity Platform families connect parents/guardians to players through:

- `families`
- `family_members`
- `people`

Parents should not receive venue/tournament permissions by default. Parent access is family/team scoped and should later be enforced through Supabase Auth, parent login, and guardian approval rules.

## Venue Roles vs Team Roles

Venue roles:

- venue_director
- venue_staff
- scorekeeper when assigned to a venue/session
- stream_operator when assigned to a venue/session

Team roles:

- coach
- team manager in future broader role set
- player
- parent

Tournament roles:

- tournament_director
- tournament staff in future broader role set

Venue infrastructure remains venue-controlled even during tournaments.

## Identity Platform Relationship

```text
Organization
-> Venue
-> Tournament / League
-> Team
-> Family
-> Person
```

Team-to-venue connection is intentionally indirect:

- Team belongs to an organization.
- Team can be linked to a venue for operational context.
- Team can be linked to a session through `team_session_links`.
- Session remains the game object that connects field, venue, scoreboard, stream, sponsors, and public pages.

## Sync Direction

### One-way Team to Venue

Likely MVP:

- team name
- team season
- coach/team manager display
- team-session relationship

### One-way Venue to Team

Likely MVP:

- venue field assignment
- session status
- score/final result
- delay/field status

### Two-way Later

Future:

- schedule confirmations
- roster attendance
- lineup handoff
- parent notification preferences

## MVP Integration Plan

1. Establish shared identity graph.
2. Link teams to sessions through `team_session_links`.
3. Keep session home/away display fields intact.
4. Use `/admin/sessions/[sessionId]/command-center` as the Connected Game Platform command surface.
5. Do not sync rosters yet.
6. Do not merge GameDay Team and GameDay Venue yet.

## Future Auth Placeholders

- Supabase Auth connects users to people.
- Coach login manages assigned team context.
- Parent login manages approved family/child context.
- Staff login manages venue-scoped operational context.
- SSO or Okta-style controls can govern organization staff later.

## Future Roadmap

- team import
- family invitation flows
- guardian approvals
- roster privacy rules
- team schedule sync
- coach score confirmation
- player lineup integration
- parent/fan follow mode tied to family/team identity
- team-managed livestream links
- tournament-managed team assignments
