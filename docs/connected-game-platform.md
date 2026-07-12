# Connected Game Platform

Date: June 30, 2026

## Goal

Make `Session` the central game object connecting Team, Venue, Tournament, Streaming, Scoreboards, Sponsors, Operations, Timeline, Media, Families, and future integrations.

This sprint is architecture and workflow only. It does not add live streaming integrations, scoreboard hardware control, or Team roster sync.

## Core Model

```text
Organization
  -> Team / Tournament
  -> Session
  -> Field
  -> Venue
```

In GameDay OS, a `Session` is the game-level operating object. It is where schedule, team context, field assignment, tournament context, score state, public links, operations status, sponsor placement, media, timeline, scoreboard display, streaming links, and future integrations meet.

The Team app owns team and roster truth. The Venue app owns venue, field, and session operations. The Session connects them without requiring a repository merge.

## Session Audit

Existing Session support already includes:

- organization_id
- field_id
- play_surface_id
- tournament_id
- title
- sport_type
- home_team
- away_team
- start_time
- end_time
- status
- game_status
- score state
- inning/count/outs
- primary and secondary links
- external source tracking
- notes
- timeline events

Adjacent models already connected to a session:

- field and venue
- tournament
- sponsor assignments
- volunteer roles
- resource activations
- scoreboard profile by field
- audio profile by field/session
- public field page
- public scoreboard page
- follows
- session events

## Sprint 3 Session Expansion

New nullable/foundation session fields:

- `home_organization_id`
- `away_organization_id`
- `operations_status`
- `scoreboard_profile_id`
- `streaming_profile`
- `walkup_music_profile`
- `sponsor_package`
- `media_links`
- `officials`

These fields are intentionally lightweight:

- JSON metadata is used for future profiles and packages.
- Existing first-class tables still power current workflows.
- No vendor integration is implied.

## Session Command Center

New route:

- `/admin/sessions/[sessionId]/command-center`

Purpose:

Mission Control for one game.

Required sections:

- Game Summary
- Teams
- Scoreboard
- Streaming / Media
- Sponsors
- Operations Alerts
- Timeline
- Public Links

The command center reads existing data from:

- session
- field
- venue
- active alerts
- session events
- scoreboard profile
- audio profile
- resource activations
- volunteer roles
- sponsor placements
- identity team/session links

The command center must show team placeholders without creating full team sync:

- Home Team
- Away Team
- Team source
- Roster sync placeholder
- Lineup placeholder

Streaming / Media must show current links and clearly label future integrations:

- GameChanger
- SidelineHD
- YouTube
- Hudl
- Pixellot

Scoreboard must show:

- Manual scoreboard status
- Public scoreboard link
- Score control link
- Future adapter placeholder

## Session Timeline

Everything important during a game should write to Session Timeline.

Existing event types:

- session_created
- score_update
- resource_activated
- alert_created
- sponsor_clicked
- game_started
- game_final

Added event types:

- operations_update
- scoreboard_update
- streaming_update
- media_added
- sponsor_update
- official_update
- weather_update

Important game events expected in the timeline:

- Game started
- Score updated
- Delay applied
- All clear
- Game final

Future service behavior:

- Operations Center updates should write `operations_update` or `weather_update`.
- Scoreboard workflow should write `scoreboard_update`.
- Streaming workflow should write `streaming_update`.
- Sponsor changes should write `sponsor_update`.
- Media links should write `media_added`.
- Officials changes should write `official_update`.

## Public Session Summary

The public field page presents the active/next session from Session data as a connected game summary:

- current game / next game
- score
- operations alerts count
- streaming/follow links availability
- sponsor visibility

The public page remains parent-focused and does not expose admin or integration language.

## Team, Venue, Tournament, Family, Operations Connection

### Team

Teams can conceptually link to sessions through `team_session_links`.

No roster sync yet.

### Venue

Venue owns:

- field assignment
- field status
- operations alerts
- scoreboard/audio/display infrastructure
- public venue/field pages

### Tournament

Tournament owns:

- tournament schedule
- brackets
- tournament game operations
- field assignment requests

Tournament does not automatically control venue infrastructure.

### Family

Families consume session output through public field pages and future family/team access.

No authenticated family portal is added in this sprint.

### Operations

Venue Command Center remains the source of truth for:

- delays
- all-clear
- public communications
- emergency state

Session consumes operations status and active alerts. Venue Command Center should write timeline entries for major game-impacting events.

## Deferred

- real streaming provider integration
- physical scoreboard commands
- Team roster sync
- lineup support
- official assignment workflows
- media upload/gallery system
- tournament bracket automation
- natural language AI assistant over connected game state
