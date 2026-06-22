# GameDay Team + GameDay Venue Integration Plan

## Purpose

GameDay Team and GameDay OS Venue should work together without collapsing into one product.

GameDay Team is the team-side app for coaches, parents, rosters, seasons, communication, and team operations.

GameDay OS Venue is the venue-side platform for fields, schedules, QR field pages, scoreboards, sponsors, alerts, resources, and game-day operations.

The integration goal is simple: teams bring team context, venues provide the physical game-day layer, and parents get one clean public experience at the field.

## Shared Organization Model

Both products should use a shared organization concept, but each app can keep its own operational models.

An organization represents the customer or tenant boundary.

Examples:
- A youth sports league
- A tournament operator
- A club
- A school
- A facility operator

Recommended shared organization fields:
- `id`
- `name`
- `slug`
- `logo_url`
- `primary_color`
- `secondary_color`
- `website_url`
- `description`

GameDay Team should associate teams, seasons, rosters, families, and coaches to an organization.

GameDay Venue should associate venues, fields, sessions, sponsors, resources, alerts, and integrations to an organization.

For Phase 1, organization matching can be manual: an admin selects which GameDay Team organization maps to which GameDay Venue organization. Later, this can become a shared identity and permissions layer.

## Team To Venue Relationship

A team should not own a venue. A venue should not own a team.

The relationship should be event-based.

A team connects to a venue when one of its games, practices, tournaments, or events is scheduled at a venue field.

Recommended relationship model:

- Organization owns teams.
- Organization owns or accesses venues.
- A team season creates team events.
- A venue creates sessions.
- A session can reference one or more teams.

Core relationship:

`Team -> Team Season -> Team Event -> Venue Session -> Field`

In GameDay Venue, the session remains the game-day source of truth for:
- Field assignment
- Venue alerts
- Field status
- Public QR page
- Scoreboard display
- Sponsors
- Resources
- Volunteers

In GameDay Team, the team event remains the team-side source of truth for:
- Team schedule
- Roster
- Coach notes
- Parent communications
- Availability
- Team-specific attendance

## Team Season To Session Mapping

GameDay Team seasons should map to GameDay Venue sessions through scheduled events.

Recommended mapping fields:
- `team_season_id`
- `team_event_id`
- `venue_session_id`
- `external_source`
- `external_source_id`
- `sync_status`
- `last_synced_at`

Mapping behavior:
- A GameDay Team game can create or link to a Venue session.
- A Venue session can link back to the Team season event.
- A tournament or league schedule import may create Venue sessions first, then teams can claim or link them.

Phase 1 should support manual linking:
- Select GameDay Team organization.
- Select team.
- Select season.
- Select team event.
- Link it to a GameDay Venue session.

Later phases can support automatic matching by:
- Date/time
- Venue name
- Field name
- Team names
- Opponent name
- External schedule ID

## Roster To Scoreboard And Public Page Mapping

The public field page should stay venue-first, but it can display team-enhanced context when a session is linked to GameDay Team.

Roster data should be used carefully. Parent-facing public pages should not expose private youth athlete data by default.

Recommended public roster behavior:
- Show team names by default.
- Show player names only if the team has explicitly enabled public roster display.
- Show jersey numbers only if enabled.
- Do not show parent names, emails, phone numbers, addresses, birthdates, medical notes, or private availability.

Scoreboard mapping:
- Session home team maps to one GameDay Team team when known.
- Session away team maps to one GameDay Team team when known.
- Optional lineup or roster display can be added later.

Public field page mapping:
- Team name
- Team logo if public
- Coach display name if public
- Roster summary if enabled
- Team links if public

Future optional mappings:
- Batting order
- Starting lineup
- Player of the game
- Team announcements
- Team media links

## Parent And Guardian Roles Vs Venue Roles

GameDay Team roles and GameDay Venue roles should remain distinct.

Team-side roles:
- Parent
- Guardian
- Player
- Coach
- Assistant coach
- Team manager

Venue-side roles:
- Super admin
- Organization admin
- Venue operator
- Field operator
- Scorekeeper
- Stream operator
- Sponsor manager
- Volunteer
- Read only

Important boundary:
- A parent in GameDay Team should not automatically become a venue admin.
- A venue operator should not automatically see private roster or family information.
- A coach can be granted a limited venue role for sessions involving their team.

Recommended Phase 1 permission behavior:
- GameDay Team parents can view public venue/field pages.
- GameDay Team coaches can be invited to operate score for their team session.
- Venue admins can link sessions to teams but cannot view private family data.
- Public pages show only approved public team data.

## One-Way Sync

Some data should sync one-way to avoid conflicting sources of truth.

GameDay Team to GameDay Venue:
- Team name
- Team logo
- Team season name
- Coach display name, if public
- Team event title
- Home/away team labels
- Optional public team link

GameDay Venue to GameDay Team:
- Venue name
- Field name
- Public field URL
- Public venue URL
- QR code URL
- Field status
- Venue alerts
- Game status
- Score
- Final result

Recommended source of truth:
- Team identity: GameDay Team
- Venue and field identity: GameDay Venue
- Public field experience: GameDay Venue
- Roster privacy: GameDay Team
- Game-day status: GameDay Venue

## Two-Way Sync

Two-way sync should be limited and explicit.

Good candidates for two-way sync:
- Linked session/event status
- Score updates
- Game final status
- Schedule time changes, with conflict handling
- Field assignment updates, if the team event references a venue session

Avoid two-way sync for:
- Roster membership
- Parent/guardian contact information
- Venue sponsorship data
- Venue resources
- Venue operations alerts
- Organization permissions

Two-way sync should include:
- Conflict detection
- Last updated timestamps
- Source attribution
- Manual review when both sides changed the same field

Example:
- Coach updates score in GameDay Team.
- Venue operator updates score in GameDay OS.
- If updates happen near the same time, GameDay OS should show a conflict instead of silently overwriting.

## Phase 1 MVP Integration

Phase 1 should be practical, pilot-friendly, and low-risk.

Recommended MVP:

1. Shared organization mapping
   - Manually link a GameDay Team organization to a GameDay Venue organization.

2. Team directory import
   - Pull or upload basic team records into GameDay Venue:
     - Team name
     - Team logo
     - Sport
     - Season

3. Manual session linking
   - On a Venue session, select:
     - Home team from GameDay Team
     - Away team from GameDay Team
     - Team season/event reference if available

4. Public page enhancement
   - Public field page can show linked team logos/names.
   - No private roster data by default.

5. Score sync foundation
   - Venue session score can be exported or pushed back to the linked team event.
   - Final score can update the Team season schedule result.

6. Coach score entry invitation
   - Venue admin can generate a score control link for a coach.
   - No full authentication dependency in MVP.

7. Alert visibility to teams
   - Venue alerts and field status can appear in the Team app schedule view for linked events.

Phase 1 should not include:
- Automatic roster syncing
- Parent contact syncing
- Payment data
- Full permission enforcement across apps
- Complex conflict resolution
- Automated SportsEngine/GameChanger replacement

## Future Integration Roadmap

### Phase 2: Linked Schedule Sync

- Team season events can create Venue sessions.
- Venue sessions can update Team event location, field, score, and status.
- Admin review queue for schedule conflicts.
- Support external source IDs across both apps.

### Phase 3: Coach And Volunteer Operations

- Coaches can claim scorekeeper or stream operator roles for linked sessions.
- Team volunteers can appear in Venue session operations.
- Venue operators can see assigned team contacts without exposing full parent data.

### Phase 4: Controlled Roster Display

- Teams can opt into public roster display.
- Public page can show approved roster fields:
  - First name or display name
  - Jersey number
  - Position
- Private player/family fields remain Team-only.

### Phase 5: Unified Notifications Framework

- Venue alerts can notify linked teams.
- Team schedule changes can notify venue operators.
- Final scores can notify parents.
- Weather delays can appear across both apps.

No email, SMS, or push should be added until notification preferences and consent are defined.

### Phase 6: Tournament Mode

- Tournament schedule connects venues, fields, teams, pools, brackets, and public displays.
- Team app can show tournament-specific schedules.
- Venue app controls field status, alerts, scoreboards, sponsors, and displays.

### Phase 7: External Platform Bridge

GameDay Team and GameDay Venue can jointly map external systems:
- SportsEngine
- GameChanger
- TeamSnap
- HomeTeamsOnline
- iCal feeds
- CSV imports

The long-term goal is not to replace every platform immediately. The goal is to let GameDay OS become the venue and game-day layer while GameDay Team remains the team/family operating layer.

## Data Ownership Principles

1. Venue data belongs to the venue organization.
2. Team data belongs to the team organization.
3. Parent and guardian data should remain private by default.
4. Public pages should expose only intentional public data.
5. Sync should favor explicit linking over assumptions.
6. Conflicts should be visible, not silently overwritten.
7. GameDay Venue should remain useful even when no Team app is connected.
8. GameDay Team should remain useful even when no Venue platform is connected.

## Recommended First Build Slice

The best first slice is:

1. Add team reference fields to sessions.
2. Add a lightweight linked teams table or service boundary.
3. Add manual team linking on session create/edit.
4. Show linked team names/logos on public field and scoreboard pages.
5. Add final score export back to GameDay Team.
6. Add venue alert visibility inside linked Team schedule events.

This gives pilots a visible integration without risking private data, auth complexity, or fragile two-way sync.
