# Connected Game Engine — Sprint 1 Report

Date: 2026-07-13 · Branch: `feature/connected-game-engine-foundation` (NOT merged to main)

## 1. Repository & environment verification

- Repo: `gameday-venue-os` at `~/Documents/gameday-venue-os` · remote `github.com/tvtechie09/gameday-os`
- Branch at start: `main`, worktree clean (one build artifact, `tsconfig.tsbuildinfo`)
- Vercel: team `gamedayos`, project `gameday-os` → gameday-os.vercel.app (prod deploys from `main` only — this branch does not deploy production)
- Supabase: shared project `ekkmflksqerdhutqxeii` (verified via MCP throughout the session; both apps confirmed on it)
- Framework: Next.js (App Router) + React latest, `@supabase/ssr`; migrations: timestamped SQL in `supabase/migrations/`; tests: `node --test --experimental-strip-types tests/*.test.ts`
- **Correct home: yes** — this repo owns venues, fields, sessions, scoreboards, devices; the team app consumes games via `gdt_*` link columns.

## 2. Audit findings

See `docs/architecture/connected-game-engine-audit.md`. Headline: `sessions` is
already the canonical Game; `session_events` is a thin log; live state is
baseball-specific inline columns; status is unconstrained text; the Schedule
Push API already implements external-ID idempotent upsert; the team app is a
read-only consumer; `scoreboards` is an orphan (do not build on it).

## 3. Architecture decisions

See `docs/architecture/connected-game-engine.md` and
`docs/adr/ADR-connected-game-engine.md`. Core: extend `sessions` (never
duplicate it), three layers (Game / GameState / GameEvent), constrained
12-state lifecycle with a synced 3-state legacy projection, sport-extensible
JSONB live state with universal score columns, append-only tenant-aware
idempotent ledger, one transactional write path (`game_engine_apply` RPC),
graceful degradation until the migration is applied.

## 4. Files changed (all on the feature branch)

- `docs/architecture/connected-game-engine-audit.md` (new)
- `docs/architecture/connected-game-engine.md` (new)
- `docs/adr/ADR-connected-game-engine.md` (new)
- `supabase/migrations/20260713040000_connected_game_engine.sql` (new — generated, **not applied**)
- `supabase/connected-game-engine-seed.sql` (new — **not applied**; references existing venues, no duplicates)
- `src/lib/game-engine/game-lifecycle.ts` (new, pure)
- `src/lib/game-engine/game-events.ts` (new, pure)
- `src/lib/game-engine/game-service.ts` (new — reads + controlled write path)
- `src/lib/supabase/types.ts` (additive: game_live_state/game_events/RPC types)
- `src/lib/services/venue-operations.ts` (first read-path consumer: `/today` game list served via `listGamesForVenue`, single-batch load preserved)
- `tests/game-engine.test.ts` (new, 13 tests)
- `docs/reports/connected-game-engine-sprint-1.md` (this file)

## 5. Migration safety (Step 9)

1. **Filename:** `supabase/migrations/20260713040000_connected_game_engine.sql`
2. **Adds:** `sessions.lifecycle_status` (text, default `'scheduled'`, CHECK on
   12 values, backfilled from legacy status); tables `game_live_state`,
   `game_events`; function `game_engine_apply`
3. **RLS:** enabled on both new tables; `game_live_state` public SELECT (matches
   sessions' public QR posture — scores are public product surface);
   `game_events` NO policies (service-role only); RPC revoked from
   public/anon/authenticated
4. **Indexes/constraints:** `game_events_idempotency_unique (game_id, idempotency_key)`;
   `game_events_game_time_idx`, `game_events_org_time_idx`, `game_events_type_idx`;
   `game_live_state_org_idx`; partial unique `sessions_external_source_unique
   (external_source, external_source_id)`; FK cascade from both tables to sessions
5. **Backfill:** lifecycle_status backfilled in-migration from `game_status`/`status`.
   No other backfill required (game_live_state/game_events start empty; legacy
   columns remain authoritative until Sprint 2 cutover)
   **Migration-review finding (2026-07-13):** an orphan `game_states` table
   already existed in the DB (0 rows, no code refs, DB drift — a batting-order
   scoreboard prototype). To honor "no rename/drop of existing tables," the
   engine's current-state table was renamed `game_states → game_live_state`.
   Orphan `game_states` cleanup (RLS + drop) is a Sprint-2 item.
6. **Compatibility impact:** additive only; zero existing query changes.
   **Live pre-checks run against production (read-only, 2026-07-13):**
   duplicate `(external_source, external_source_id)` pairs = **0** (index safe);
   `game_events`/`lifecycle_status`/`game_engine_apply` do **not** exist
   (no collision); `game_live_state` does not exist. One pre-check remains
   mandatory at apply time in case new rows land between now and then —
   `sessions_external_source_unique` will FAIL if duplicate pairs exist:
   ```sql
   select external_source, external_source_id, count(*) from sessions
   where external_source is not null and external_source_id is not null
   group by 1,2 having count(*) > 1;
   ```
   (Must return 0 rows; dedupe manually if not.)
7. **Rollback:**
   ```sql
   drop function if exists public.game_engine_apply;
   drop table if exists public.game_events;
   drop table if exists public.game_live_state;
   alter table public.sessions drop constraint if exists sessions_lifecycle_status_check;
   alter table public.sessions drop column if exists lifecycle_status;
   drop index if exists sessions_external_source_unique;
   ```
   Safe at any point before Sprint 2 cutover (no reader depends on the new
   objects; the service degrades gracefully in their absence — verified).
8. **Post-apply verification SQL:**
   ```sql
   select count(*) from sessions where lifecycle_status not in
     ('draft','scheduled','check_in','warmup','ready','live','delayed','suspended','postponed','cancelled','final','archived'); -- 0
   select relrowsecurity from pg_class where relname in ('game_live_state','game_events'); -- t, t
   select count(*) from pg_policies where tablename = 'game_events'; -- 0
   select count(*) from pg_policies where tablename = 'game_live_state'; -- 1
   select proname from pg_proc where proname = 'game_engine_apply'; -- 1 row
   select lifecycle_status, status, count(*) from sessions group by 1,2 order by 3 desc; -- sanity: mapping
   ```
9. **Manual approval required:** yes — Kyle reviews this report + the duplicate
   pre-check before the migration is applied (per critical working rules).

## 6. Tests run & results

- `npm run typecheck` ✓ clean · `npm run lint` ✓ clean
- `npm test` → **137/137 pass** (13 new in `tests/game-engine.test.ts`)
- New coverage: lifecycle happy paths, prohibited transitions (incl. terminal
  states and self-loops), weather delay/suspend flows, full legacy-mapping
  coverage, event-type mapping, deterministic idempotency keys, event
  normalization, and migration-contract pins (RLS on both tables, non-public
  ledger, locked-down RPC, tenant column, idempotency + external-ID uniqueness,
  additive-only guarantee)
- Compatibility: full existing suite green; `/today` verified rendering
  identically through the new engine read path on the local dev server
  (real venue + games, logged in as platform admin)
- Not testable pre-migration (documented): live RLS behavior, RPC transaction
  semantics, duplicate-idempotency-key replay against the DB → Sprint 2
  staging verification checklist below

## 7. Security & compatibility concerns

- `game_events` may carry actor/device identifiers → deliberately NOT public.
- RPC is SECURITY DEFINER → revoked from all client roles; service-role only.
- `organization_id` remains nullable on legacy sessions rows; engine writes
  populate it. Backfill decision open (below).
- Dual-write window (legacy columns + game_live_state) is inside one RPC
  transaction — projections cannot diverge.

## 8. Unresolved questions

1. Backfill `sessions.organization_id` for legacy rows (needed before
   org-scoped RLS can tighten)?
2. Venue `timezone` column (games render venue-local) — Sprint 2?
3. When do `session_events` readers migrate to `game_events` projections?
4. `competition_type` as a real column once a second value exists (league vs
   tournament vs friendly)?

## 9. Recommended Sprint 2

0. Clean up the orphan `game_states` table (enable RLS, then drop) — same
   treatment the orphan `scoreboards` table got; it's DB drift with no owner.
1. Kyle reviews + applies the migration to staging → run verification SQL →
   apply seed → verify → apply to production.
2. Cut the scorekeeper write path (`/api/score/[token]`) over to
   `game_engine_apply` with `scorekeeper:token:seq` idempotency keys — the
   highest-volume producer becomes the first full engine writer.
3. Route Today quick actions' Start/Delay through `transitionGameLifecycle`.
4. Daktronics readings route becomes the first device adapter.
5. Supabase Realtime channel on `game_events` inserts → live field pages.
6. Team-app `getLinkedVenueGames` reads `game_live_state` for scores.

## 10. Deployment sequence (when approved)

1. Merge branch → main **without** applying migration (code degrades gracefully; verified).
2. Run duplicate pre-check SQL → resolve any dupes.
3. Apply migration to the shared Supabase project (staging env vars first if desired — note: single shared DB).
4. Run post-apply verification SQL (section 5.8).
5. Apply `connected-game-engine-seed.sql` (dev/staging only).
6. Smoke: `/today`, a field QR page, `/score/[token]` pad, schedule push API.
7. Manual checklist: create a game in admin → appears on field page; transition
   scheduled→live via engine → `game_events` row exists with correct actor;
   replay same idempotency key → no duplicate event; wrong transition
   (final→live) → rejected; team-app family calendar still lists linked games.
