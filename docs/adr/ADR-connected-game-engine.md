# ADR: Game becomes the central platform entity (Connected Game Engine)

Status: Accepted · Date: 2026-07-13 · Scope: gameday-venue-os + GameDayTeam (shared Supabase)

## Context

Game-shaped data already flows through every part of GameDay OS: venue field
pages, scoreboards, TV displays, tournaments, scorekeeper links, the Schedule
Push API, Daktronics readings, storm watch, team-app family calendars,
standings, availability, and alert fan-out. Today that flow is point-to-point:
each surface reads the `sessions` table its own way, live state lives in
baseball-specific columns, lifecycle is unconstrained text, and history is a
thin human-readable log that can't drive automations or AI. Every new
integration (GameChanger, streaming, tournament platforms) would otherwise wire
directly to whichever surface it met first, multiplying N×M connections.

## Decision

1. **Game is the central platform entity.** The existing `sessions` table is
   the canonical Game record — extended in place, never duplicated. It already
   holds identity, schedule, tenant, external-source mapping, and the links
   both applications use; a parallel `games` table would create the competing
   platform layer this program forbids.
2. **Three-layer model.** Canonical identity/schedule (`sessions` + constrained
   `lifecycle_status`), current mutable state (`game_live_state`, sport-extensible
   JSONB with universal score columns and optimistic `version`), and immutable
   history (`game_events`, append-only, tenant-aware, idempotent).
3. **Everything connects through the engine.** Devices, integrations,
   scorekeepers, automations, and AI read game truth from the engine and write
   through its single controlled path (validate authorization → lifecycle
   check → transactional state update → event append → idempotency). They do
   not connect to each other. The event ledger is the one contract every
   future consumer (realtime, webhooks, AI workers) builds on.

## Why through the engine, not point-to-point

- **One truth:** a Daktronics reading, a scorekeeper tap, and a GameChanger
  sync all land in the same state row with the same attribution, so the field
  page, the team app, and the AI never disagree.
- **N+M instead of N×M:** each producer/consumer integrates once with the
  engine instead of once per counterpart.
- **Auditability & trust:** append-only events with actor/source/correlation
  make every score and status change explainable — a prerequisite for selling
  to organizations and for the Data Passport's per-recipient sharing.
- **Product guardrails hold:** GameDay Team remains a conductor (no scoring
  UX); scoring stays a platform capability behind authorized surfaces.

## Consequences

- Additive migration only; legacy columns remain a synced projection until
  consumers cut over (Sprint 2+), giving a zero-downtime path and trivial
  rollback (drop new tables/column).
- A dual-write window exists inside the domain service; it is transactional
  (single RPC) so the projections cannot diverge.
- `session_events` remains for existing UI timelines; new writes dual-append
  until those readers migrate to `game_events` projections.
