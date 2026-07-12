# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GameDay OS ("Connected Venue Operating System") — a venue-first Next.js App Router app for
sports complexes: field pages via QR entry, scoreboards, sponsors, alerts, media routing, and
venue operations. The flagship demo venue is Wintrust Crossroads Sports Complex
(`/demo/crossroads/*` and `/venue/crossroads/*` routes). No real vendor APIs (Daktronics,
GameChanger, Cisco, etc.) are called — all integrations are simulated/provider-ready placeholders.

## Commands

- `npm run dev` — dev server (Next.js with `--webpack`)
- `npm run build` / `npm start`
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — runs all tests via `node --test --experimental-strip-types tests/*.test.ts`
- Single test: `node --test --experimental-strip-types tests/media-engine.test.ts`

Tests are plain `node:test` TypeScript files in `tests/` — no Jest/Vitest.

## Architecture

- **Next.js App Router** in `src/app/` (`admin`, `api`, `demo`, `display`, `fields`,
  `scoreboard`, `venue`, `venues`, `login`). Supabase (`@supabase/ssr`) backs auth and data;
  `middleware.ts` guards only `/admin/*` routes and redirects unauthenticated users to `/login`.
- **Domain logic lives in `src/lib/`**, not in routes: `media-engine.ts`, `game-state-engine.ts`,
  `scoreboard-feed.ts`, `automation-engine.ts`, `integration-framework.ts`,
  `identity-permissions-matrix.ts`, `venue-mode-helpers.ts`, shared `types.ts`.
- **Venue hierarchy** (core data model): Organization → Venue → Zone → Parent Field →
  Field Layout → Play Surface → Session. Permissions are scoped to venue / parent field /
  play surface / session roles (see `docs/permissions-matrix.md`).
- **Demo content is data-driven** in `src/lib/demo/` (e.g. `crossroads.ts` for map hotspots,
  `crossroads-presentation.ts` for the guided tour scenes). Adjust demo data there, not in
  routes/components. Generic presentation primitives: `src/lib/demo/presentation.ts`,
  `src/components/demo/presentation-mode.tsx`.
- **Supabase schema** in `supabase/schema.sql` plus timestamped SQL files in
  `supabase/migrations/`; demo seed data in `supabase/crossroads-demo-seed.sql`.

## Docs worth reading first

`docs/gameday-os-product-architecture.md`, `docs/crossroads-venue-model.md`,
`docs/permissions-access-control.md`, and `docs/gameday-team-venue-integration-blueprint.md`
(integration with the sibling gameday-team-os repo).
