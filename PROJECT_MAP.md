# GameDayOS Project Map

This is the canonical source of truth for how GameDayOS's repos, Vercel projects, local folders, and Supabase resources relate to each other. Check this file first before assuming which repo owns a feature, route, or bug.

## Repo shape (decided, approved)

There are **2 deployed apps**. Not 4, not merged into 1. Each app maps to a "pillar" identity:

| Pillar | Repo | Vercel Project | Live URL | Status |
|---|---|---|---|---|
| GameDay Team | [`tvtechie09/GameDayTeam`](https://github.com/tvtechie09/GameDayTeam) (private) | `game-day-team` | https://game-day-team.vercel.app | Primary app — sibling repo |
| GameDay Community | folded into `GameDayTeam` | — | — | Feature area (Family dashboard), not a separate app |
| GameDay Venue | [`tvtechie09/gameday-os`](https://github.com/tvtechie09/gameday-os) (public) | `gameday-os` | https://gameday-os.vercel.app | Primary app — **this repo** |
| GameDay Tournament | folded into `gameday-os` | — | — | Feature area, not a separate app |

Both Vercel projects live under the same Vercel team (`gamedayos`, "Kyle's projects").

## Local folder mapping

| Local folder | Maps to repo |
|---|---|
| `/Users/kmcgraw/Documents/DiamondOS` | `tvtechie09/GameDayTeam` (check `git remote -v` to confirm current checkout — this folder has historically tracked feature branches, not always `main`) |
| (separate clone, confirm path locally) | `tvtechie09/gameday-os` (this repo) |

If you're not sure which repo a local folder tracks, run:
```sh
git remote -v
git branch --show-current
```

## Shared Supabase project

Both apps point at the **same** Supabase project: `ekkmflksqerdhutqxeii` (GameDayOS).

- Schemas are currently **not unified**: `GameDayTeam` owns `gdt_`-prefixed tables (24 tables); this repo (`gameday-os`) owns a parallel non-prefixed set (`organizations`, `venues`, `fields`, `sessions`, `tournaments`, `sponsors`, `alerts`, `resources`, `role_assignments`, etc.).
- A shared **platform identity layer** was added via migration `platform_identity_v1` (applied July 7, 2026): `tenants`, `users`, `roles`, `permissions`, `role_permissions`, `tenant_memberships`, `user_role_assignments`, `identity_invites`, `identity_access_requests`, `identity_approvals`, `audit_logs`. This is meant to be shared library code + shared schema imported by both apps — **not** a third deployed service. Only extract a dedicated platform API/SDK once a real third consumer exists.

## Before starting any bug fix or feature work

1. **Reproduce the bug live first** (note which `.vercel.app` URL it's on).
2. **Confirm the repo** by grepping for the exact error string or route path across both repos — do not assume based on which repo "sounds right."
3. **Check this file** for the pillar/repo/Vercel mapping before touching code.
4. If the mapping in this file is ever wrong or incomplete, update it as part of your PR.

## Related docs

- `docs/gameday-platform-architecture-v1.md` (in `GameDayTeam`)
- `docs/shared-platform-architecture.md` (in `GameDayTeam`)
- `gameday_os_shared_core_design.md` (Perplexity Space: GameDay OS) — full platform architecture vision, migration history, and naming rationale.

_Last updated: July 8, 2026._
