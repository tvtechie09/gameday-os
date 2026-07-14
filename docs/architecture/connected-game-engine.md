# Connected Game Engine — Architecture

Status: Sprint 1 foundation · Date: 2026-07-13 · Owner repo: `gameday-venue-os`

## Purpose

One canonical Game record — identity, schedule, lifecycle, live state, and an
immutable event history — that GameDay Venue, Tournament, Team, Community,
integrations, devices, automations, media, and GameDay AI all read from and
write through. Integrations connect to the Game Engine, never to each other.

## Non-goals (this sprint)

- No third application or second platform layer.
- No distributed message broker (durable DB ledger instead).
- No large new UI; no mass page migration; no table deletes/renames.
- No production migration application without review.
- No scorekeeping UX in GameDay Team (product guardrail: Team *conducts*,
  the platform engine owns game state; scoring UIs remain venue/scorekeeper/
  integration surfaces).

## Domain boundaries

| Concern | Owner |
| --- | --- |
| Game identity, schedule, lifecycle | Game Engine (`sessions` extended) |
| Current live state (per sport) | Game Engine (`game_states`) |
| History | Game Engine (`game_events`, append-only) |
| Location (venue/field/surface) | Venue domain (existing) |
| Competition (tournament/league/season) | Tournament domain (existing) + team app season links (`gdt_*`) |
| Verified team/participant identity | GameDay Team (via `gdt_*_team_season_id`) |
| Devices (scoreboards, cameras) | Device domain; feeds engine via adapters |
| Fan/guardian notification | Alerts/follows; consumes engine events |

## Canonical entities

```
Organization (tenant)
  └─ Venue ─ Field ─ PlaySurface
        └─ GAME (sessions row)  ←── Tournament / gdt team-season links
              ├─ GameState   (1:1 current, sport-extensible)
              ├─ GameEvent[] (append-only ledger)
              └─ SessionOfficial[] (existing)
```

**Game (canonical identity + schedule)** — existing `sessions` columns map to the
required core: stable UUID `id`; human code (derivable; `scorekeeper_token`
already serves as a capability code); tenant `organization_id`; `sport_type`;
competition type (`tournament_id` presence / new `competition_type` deferred —
representable in `game_states.state.meta` until a real second value exists);
source system `external_source` + `external_source_id` (+ unique mapping);
`created_at`/`updated_at`; venue via `field_id → fields.venue_id`;
`play_surface_id`; `tournament_id`; league/season via `gdt_*_team_season_id`;
home/away participants (free-text names + verified team-season links);
officials via `session_officials`; schedule via `start_time`/`end_time`
(timezone: stored UTC, venue-local presentation — venues carry region);
sequence/round via `game_states.state.meta.round` until first real consumer.
**Added this sprint:** `lifecycle_status` (constrained).

## Lifecycle state machine

`draft → scheduled → check_in → warmup → ready → live → final → archived`
with lateral states: `delayed`, `suspended`, `postponed`, `cancelled`.

Allowed transitions (enforced in `game-lifecycle.ts`, mirrored by DB CHECK on
value set; transition legality is app-enforced, value legality DB-enforced):

- draft → scheduled, cancelled
- scheduled → check_in, warmup, ready, live, delayed, postponed, cancelled
- check_in → warmup, ready, live, delayed, cancelled
- warmup → ready, live, delayed, cancelled
- ready → live, delayed, cancelled
- live → delayed, suspended, final
- delayed → live, suspended, postponed, cancelled, ready
- suspended → live, postponed, cancelled, final
- postponed → scheduled, cancelled
- cancelled → (terminal; → archived)
- final → archived
- archived → (terminal)

Legacy mapping (kept in sync by the domain service): `scheduled|check_in|warmup|
ready|delayed|postponed → status "scheduled"`, `live|suspended → "active"`,
`final|cancelled|archived → "final"`. Existing consumers keep working unchanged.

## Game vs Game State vs Game Event

1. **Game** (`sessions`): who/where/when/what sport — slowly changing.
2. **GameState** (`game_states`): one row per game; current mutable snapshot;
   `version` (monotonic, optimistic concurrency); `score_home`/`score_away`
   promoted as first-class columns (universal across sports); everything else
   in `state jsonb` keyed by sport (`period`, `inning`, `half`, `quarter`,
   `clock`, `possession`, `outs`, `balls`, `strikes`, `sets`, `overtime`,
   `shootout`, `meta`). No sport forces columns on another.
3. **GameEvent** (`game_events`): append-only, never updated or deleted;
   the auditable history and the future feed for realtime/webhooks/AI.

## Event model

Fields: `id` uuid, `organization_id` (tenant), `game_id`, `event_type`,
`event_version` int, `occurred_at`, `recorded_at`, `actor_type`
(`user|scorekeeper|device|integration|system`), `actor_id`, `source_type`
(`venue-app|team-app|scoreboard|integration|cron`), `source_id`,
`correlation_id`, `causation_id`, `idempotency_key` (unique per game),
`payload jsonb`, `metadata jsonb`.

Event types (namespaced, extensible): `game.created`, `game.scheduled`,
`game.field_assigned`, `game.started`, `game.delayed`, `game.resumed`,
`game.suspended`, `game.postponed`, `game.cancelled`, `game.completed`,
`game.archived`, `score.changed`, `period.changed`, `participant.checked_in`,
`official.checked_in`, `weather.alert_created`, `device.connected`,
`device.disconnected`, `stream.started`, `stream.stopped`.

Versioning: `event_version` per event type; consumers tolerate unknown fields;
breaking payload changes bump the version, old versions remain readable forever
(append-only ledger is the contract).

Idempotency: writers supply `idempotency_key` (e.g. scorekeeper `token:seq`,
integration `source:external_event_id`, UI `uuid`). Unique index on
`(game_id, idempotency_key)`; a duplicate insert is swallowed and the write
path returns the existing outcome (at-least-once safe).

## Tenant & authorization boundaries

- Every new row carries `organization_id`; RLS: service-role writes only
  (deny anon/authenticated writes); reads: `game_states` public-read to match
  the sessions public QR surface (scores are public by product design);
  `game_events` **not** public (may carry actor/device detail) — service-role
  only this sprint, selective projections later.
- App-layer: writes require the same permission engine used by sessions today
  (`requirePermission` / capability checks / scorekeeper token+PIN), plus the
  venue-scope checks added 2026-07-13.

## Source-system ownership & external IDs

`external_source` + `external_source_id` on the Game stays the mapping
(already unique-upserted by the Schedule Push API). Rule: the source system
named on the Game owns schedule facts; live state is owned by whichever actor
the venue authorizes (scorekeeper, device adapter, integration) and every
mutation is attributed via the event's `actor_*`/`source_*`.

## API boundaries

Sprint 1: a shared domain service (`src/lib/game-engine/`) consumed in-process
by both apps' server code (team app reads via its existing link projection).
Sprint 2+: `/api/games/*` REST surface for external consumers, fed by the same
service; realtime via Supabase Realtime on `game_events` inserts; webhooks
replay from the ledger (correlation ids already present).

## Migration & rollback strategy

Additive-only migration (see `supabase/migrations/20260713040000_connected_game_engine.sql`
— generated, **not applied**): new columns nullable/defaulted; new tables;
no renames/drops; legacy columns stay authoritative for existing consumers
until Sprint 2 cutover. Rollback = drop the two new tables + new column
(no existing reader depends on them until cutover).

## Observability

Every write through the engine appends an event (who/what/when/source) —
the ledger *is* the audit log. Sprint 2: counts/lag dashboards over
`game_events`, dead-letter review for rejected idempotent replays.

## Future adapter interfaces (design targets, not built)

- **Device adapter:** `pushReading(gameId, reading, {actor, idempotencyKey})`
  → engine validates lifecycle, updates `game_states`, appends `score.changed`/
  `period.changed`. Daktronics readings route becomes the first adapter.
- **Integration adapter:** `upsertScheduledGame(externalRef, payload)` (exists
  as Schedule Push) + `emit(event)` outbound from the ledger.
- **Automation trigger:** subscribe(eventTypePattern, handler) over ledger
  inserts (storm watch auto-response becomes a subscriber).

## Risks & open questions

- Dual-write window (legacy columns + game_states) — mitigated: single write
  path in the domain service does both transactionally (RPC).
- `organization_id` nullable on legacy sessions rows — backfill decision
  deferred; engine writes require it going forward.
- Timezone: stored UTC; venue-local rendering is presentation-layer. A
  `timezone` column on venues is a candidate for Sprint 2.
- league/season as first-class FKs (vs `gdt_*` links) awaits the Data Passport
  work in the team app roadmap.
