# Crossroads Venue Rebuild — Notes

Flagship demo venue **Wintrust Crossroads Sports Complex** (New Lenox, IL) rebuild:
diagnosis + fixes for the "This admin page could not load" error in Venue
Operations, the additive schema needed for the parent-field / play-surface
hierarchy and venue-ops media tables, and a ready-to-run data rebuild with real
scannable QR codes.

Venue id: `a8235a4f-c5bf-4f79-b527-853d15f6ae17`
New standalone org id: `c1000000-0000-4000-a000-000000000001`

---

## ⚠️ Live database status (read first)

**The demo data was NOT applied to the live Supabase project from this
environment** — this sandbox has no Supabase credentials, connector, or network
access to `ekkmflksqerdhutqxeii`. Everything required to apply it is committed
and ready to run:

1. `supabase/migrations/202607080001_venue_ops_media_and_field_qr_v1.sql` — apply first (additive).
2. `supabase/crossroads-rebuild-seed.sql` — run against the live DB (service role / SQL editor). Idempotent & re-runnable.
3. `supabase/crossroads-validation.sql` — run last to confirm counts + zero orphans.

The QR PNGs in `public/qr/crossroads/` are already generated and encode the
deterministic field UUIDs the seed inserts, so they will resolve as soon as the
seed is applied and the app is deployed.

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

## 3. Data populated by the seed (expected row counts)

Applied to venue `a8235a4f-…` under the new standalone org. The seed first
deletes the broken `Crossroads Field` (`66954416-…`) and its scoreboard
(`db3e0e75-…`), unlinks the venue from any prior org, and clears all
Crossroads-owned rows so it is fully re-runnable.

| Entity | Count | Notes |
| --- | --- | --- |
| Organization | 1 | "Wintrust Crossroads Sports Complex" (navy `#1B2A4A` / gold `#C9A24B`), standalone |
| Venue | 1 | 520 Cedar Crossings Dr, New Lenox, IL 60451; 1,300 parking; status **Live** |
| Parent fields | 9 | Fields 1–6 baseball, 7–9 softball; 3×3 map grid; layout_type `Full` |
| Youth surfaces | 22 | Fields 1–4 → A/B/C, Fields 5–9 → A/B; age groups 11U-12U / 9U-10U / 6U-8U |
| — layout coverage | | 1A = `Tournament`, 9B = `Practice`, rest `Split` (all 4 types demonstrated) |
| Tournament | 1 | "New Lenox Summer Classic" 2026-07-11/12 |
| Sessions | 18 | Sat 2026-07-11: 4 final, 5 active, 9 scheduled (incl. Field 3 weather hold) |
| Alerts | 6 | 2 venue-wide (parking, heat), 4 field (weather hold, maintenance, championship, …) |
| Sponsors | 6 | Wintrust (title), Pepsi & Coors Light (gold), Silver Cross & Scheels (silver), NuMark (bronze) — tier in description |
| Sponsor assignments | 6 | 2 venue placements + 4 field placements |
| Amenities | 8 | Welcome center, 2 concessions, Pepsi Play Area + Coors Chill Zone (sponsor-linked), 2 batting cages, parking |
| Scoreboards | 9 | Daktronics All Sport 5000 per parent field; Fields 1–3 network/active |
| Cameras | 6 | 3 fixed common-area + 3 PTZ marquee-field broadcast |
| Audio systems | 10 | PA per parent field + 1 venue-wide announcement system |
| Resources | 36 | 4 equipment records per parent field |
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
- Live DB counts / orphan audit — **pending** (run `supabase/crossroads-validation.sql`
  after applying the seed; every orphan check is written to return 0 rows).

---

## 6. Remaining / follow-up

1. Apply migration `202607080001`, then `crossroads-rebuild-seed.sql`, then
   `crossroads-validation.sql` against the live project (requires Supabase
   access not available in this environment).
2. Confirm `NEXT_PUBLIC_APP_URL` on the deployment matches the QR base
   (`https://gameday-os.vercel.app`); regenerate PNGs with `CROSSROADS_BASE_URL`
   if the public host differs.
3. Optional: regenerate `src/lib/supabase/types.ts` from the live schema after
   the migration so the new columns/tables are typed and can be surfaced in the
   admin UI (kept out of TS here to avoid coupling the build to migration order).
