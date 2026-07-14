# Connected Game Engine — Current-State Audit

Date: 2026-07-13 · Repos audited: `gameday-venue-os` (this repo) and `GameDayTeam`
(sibling, same Supabase project `ekkmflksqerdhutqxeii`).

## Summary conclusion

**The `sessions` table is already the platform's de facto canonical Game record.**
Every game-shaped workflow in both applications reads or writes it, directly or
through link columns. It should be *extended in place* as the canonical Game —
creating a parallel `games` table would duplicate ~15 live workflows and violate
the "no competing platform layer" rule. Its weaknesses (baseball-specific live
state inline, unconstrained status text, thin event log) are exactly what the
Game Engine's additive tables fix.

## Database tables

| Table | Role today | Notes / risks |
| --- | --- | --- |
| `sessions` | **De facto Game.** Identity (`id`, `title`, `sport_type`), schedule (`start_time`, `end_time`, `field_id`, `play_surface_id`, `tournament_id`), participants (`home_team`, `away_team` as free text; `gdt_home/away_team_season_id` as verified team links), live state inline (`home_score`, `away_score`, `inning`, `inning_half`, `balls`, `strikes`, `outs`), lifecycle (`status`, `game_status` — unconstrained text), scorekeeper access (`scorekeeper_token/pin/seq`), integration identity (`external_source`, `external_source_id`, `external_source_url`), tenant (`organization_id`, nullable). | Mixed concerns: identity + schedule + baseball live state in one row. Status not constrained at DB level (TS normalizes to `scheduled/active/final`). |
| `session_events` | Thin append log (`session_id`, `event_type`, `event_message`, `created_at`). Types: session_created, score_update, game_started, game_final, operations_update, scoreboard_update, resource_activated, alert_created, sponsor_clicked. | No tenant id, actor, source, payload, idempotency, or correlation. Human-readable message only; can't drive automations/AI. Check constraint drifted from TS once already (fixed 2026-07-13 migration). |
| `session_officials` | Officials assigned to a game (name/email/phone, tokenized confirm). | Healthy; references sessions. |
| `scoreboards` | **Orphan.** App uses `scoreboard_profiles`; RLS enabled 2026-07-13 (deny-all). | Do not build on it. Candidate for later removal (not this sprint). |
| `game_states` (pre-existing) | **Orphan (DB drift).** 0 rows, referenced by NO code in either repo, absent from repo migration history. A baseball batting-order scoreboard prototype keyed on `profile_id` (`current_batter_id`, `batting_order_ids`, `sponsor_rotation`…). Discovered during migration review. | Name collision: the engine's current-state table is therefore named `game_live_state`. Sprint-2 cleanup: RLS + drop this orphan. |
| `scoreboard_profiles`, `scoreboard_adapters` | Device/adapter config per field. | Device layer, not game truth. |
| `fields`, `play_surfaces`, `venues`, `venue_zones` | Location hierarchy games attach to. | Healthy. |
| `field_bookings` | Reservations (non-game schedule items) with conflict checks vs sessions. | Reads sessions for conflicts. |
| `tournaments` | Competition container (`tournament_id` on sessions). | Healthy. |
| `follows`, `alert_deliveries` | Fan/guardian notification fan-out keyed on fields/sessions. | Consumers of game data. |
| `gameday_os_state_snapshots` (team app) | Team app's DiamondState JSON blob; contains `teamSeasons`, `memberships`, availability responses that reference venue sessions via link columns. | Team app is a **consumer** of venue games, not an owner. |
| `gdt_*` relational mirror (team app) | Dead code mirror layer, RLS'd deny-all 2026-07-13. | Ignore. |

## TypeScript models

- `src/lib/types.ts` → `Session` (the Game), `SessionStatus = "scheduled"|"active"|"final"`, `SessionEventType`, `FieldStatus`.
- `src/lib/game-state-engine.ts` + `src/lib/scoreboard-feed.ts` → `NormalizedGameState`: in-memory normalization of device/scoreboard feed state (score, inning, clock-ish). Not persisted as canonical truth.
- `src/lib/services/sessions.ts` → the only write path family for sessions (create/update/`setSessionStatus`/`updateSessionGameState`); appends `session_events` on status/score changes; notifies schedule changes.
- `src/lib/services/scorekeeper.ts` → public token+PIN write path with monotonic `scorekeeper_seq` (existing optimistic concurrency + retry).
- Team app: `lib/gameday-venue-link.ts` (`getLinkedVenueGames`) → read-only projection of venue sessions for family calendars, standings, availability, Game Morning card.

## API routes / server actions touching games

Venue app: `/api/score/[token]` (public scorekeeper), `/api/integrations/schedule`
(bearer-token push, **idempotent upsert on `external_source`+`external_source_id`** —
an external ID mapping already exists), `/api/integrations/daktronics/readings`,
`/api/weather/auto-check` (reads upcoming games), admin sessions pages + server
actions (`/admin/sessions/*`, live-session-dashboard, officials, import, generate),
Today quick actions (`app/today/actions.ts` → `setSessionStatus`), storm watch.
Team app: `/api/team-seasons/[id]/linked-games`, `/api/me/linked-games`,
`/api/me/schedule`, `/api/calendar/[token]`, `/league/[code]` — all read-only.

## UI routes

Venue: `/admin/sessions`, `/admin/sessions/[sessionId]` (live dashboard),
`/admin/game-day`, `/fields/[fieldId]` + `/venues/[venueId]` (public QR pages),
`/score/[token]`, `/scoreboard/*`, `/display/*`, `/today`.
Team: family dashboard venue cards, league hub, calendars.

## Conflicting / duplicate game models

1. `sessions` row state vs `game-state-engine` normalized feed state (device
   ingest) — reconciled ad hoc in scoreboard feed code.
2. `status` vs `game_status` columns (kept in lockstep by services; two columns,
   one meaning).
3. Team app's DiamondState stores availability/game references keyed to venue
   session ids — a projection, acceptable.
4. Orphan `scoreboards` table.

## Ownership & authorization

- **Data owner:** venue app owns game truth; team app consumes via `gdt_*` links.
- **Tenant:** `organization_id` on sessions (nullable — legacy rows), org scoping
  via `organization-data-scope.ts`; venue-scope enforcement recently added for
  venue-scoped roles (capabilities `managesAllVenues`/`venueInScope`).
- **RLS:** public read policies exist deliberately for QR/fan surfaces (sessions,
  fields, follows). Writes go through service role in server routes with
  app-layer permission checks (`requirePermission`, capability checks).

## Migration risks

- `status` is unconstrained text with live rows: adding a CHECK on the existing
  column could break inserts from older paths → use an **additive
  `lifecycle_status` column** with CHECK + service-layer sync instead.
- Public read RLS on sessions must not be tightened (QR pages depend on it).
- `session_events` has consumers (field page timeline) → keep it working; the
  richer `game_events` ledger is additive, with dual-append during transition.
- Schedule-push idempotent upsert must keep functioning unchanged.

## Recommended canonical source of truth

`sessions` (extended) = **canonical Game identity + schedule**.
New `game_live_state` = current mutable, sport-extensible live state (JSONB payload).
New `game_events` = append-only, tenant-aware, idempotent event ledger.
Existing baseball columns on `sessions` remain as a legacy projection kept in
sync by the Game domain service until consumers migrate (Sprint 2+).
