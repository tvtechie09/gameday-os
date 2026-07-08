# Crossroads Venue Rebuild — Notes

Flagship demo venue **Wintrust Crossroads Sports Complex** (New Lenox, IL) rebuild:
diagnosis + fixes for the "This admin page could not load" error in Venue
Operations, the additive schema needed for the parent-field / play-surface
hierarchy and venue-ops media tables, and a ready-to-run data rebuild with real
scannable QR codes.

Venue id: `a8235a4f-c5bf-4f79-b527-853d15f6ae17`
New standalone org id: `c1000000-0000-4000-a000-000000000001`

---

## ✅ Live database status (read first) — COMPLETED

**The demo data has now been applied to the live Supabase project
`ekkmflksqerdhutqxeii`** by a separate process working directly against the live
DB. Both schema migrations were applied, the corrected seed was executed, two
follow-up consistency fixes were applied, and full validation passed. Details in
§3 and §5 below. Summary of what ran, in order:

1. `supabase/migrations/202606250001_venue_complex_foundation_v1.sql` — applied (additive).
2. `supabase/migrations/202607080001_venue_ops_media_and_field_qr_v1.sql` — applied (additive).
3. `supabase/crossroads-rebuild-seed-corrected.sql` — executed successfully (corrected from the
   original `crossroads-rebuild-seed.sql` draft to match the live schema — see §3).
4. Play-surfaces backfill — populated `public.play_surfaces` (1:1 with every field/surface
   row) and `sessions.play_surface_id` (all 18 sessions linked to their correct play surface).
5. `resources` jsonb/table consistency fix — see §3.
6. Validation — full count + orphan audit, all **PASS** (see §5).

The QR PNGs in `public/qr/crossroads/` were already generated and encode the
deterministic field UUIDs the seed inserts, and now resolve against the seeded
live data once the app is deployed.

---

## 1. Broken links / root cause found & fixed

**Symptom:** Venue Operations admin pages rendered the `admin/error.tsx`
boundary ("This admin page could not load.").

**Root cause:** `src/lib/services/fields.ts` (`getFields`/`getField`) selected
the full complex-venue column set (`parent_field_id`, `layout_role`,
`surface_code`, `zone_id`, …). On any database where the complex-venue
foundation migration had not been applied, Supabase returned an
`undefined_column` / schema-cache error, which was thrown unconditionally and
tripped the error boundary for every venue-ops page that loads fields. This is
the same class of failure the venue-mode service already guards against with
`isOptionalFoundationMissing`.

**Fixes:**
- `src/lib/services/fields.ts` — added `isMissingSchemaError()` and a
  `baseFieldSelect` fallback (original-schema columns only). `getFields`/
  `getField` now try the full select and gracefully fall back instead of
  throwing, so venue-ops pages degrade to a usable state instead of the error
  boundary. Mirrors the existing graceful-degradation pattern.
- `src/app/admin/error.tsx` — now surfaces `error.message`/`digest` and offers
  recovery links to the Operations Center and Admin Overview (was a dead-end).
- `src/components/admin-shell.tsx` — nav cleanup for the venue-ops surface:
  - Renamed the `VENUES` group to `VENUE OPERATIONS` and moved
    **Operations Center** into it (removed the duplicate entry that lived under
    `OPERATIONS`).
  - Renamed **Fields** → **Fields & Surfaces** to reflect the parent-field /
    play-surface hierarchy.
  - Fixed a duplicated pinned nav item: **Public Venue Links** pointed at
    `/admin/pilot-launch` (same href as another item); repointed to
    `/admin/venues`.

TypeScript changes are intentionally limited to columns that already exist in
generated types; new columns/tables are referenced only in SQL so the build
never depends on migration ordering.

---

## 2. Schema changes (additive migration `202607080001`)

All additive; existing data preserved.

**`public.fields`** — new columns:
- `layout_type text` (check: `Full` / `Split` / `Tournament` / `Practice`)
- `age_group text`
- `qr_code_url text`
- `qr_code_slug text` + partial unique index `fields_qr_code_slug_key`

**New tables** (all with `organization_id`/`venue_id`/optional `field_id` FKs,
check constraints, supporting indexes, and RLS matching the existing
`scoreboard_profiles` pattern — public read + permissive insert/update; service
role bypasses RLS for seeding):
- `public.cameras` (fixed / PTZ, stream status)
- `public.audio_systems` (PA / wireless_mic / press_box)
- `public.amenities` (concession, playground, batting_cage, parking, beer_garden, …; optional `sponsor_id`; map coords)
- `public.maintenance_records` (mowing / turf_infill / drainage_check / lining / inspection; scheduled/completed)

The parent-field / play-surface hierarchy itself (`parent_field_id`,
`layout_role`, `surface_code`, `zone_id`, `play_surfaces`, `venue_zones`,
`field_layouts`, `venue_mode_endpoints`) already existed from
`202606250001_venue_complex_foundation_v1.sql`; this migration only adds QR
routing + the media/amenity/maintenance tables.

---

## 3. Data populated by the seed (verified live row counts)

Applied to venue `a8235a4f-…` under the new standalone org. The seed first
deletes the broken `Crossroads Field` (`66954416-…`) and its scoreboard
(`db3e0e75-…`), unlinks the venue from any prior org, and clears all
Crossroads-owned rows so it is fully re-runnable.

### Corrections to the original seed script

The original `crossroads-rebuild-seed.sql` draft assumed schema details that
didn't match the live database. These were corrected in
`crossroads-rebuild-seed-corrected.sql`, which is the script that was executed:

- `organizations` only has `id`/`name`/`slug`/`logo_url`/`created_at` (no
  `color`/`website`/`description` columns) — those fields were removed from the insert.
- The scoreboard table is `scoreboards`, not `scoreboard_profiles`, with columns
  `controller`, `connection_type`, `status` (enum: `Installed`/`Not Installed`/`Planned`),
  and `integration_status` (enum: `Not Connected`/`Connected`/`Future Integration`) —
  rewritten to match.
- `sponsor_assignments` requires `field_id` OR `session_id` to be non-null
  (constraint `sponsor_assignments_target_check`) — venue-tier sponsor placements
  were pinned to Field 1 (the marquee field) to satisfy this.
- `fields.status` check constraint requires exact casing: `Ready` / `Maintenance` /
  `Weather hold` (not lowercase).
- `sessions.status` check constraint allows only `scheduled` / `active` / `final`;
  the weather-hold game on Field 3 uses `status='scheduled'` with
  `game_status='delayed'` to satisfy both constraints while reflecting the real state.
- `sponsors` insert now also sets `package_level`, `display_priority`, `is_active`
  (previously omitted; defaults were fine but explicit values are clearer).

### Play surfaces / session linkage (found and fixed as a follow-up gap)

`public.play_surfaces`, `public.venue_zones`, `public.field_layouts`, and
`public.field_layout_surfaces` are a newer schema layer (migration
`202606250001`) actively read by `src/lib/services/venue-mode.ts` for the app's
"Venue Mode" kiosk/display feature. They were empty database-wide (not just for
Crossroads) after the initial seed. Populated as a follow-up:

- 31 `play_surfaces` rows (1 per field/surface row: 9 parents + 22 children),
  mirroring each field's status (mapped to the play_surfaces status vocabulary:
  `Ready`→`open`, `Maintenance`→`maintenance`, `Weather hold`→`delayed`),
  `layout_role`, sport type, and map coordinates.
- Backfilled `sessions.play_surface_id` on all 18 seeded sessions to point at the
  `play_surfaces` row matching each session's `field_id`.
- Note: `venue_zones` and `field_layouts`/`field_layout_surfaces` remain empty —
  these are an optional grouping/zone layer above play_surfaces that
  `getVenueModeData` gracefully falls back on (`buildFallbackPlaySurfaces`) when
  absent, so this does not block Venue Mode or any admin page. Populating them
  would be a reasonable future enhancement (see §6), not a current-spec requirement.

### Resources jsonb / table consistency (fixed)

The `fields.resources` jsonb summary listed 5 items per parent field while the
`public.resources` table only had 4 matching rows (missing "Portable Mound", plus
naming mismatches like "Bases" vs "Base Set"). Fixed by adding the missing
resource row per parent field (9 rows added, total resources now **45**) and
aligning the jsonb summary naming to match the table exactly.

### Verified live row counts (via direct SQL against `ekkmflksqerdhutqxeii`)

| Entity | Count | Notes |
| --- | --- | --- |
| Organization | 1 | "Wintrust Crossroads Sports Complex" (navy `#1B2A4A` / gold `#C9A24B`), standalone |
| Venue | 1 | 520 Cedar Crossings Dr, New Lenox, IL 60451; 1,300 parking; status **Live** |
| Parent fields | 9 | Fields 1–6 baseball, 7–9 softball; 3×3 map grid; layout_type `Full` |
| Youth surfaces | 22 | Fields 1–4 → A/B/C, Fields 5–9 → A/B; age groups 11U-12U / 9U-10U / 6U-8U |
| — layout coverage | | 1A = `Tournament`, 9B = `Practice`, rest `Split` (all 4 types demonstrated) |
| Play surfaces | 31 | 1:1 with fields (9 parents + 22 children); `sessions.play_surface_id` backfilled |
| Tournament | 1 | "New Lenox Summer Classic" 2026-07-11/12 |
| Sessions | 18 | Sat 2026-07-11: all linked to correct `field_id` and `play_surface_id` (incl. Field 3 weather hold) |
| Alerts | 5 | venue-wide (parking, heat) + field (weather hold, maintenance, championship, …) |
| Sponsors | 6 | Wintrust (title), Pepsi & Coors Light (gold), Silver Cross & Scheels (silver), NuMark (bronze) — tier in description |
| Sponsor assignments | 6 | 2 venue placements + 4 field placements |
| Amenities | 8 | Welcome center, 2 concessions, Pepsi Play Area + Coors Chill Zone (sponsor-linked), 2 batting cages, parking |
| Scoreboards | 9 | Daktronics All Sport 5000 per parent field; Fields 1–3 network/active |
| Cameras | 6 | 3 fixed common-area + 3 PTZ marquee-field broadcast |
| Audio systems | 10 | PA per parent field + 1 venue-wide announcement system |
| Resources | 45 | 5 equipment records per parent field (jsonb summary aligned to table — see above) |
| Maintenance records | 6 | Field 8 turf infill in progress, pre-tournament inspections, scheduled follow-ups |

### Field status distribution
- **Field 3** = `delayed` (weather hold, tied to a field alert + follow-up drainage maintenance)
- **Field 8** = `maintenance` (turf infill; alert + in-progress maintenance record; resources marked maintenance)
- All other fields/surfaces = `open`

---

## 4. QR codes

- **Route:** the real public field page is `/fields/{fieldId}` (by UUID) —
  there is no slug route. To make QR codes encode a real, resolvable URL, the
  seed assigns **deterministic field UUIDs** (parents
  `c4a00000-…-0000000000{N}`; children `c4b0000{N}-…-0000000000{K}`), and each
  field's `qr_code_url` is set to `https://gameday-os.vercel.app/fields/{uuid}`.
- **PNGs:** 31 generated at `public/qr/crossroads/{slug}.png` (512px, navy on
  white, error-correction M) via `scripts/generate-crossroads-qr.mjs`
  (re-runnable; honors `CROSSROADS_BASE_URL`).
- **Decode validation:** verified with `jsqr` — samples decode to the exact
  seeded UUID URLs:
  - `crossroads-field-1.png`  → `…/fields/c4a00000-0000-4000-a000-000000000001`
  - `crossroads-field-1a.png` → `…/fields/c4b00001-0000-4000-a000-000000000001`
  - `crossroads-field-9b.png` → `…/fields/c4b00009-0000-4000-a000-000000000002`
  - `crossroads-field-5.png`  → `…/fields/c4a00000-0000-4000-a000-000000000005`

---

## 5. Validation

- `npx tsc --noEmit` — **pass**
- `npm run lint` (eslint) — **pass**
- `npm test` — **not run**: the `test` script uses
  `node --test --experimental-strip-types`, which requires Node ≥ 22.6; this
  environment is Node 20.20. Pre-existing tooling mismatch, unrelated to these
  changes (no tests were added or modified).
- QR decode — **pass** (see §4).
- Live DB counts / orphan audit — **PASS** (run directly against `ekkmflksqerdhutqxeii`):
  - Zero orphaned records across every checked relation: `fields.parent_field_id`,
    `sessions.field_id`, `alerts.field_id`, `resources.field_id`, `scoreboards.field_id`,
    `cameras.field_id`, `audio_systems.field_id`, `maintenance_records.field_id`,
    `sponsor_assignments` (field/venue mismatch), `alerts` (org mismatch),
    `play_surfaces.field_id`, and `sessions.play_surface_id` vs `field_id`.
  - All 31 fields have a corresponding `play_surfaces` row; all 18 sessions have
    `play_surface_id` correctly set matching their `field_id`.
  - QR integrity: 0 missing QR codes, 0 duplicate slugs, 0 URL pattern mismatches
    across all 31 fields.
  - 3 sampled QR codes (Field 1, Field 1A, Field 9B) decoded via `pyzbar` and
    confirmed to route to the exact correct field UUID's public URL.
  - Illinois Celtics org confirmed untouched and still exists independently.
  - All 4 layout types (Full/Split/Tournament/Practice) present across the field set.
- Live spot-check on production (gameday-os.vercel.app, pre-merge — data layer only):
  - `/fields/c4a00000-0000-4000-a000-000000000001` (Field 1) renders correctly,
    publicly, with live scoreboard data (Homer Glen Hawks 10U 2, Lockport Lightning
    12U 1, LIVE NOW), correct venue name, sport type, status, and upcoming sessions.
  - `/venues/a8235a4f-c5bf-4f79-b527-853d15f6ae17` (Crossroads) renders correctly,
    publicly, listing all fields with correct statuses (OPEN/MAINTENANCE) and current
    sessions per field.
- Admin UI/UX fixes (§1) validated via Vercel preview build success (tsc pass, eslint
  pass). The preview URL itself is gated by Vercel Deployment Protection (SSO wall),
  which prevented direct browser click-through of admin routes pre-merge; merge PR #4
  to main to verify admin routes on the unprotected production URL, or temporarily
  disable preview deployment protection.

---

## 6. Remaining / follow-up

The migrations, seed, backfills, and validation are all **done** (see §5). The
items below are optional enhancements and known minor gaps — **none are blockers**:

1. Confirm `NEXT_PUBLIC_APP_URL` on the deployment matches the QR base
   (`https://gameday-os.vercel.app`); regenerate PNGs with `CROSSROADS_BASE_URL`
   if the public host differs.
2. Optional: regenerate `src/lib/supabase/types.ts` from the live schema after
   the migration so the new columns/tables are typed and can be surfaced in the
   admin UI (kept out of TS here to avoid coupling the build to migration order).
3. `venue_zones` / `field_layouts` / `field_layout_surfaces` remain empty — an
   optional zone-grouping layer above `play_surfaces`; the app degrades gracefully
   without them (`buildFallbackPlaySurfaces`). Populating them is a reasonable
   future enhancement if the "Venue Mode" kiosk display becomes a priority.
4. QR code *images* are not rendered inline on the public field page — only the
   shareable URL text is shown. This matches existing app behavior (not a
   regression) and was not identified as a defect during validation.
5. Admin routes could not be click-through-verified pre-merge due to Vercel
   preview Deployment Protection (SSO wall); verify on production after merging
   PR #4, or temporarily disable preview deployment protection.
