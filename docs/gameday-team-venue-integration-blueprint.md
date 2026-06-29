# GameDay Team ↔ GameDay Venue Integration Blueprint

## Goal

GameDay Team and GameDay Venue should connect as two coordinated modules:

- GameDay Team owns the team, roster, family, season, and coach experience.
- GameDay Venue owns the venue, field, session, scoreboard, QR, alert, sponsor, and operations experience.

The integration should let both products stay useful independently while making game day feel connected for coaches, parents, athletes, venue operators, and tournament directors.

## Shared Organization Model

Both modules should share an organization boundary.

An organization represents the customer, league, club, school, tournament group, or venue operator. It is the top-level tenant used to group Team and Venue data.

Shared organization fields should include:

- `id`
- `name`
- `slug`
- `logo_url`
- `banner_url`
- `primary_color`
- `secondary_color`
- `website_url`
- `description`

GameDay Team uses the organization to group:

- Teams
- Seasons
- Rosters
- Coaches
- Parents and guardians
- Team schedules
- Team communications
- Walk-up music preferences

GameDay Venue uses the organization to group:

- Venues
- Fields
- Sessions
- Tournaments
- Scoreboards
- Sponsors
- Alerts
- Resources
- Public pages
- QR links

For the first integration, organizations can be linked manually. Longer term, both modules should use the same organization identity and role framework.

## Team Season ↔ Session Relationship

The core connection is:

`Team Season Event ↔ Venue Session`

A Team season event is the team-side schedule object. It answers:

- Who is playing?
- Which team season is this part of?
- What should parents and coaches see?
- What does this mean for team availability and communication?

A Venue session is the venue-side game-day object. It answers:

- Where is the game happening?
- Which field is active?
- What does the QR page show?
- What is the score?
- Are there alerts, sponsors, resources, or scoreboard displays?

Recommended mapping fields:

- `team_id`
- `team_season_id`
- `team_event_id`
- `venue_id`
- `field_id`
- `session_id`
- `home_team_id`
- `away_team_id`
- `sync_status`
- `last_synced_at`
- `external_source`
- `external_source_id`

The Venue session should remain the game-day source of truth for field assignment, score display, QR pages, field status, public alerts, and venue operations.

The Team season event should remain the team-side source of truth for team schedule, roster context, parent communication, coach notes, and availability.

## Roster ↔ Scoreboard Relationship

The scoreboard should use roster data only when a session is explicitly linked to GameDay Team.

Default scoreboard behavior:

- Show home team name.
- Show away team name.
- Show score.
- Show inning, period, count, outs, or status depending on sport.
- Show venue and field.

Optional roster-enhanced behavior:

- Team logo
- Player display name
- Jersey number
- Position
- Batting order
- Starting lineup
- Player highlight

Privacy rules:

- Do not expose full roster data publicly by default.
- Do not show parent or guardian contact data on public pages.
- Do not show medical, attendance, birthdate, address, or private profile data.
- Public roster display must be opt-in at the team or season level.

The scoreboard can eventually support team-aware modes:

- Basic public scoreboard: team names and score only.
- Roster display mode: public-safe player names and numbers.
- Coach mode: fuller roster context behind permissions.
- Broadcast mode: lineup and sponsor-friendly display.

## Parent / Guardian Relationship

Parents and guardians belong primarily to GameDay Team.

They should be able to:

- Follow their team.
- View the team schedule.
- See linked venue and field pages.
- Open QR-accessible field pages.
- See score and status updates.
- Receive venue alerts for linked sessions.
- Submit community links if allowed.

Parents and guardians should not automatically become Venue users.

Venue roles are operational roles, not family roles. A parent may temporarily act as a volunteer, scorekeeper, livestream provider, announcer, or camera contributor, but that should be scoped to a field or session.

Recommended parent-to-venue pattern:

- Parent identity stays in GameDay Team.
- Venue public pages remain accessible without login.
- Session-specific contribution links can be submitted without granting admin privileges.
- Coach or parent score entry should use limited, session-scoped access.

## Walk-Up Music Relationship

Walk-up music belongs naturally to GameDay Team because it is tied to players, rosters, and team preferences.

Venue owns audio readiness and operational constraints.

GameDay Team should manage:

- Player music preferences
- Approved song title or label
- Player intro name
- Jersey number
- Team-level music rules
- Coach approval state

GameDay Venue should manage:

- Field audio profile
- Audio mode
- Speaker or PA readiness
- Venue policy
- Session-level audio availability
- Operator assignment
- Public indication that audio is available

Recommended relationship:

`Roster Player Music Preference -> Team Season Roster -> Venue Session Audio Profile`

Phase 1 should not play music, stream audio, or handle copyrighted media. It should only prepare the relationship:

- Team can mark that a player has walk-up music configured.
- Venue can mark that a field/session has audio available.
- Field Control Center can show whether linked Team walk-up data exists.
- Public field page can show “Audio available” only when active.

Future walk-up music workflows may include:

- Lineup-aware music queue
- Coach-approved player intros
- Venue operator queue
- OBS/audio overlay integration
- Manual “next batter” controls
- Explicit copyright and venue policy controls

## One-Way Sync

One-way sync should be used when one module clearly owns the data.

### GameDay Team → GameDay Venue

Sync these one-way from Team to Venue:

- Team name
- Team logo
- Team sport
- Team season name
- Public team link
- Coach display name, if public
- Public-safe roster display fields, only if enabled
- Walk-up music availability flag
- Team event title
- Home/away team identity

GameDay Team remains source of truth for this data.

### GameDay Venue → GameDay Team

Sync these one-way from Venue to Team:

- Venue name
- Field name
- Public field URL
- Public venue URL
- QR link
- Field status
- Venue alerts
- Session status
- Score
- Final result
- Scoreboard display URL

GameDay Venue remains source of truth for this data.

## Two-Way Sync

Two-way sync should be limited, explicit, and conflict-aware.

Good candidates:

- Linked event/session status
- Score updates
- Final game result
- Start time changes
- Field assignment changes
- Cancellation or delay state

Two-way sync should not be used for:

- Parent or guardian contact data
- Private roster fields
- Medical or safety data
- Sponsor assignments
- Venue resources
- Venue operations alerts
- Role permissions
- Payment or billing data

Every two-way sync should track:

- Last updated timestamp
- Last updated source
- Conflict status
- Manual review state

If both modules update the same field, GameDay should not silently overwrite. It should show a conflict and let an operator choose the source of truth.

## MVP Integration Plan

The MVP should be intentionally small and pilot-safe.

1. Manual organization linking

Link one GameDay Team organization to one GameDay Venue organization.

2. Team directory reference

Venue can access a read-only list of teams from the linked Team organization:

- Team name
- Team logo
- Sport
- Active season

3. Manual session linking

Venue admin can link a session to:

- Home team
- Away team
- Team season
- Team event, if available

4. Public field page enhancement

If linked teams exist, show:

- Team names
- Team logos, if public
- Public-safe team links

No roster details by default.

5. Scoreboard enhancement

Scoreboard uses linked team names/logos instead of plain text labels when available.

6. Venue alerts into Team schedule

Linked Team events can display:

- Field delayed
- Field closed
- Weather delay
- All clear
- Venue announcement

7. Final score sync

Venue final score can update the linked Team event result.

8. Walk-up music readiness

Show only readiness flags:

- Team has walk-up music data.
- Venue field/session has audio available.

No audio playback in MVP.

## Future Roadmap

### Phase 2: Schedule Sync

- Team events can create Venue sessions.
- Venue sessions can update Team event location and score.
- Import adapters can map external schedule records into both modules.
- Sync review queue handles conflicts.

### Phase 3: Coach And Volunteer Controls

- Coaches can open session-scoped score entry.
- Parents can submit session-scoped community links.
- Volunteers can be assigned to score, stream, audio, announcing, or scoreboard roles.

### Phase 4: Public-Safe Roster Display

- Teams can opt into public roster display.
- Public pages can show jersey number, display name, and position.
- Scoreboard display can support lineup mode.

### Phase 5: Walk-Up Music Operations

- Team roster provides approved player music metadata.
- Venue audio profile controls whether music can be used.
- Field Control Center shows the game’s music queue.
- Operator can advance to next batter/player.
- OBS or display overlays can show player intro data.

### Phase 6: Tournament Integration

- Tournament schedules connect multiple teams, venues, fields, sessions, and public displays.
- Bracket and pool play data can flow into public venue pages.
- Venue operators keep control of field status and alerts.

### Phase 7: Unified Notifications

- Team parents receive venue alerts for linked sessions.
- Coaches receive score/status confirmations.
- Venue operators receive schedule or roster changes.
- Notification preferences and consent are enforced before email, SMS, or push.

### Phase 8: External Platform Bridge

Support shared imports and mappings from:

- SportsEngine
- GameChanger
- TeamSnap
- HomeTeamsOnline
- iCal feeds
- CSV exports

GameDay should act as the clean operational layer between existing platforms, teams, venues, and parents rather than forcing a full replacement on day one.

## Design Principles

- Team data stays Team-owned.
- Venue data stays Venue-owned.
- Parents get simple public access without operational clutter.
- Private family and roster data is never public by default.
- Sync should be visible and reversible.
- Manual linking comes before automation.
- Venue operations should never depend on Team being fully configured.
- Team schedules should still work when Venue is not connected.
