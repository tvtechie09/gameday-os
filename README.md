# GameDay OS

Venue-first operating system for sports fields, venue operations, QR-accessible field pages, scoreboards, sponsors, resources, alerts, and complex venue workflows.

## Crossroads Experience Center

The flagship demo venue is **Wintrust Crossroads Sports Complex** in New Lenox, IL.

Positioning: **GameDay OS is the Connected Venue Operating System.**

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
- Crossroads Today, Family Experience, Tournament Operations, Operations Center, Staff Mode, TV Dashboard, and Media Engine.
- Provider-ready equipment placeholders for scoreboards, speakers, camera/security, network, and lights.

No Daktronics, GameChanger, Cisco, Meraki, Cisco Spaces, Axis, OBS, RTMP, YouTube, digital signage, POS/menu, access-control, emergency, or other real vendor APIs are called.

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

Primary mayor/GM demo flow:

- `/demo/crossroads/today`
- `/demo/crossroads/presentation`
- `/demo/crossroads/operations`
- `/demo/crossroads/staff`
- `/demo/crossroads/tv`
- `/demo/crossroads/media`

Venue and family routes:

- `/venue/crossroads`
- `/venue/crossroads/family`
- `/venue/crossroads/tournament`
- `/demo/crossroads/operations` (presentation-friendly operations entry)
- `/demo/crossroads/gm`

QR-style entry routes:

- `/venue/crossroads`
- `/venue/crossroads/field/6`
- `/venue/crossroads/surface/6B`
- `/venue/crossroads/parking/south-lot`
- `/venue/crossroads/concession/north`
- `/venue/crossroads/concession/south`

Media Engine routes:

- `/demo/crossroads/media`
- `/demo/crossroads/media/channel/media-channel-field-6b-live`
- `/demo/crossroads/media/endpoints`
- `/demo/crossroads/media/overlay-preview`

### Presentation Mode

Open:

`/demo/crossroads/presentation`

Recommended mayor/GM start:

1. Open `/demo/crossroads/today`.
2. Use quick links to open Family Experience, Tournament Operations, Operations Center, Staff Mode, TV Dashboard, Media Engine, and Presentation Tour.
3. Open `/demo/crossroads/presentation` for the guided 10-12 minute story.
4. Keep the scenario set to **Normal Tournament Day** until the weather delay scene.
5. Switch to **Weather Delay** for the delay/recovery story.
6. End with **Crossroads 2030**.

Presentation Mode is a guided Crossroads Experience Center tour for the Mayor, GM, Parks leadership, Village stakeholders, investors, and future venue partners.

It follows a single Saturday story:

1. 7:00 AM - Staff arrives / facility readiness
2. 7:30 AM - Tournament director checks fields
3. 7:45 AM - Families arrive and navigate
4. 8:00 AM - Games begin / live scores on TVs
5. 8:15 AM - GameDay Media Engine
6. Noon - Concessions, playground, high traffic
7. 2:00 PM - Weather delay / emergency communication
8. 3:00 PM - Recovery / schedule resumes
9. 6:00 PM - Championship game / community moment
10. Monday Morning - Operations Center executive summary
11. Future Vision - Crossroads 2030

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

Use `/demo/crossroads/today` first, then `/demo/crossroads/presentation`.

1. **Crossroads Today** - 60 seconds  
   Show the front door for the Connected Venue Operating System.

2. **Family arrival** - 60 seconds  
   Show South Lot, Field 6B, Visitor Services, and current game context.

3. **Tournament operations** - 75 seconds  
   Show readiness checks, delayed games, and behind-schedule games.

4. **Operations Center** - 90 seconds  
   Show Today, Maintenance, Assets, Staff, Safety, Communications, Community, Analytics, and Future Roadmap.

5. **TV Dashboard** - 75 seconds  
   Show Crossroads Live, Tournament HQ, Village Events, Weather & Safety, Sponsor Rotation, and Menu/Concessions.

6. **Media Engine** - 60 seconds  
   Show mock Field 6B camera, score overlay, and routing to bar TVs, family app, Tournament HQ, and future livestream destination. Say: **Create media once, distribute it everywhere.**

7. **Weather Delay scenario** - 90 seconds  
   Toggle Weather Delay. Show public alert, tournament impact, and Operations Center communication.

8. **Staff Mode** - 60 seconds  
   Show assigned requests, open incidents, tasks, asset issues, and quick actions.

9. **Executive Summary** - 75 seconds  
   Show weekend games hosted, visitors, maintenance, assets, utilization, and revenue opportunities.

10. **Crossroads 2030** - 75 seconds  
    Close with current vs future clarity. Vendor integrations are future targets and are not live in this demo.

The scene model is reusable and configured in:

`src/lib/demo/crossroads-presentation.ts`

The generic presentation and future-vision primitives live in:

- `src/lib/demo/presentation.ts`
- `src/components/demo/presentation-mode.tsx`
- `src/components/demo/future-vision-panel.tsx`

### Current vs Future Clarity

Demo-only today:

- Crossroads Today route.
- Guided presentation flow
- Simulated weather delay
- Simulated announcement state
- Simulated equipment online/offline placeholders
- Sample youth sports schedules and readiness states
- Mock Field 6B Media Engine feed and overlay preview

Platform-ready foundation:

- Venue, field, play surface, and session hierarchy
- Venue Mode map/hotspot model
- QR-style entry routes
- Operations alerts and status concepts
- Manual scoreboard concepts
- Provider-ready equipment endpoint records
- Scoped permission model for venue, parent field, play surface, and session roles
- Media Engine model for video sources, audio sources, overlays, media channels, distribution endpoints, routes, and sessions

Future roadmap:

- Physical scoreboard integration
- GameChanger source-of-truth game state
- RTSP/NDI/SRT camera ingest
- PTZ control with permissions
- OBS/production system integration
- RTMP livestream destinations
- Recording, replay, and automated highlight clips
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
- Camera vendor, OBS, RTMP, livestream, recording, replay, signage, and POS/menu integrations
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
- Media Engine scene exists in the presentation
- Media Engine routes and seed data exist
- Presentation scenarios update isolated demo state
- Future Vision separates foundation-ready, future, and partner/vendor items
