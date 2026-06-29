# GameDay OS

Venue-first operating system for sports fields, venue operations, QR-accessible field pages, scoreboards, sponsors, resources, alerts, and complex venue workflows.

## Crossroads Demo

The flagship demo venue is **Wintrust Crossroads Sports Complex** in New Lenox, IL.

The demo is built on the long-term GameDay Venue hierarchy:

Organization -> Venue -> Zone -> Parent Field -> Field Layout -> Play Surface -> Session

It includes:

- 9 parent fields.
- 22 youth play surface configurations.
- A/B/C subfields such as 3A, 4C, and 6B.
- North Lot, West/Southwest Lot, and South Lot.
- Main Gate, Beer Garden, north/south concessions, north/east batting cages.
- Championship Field, Chill Zone / hospitality building, playground / family area, main concourse, and picnic/seating areas.
- Storm water ponds as non-navigable landmarks.
- Demo games across full fields and subfields.
- Family Mode, Tournament Mode, and Venue Operations Mode.
- Provider-ready equipment placeholders for scoreboards, speakers, camera/security, network, and lights.

No Daktronics, Cisco, Meraki, Cisco Spaces, Axis, or other real vendor APIs are called.

### Demo Map Asset

The Crossroads map is stored at:

`public/demo/crossroads-map.png`

The hotspot configuration is data-driven in:

`src/lib/demo/crossroads.ts`

Coordinates can be adjusted there without changing the route/components.

Lightweight media support is data-driven:

- `crossroadsVenue.heroImageUrl`
- optional `CrossroadsHotspot.imageUrl`
- optional `CrossroadsField.imageUrl`

These image slots are for the venue hero, single POI previews, and single field previews only. Full photo galleries should stay on marketing/demo pages, not inside the operations app shell.

### Demo Routes

Venue Mode:

- `/venue/crossroads`

Demo modes:

- `/venue/crossroads/family`
- `/venue/crossroads/tournament`
- `/venue/crossroads/operations`
- `/demo/crossroads/presentation`

QR-style entry routes:

- `/venue/crossroads`
- `/venue/crossroads/field/6`
- `/venue/crossroads/surface/6B`
- `/venue/crossroads/parking/south-lot`
- `/venue/crossroads/concession/north`
- `/venue/crossroads/concession/south`

### Presentation Mode

Open:

`/demo/crossroads/presentation`

Recommended demo path:

1. Open `/venue/crossroads`.
2. Click **Start Crossroads Tour** in the hero section.
3. Keep the scenario set to **Normal Tournament Day** for scenes 1-7.
4. Switch to **Weather Delay** for scene 8.
5. Use scene 9 to show recovery and all-clear.
6. End with scene 10, **Future Vision panel**.

Presentation Mode is a guided Crossroads Experience Center tour for the Crossroads GM, Village leadership, investors, and future venue partners.

It walks through:

1. Welcome to Wintrust Crossroads powered by GameDay OS
2. Family arrival
3. Parent parked in South Lot navigating to Field 6B
4. Family live game, schedule, weather, concessions, restrooms, and playground
5. Team/scorekeeper view for Field 6B
6. Tournament Director dashboard
7. Venue Operations dashboard
8. Simulated Weather Delay
9. Recovery and all-clear
10. Future Vision panel

Presenter controls include:

- Next scene
- Previous scene
- Restart tour
- Jump to scene
- Scenario toggle

Scenarios:

- Normal Tournament Day
- Weather Delay
- Championship Sunday

### Recommended 10-Minute Demo Script

Use `/demo/crossroads/presentation`.

1. **Welcome** - 45 seconds  
   Explain that GameDay OS makes the venue the shared operating layer for families, teams, tournament staff, and venue leadership.

2. **Family arrival** - 60 seconds  
   Show how a family scans a venue QR, sees parking, finds the main gate, and understands the complex without asking staff.

3. **South Lot to Field 6B** - 60 seconds  
   Show the family path from South Lot to Field 6B and explain that 6B is a play surface under Field 6, not a one-off page.

4. **Live family page** - 75 seconds  
   Point out current game, score/status, schedule, concessions, restrooms, playground, and weather awareness.

5. **Scorekeeper view** - 60 seconds  
   Show manual score entry as a scoped, temporary game-day workflow. Emphasize that it does not grant venue control.

6. **Tournament dashboard** - 75 seconds  
   Show live fields, delayed fields, behind-schedule games, and readiness checks for teams, umpires, scorekeepers, scoreboards, and fields.

7. **Venue operations dashboard** - 75 seconds  
   Show complex health, announcements, weather/emergency workflow, and provider-ready equipment placeholders.

8. **Weather Delay scenario** - 90 seconds  
   Toggle **Weather Delay**. Show Field 4/6B delay state, family alert, tournament impact, and venue announcement workflow.

9. **Recovery** - 45 seconds  
   Show all-clear/recovery: fields return to live or scheduled state and the operating record stays consistent.

10. **Future Vision** - 75 seconds  
    Close with the Current vs Future section. Be explicit: Cisco Meraki, Cisco Spaces, Daktronics, security camera, PA/audio, weather automation, and other vendor integrations are future targets only and are not live in this demo.

The scene model is reusable and configured in:

`src/lib/demo/crossroads-presentation.ts`

The generic presentation and future-vision primitives live in:

- `src/lib/demo/presentation.ts`
- `src/components/demo/presentation-mode.tsx`
- `src/components/demo/future-vision-panel.tsx`

### Current vs Future Clarity

Demo-only today:

- Guided presentation flow
- Simulated weather delay
- Simulated announcement state
- Simulated equipment online/offline placeholders
- Sample youth sports schedules and readiness states

Platform-ready foundation:

- Venue, field, play surface, and session hierarchy
- Venue Mode map/hotspot model
- QR-style entry routes
- Operations alerts and status concepts
- Manual scoreboard concepts
- Provider-ready equipment endpoint records
- Scoped permission model for venue, parent field, play surface, and session roles

Future roadmap:

- Physical scoreboard integration
- PA/audio announcement integration
- Digital signage automation
- Weather automation
- Emergency communication override workflows
- Equipment health monitoring
- AI operations assistant
- Parent/family mobile app

Partner/vendor approval required:

- Cisco Meraki presence analytics
- Cisco Spaces wayfinding
- Security camera awareness integrations
- Daktronics/scoreboard hardware integrations
- Tournament app integrations that require partner access or API approval

The UI intentionally does not imply these vendor integrations are live.

### Supabase Seed

To seed the Crossroads demo into Supabase, run:

`supabase/crossroads-demo-seed.sql`

Recommended options:

- Paste the SQL into the Supabase SQL editor for the target project.
- Or run it with your preferred authenticated Postgres/Supabase SQL workflow.

The seed creates or updates:

- `Crossroads Demo Organization`
- `Wintrust Crossroads Sports Complex`
- venue zones
- Fields 1 through 9
- split field layouts
- play surfaces such as 1A, 2D, 3C, 4C, and 6B
- demo sessions attached to play surfaces
- provider-ready Venue Mode endpoint placeholders

The seed is additive and uses stable UUIDs for core demo records.

### Environment Variables

The existing app environment still applies:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

`NEXT_PUBLIC_APP_URL` should be set for deployed QR/demo links. If omitted, local links fall back to localhost in existing public URL helpers.

### Tests

Run:

```bash
npm test
npm run lint
npm run build
```

Crossroads-specific tests verify:

- demo venue data loads
- 9 fields and 22 subfields exist
- schedule attaches to subfield 6B
- Venue Mode map/hotspot context exists
- Family Mode resolves South Lot and Field 6B
- Tournament Mode shows delayed/behind games
- Venue Operations Mode shows equipment placeholders
- Presentation scenes exist in order
- Presentation scenarios update isolated demo state
- Future Vision separates foundation-ready, future, and partner/vendor items
