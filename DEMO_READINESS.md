# Crossroads Experience Center Demo Readiness

This checklist is for the Wintrust Crossroads Sports Complex GM demo and related Village, investor, or venue-partner walkthroughs.

## Exact Demo URLs

Open these locally at `http://localhost:3000` or on the deployed `NEXT_PUBLIC_APP_URL`.

Primary flow:

- `/demo/crossroads/today`
- `/venue/crossroads`
- `/demo/crossroads/presentation`
- `/venue/crossroads/family`
- `/venue/crossroads/tournament`
- `/demo/crossroads/operations`
- `/demo/crossroads/gm`
- `/demo/crossroads/tv`
- `/demo/crossroads/staff`
- `/demo/crossroads/media`

Mayor / Village leadership flow:

- Primary start route: `/demo/crossroads/today`
- Presentation route: `/demo/crossroads/presentation`
- Operations Center route: `/demo/crossroads/operations`
- TV Dashboard route: `/demo/crossroads/tv`
- Media Engine route: `/demo/crossroads/media`
- Staff Mode route: `/demo/crossroads/staff`
- Executive Summary route: `/demo/crossroads/gm`
- Script: `MAYOR_DEMO_SCRIPT.md`

QR-style entry points:

- `/venue/crossroads`
- `/venue/crossroads/field/6`
- `/venue/crossroads/surface/6B`
- `/venue/crossroads/parking/south-lot`
- `/venue/crossroads/concession/north`
- `/venue/crossroads/concession/south`

Maintenance intake examples:

- `/venue/crossroads/maintenance/new?locationType=field&locationId=field-6`
- `/venue/crossroads/maintenance/new?locationType=poi&locationId=restroom-south`
- `/venue/crossroads/maintenance/new?locationType=poi&locationId=concession-south`
- `/venue/crossroads/maintenance/new?locationType=equipment&locationId=field-6-scoreboard`

Operations Center Executive Summary:

- `/demo/crossroads/gm`
- Use after Presentation Mode scene **Operations Center executive summary**.
- Intended for venue GM, venue admin, maintenance manager, asset manager, and executive viewer roles, not parent/family users.

Bar / Concession / Chill Zone TV:

- `/demo/crossroads/tv`
- Source toggles:
  - `/demo/crossroads/tv?source=daktronics`
  - `/demo/crossroads/tv?source=gamechanger`
  - `/demo/crossroads/tv?source=manual`
- Designed for TV/projector display with no login-required controls.
- Shows rotating display playlist content: live scores, upcoming games, weather/emergency banner, sponsor placement, Village event promotion, and menu/food promotion.
- Shows demo venue channels: Crossroads Live, Tournament HQ, Village Events, Weather & Safety, Sponsor Rotation, and Menu/Concessions.
- Shows GameDay Media Engine preview: mock Field 6B camera, score overlay, and routing to venue display endpoints.
- Digital signage players, POS/menu systems, and emergency display override integrations are not live.

Media Engine:

- `/demo/crossroads/media`
- `/demo/crossroads/media/channel/media-channel-field-6b-live`
- `/demo/crossroads/media/endpoints`
- `/demo/crossroads/media/overlay-preview`
- Demonstrates mock production cameras, score overlays from normalized game state, media channels, distribution endpoints, and routing matrix.
- All video is mock/demo. No real camera hardware, RTSP, NDI, SRT, HDMI capture, OBS, RTMP, YouTube, GameChanger, Daktronics, or digital signage system is connected.
- Security cameras are modeled separately for awareness only and are not livestream sources.

Staff Mode:

- `/demo/crossroads/staff`
- Role examples:
  - `/demo/crossroads/staff?role=maintenance_staff`
  - `/demo/crossroads/staff?role=concessions_staff`
  - `/demo/crossroads/staff?role=security_staff`
  - `/demo/crossroads/staff?role=venue_staff`
  - `/demo/crossroads/staff?role=event_staff`
  - `/demo/crossroads/staff?role=parent`
- Shows assigned maintenance requests, open incidents, today's tasks, asset issues, location-aware work orders, and quick action placeholders.
- Parent/family role check demonstrates that Staff Mode is not a public visitor experience.

## Seed And Reset Instructions

Local demo pages use checked-in Crossroads configuration and do not require Supabase to render.

For Supabase-backed venue-mode testing, run:

```bash
supabase/crossroads-demo-seed.sql
```

Recommended reset approach:

1. Use a disposable demo Supabase project or a dedicated demo organization.
2. Re-run `supabase/crossroads-demo-seed.sql`; the seed uses stable IDs for core Crossroads records.
3. Restart the dev server if environment variables changed.
4. Reopen `/venue/crossroads` and `/demo/crossroads/presentation`.

Local UI state reset:

- Reload the browser tab.
- Presentation Mode returns to scene 1 and Normal Tournament Day.
- Crossroads Today uses checked-in demo data and resets on refresh.
- Maintenance request edits are local client state only and reset on reload.

## Required Environment Variables

The local Crossroads demo renders without live Supabase data, but the full app expects:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

For QR and public link demos:

- Set `NEXT_PUBLIC_APP_URL` to the deployed Vercel URL before printing or sharing links.
- If `NEXT_PUBLIC_APP_URL` is missing, existing helpers may fall back to localhost.

## Known Limitations

- No real CMMS, work-order, or facilities ticketing platform is connected.
- Daktronics is represented as a read-only mock feed foundation only. No physical scoreboard control is live.
- No Cisco Meraki, Cisco Spaces, PA/audio, security camera, weather automation, or scoreboard hardware control integration is live.
- No access-control system, keypad, badge, lock, gate, emergency dispatch, digital signage player, POS/menu, or public-alert delivery system is connected.
- No real camera, RTSP, NDI, SRT, OBS, RTMP, YouTube, recording/archive, replay, or livestream destination is connected.
- Mock media feeds are for demo routing and overlay preview only.
- Security cameras are not exposed as family, TV, livestream, or production feeds.
- No push notifications, SMS, or email are sent.
- Maintenance requests in Crossroads demo UI are local demo state unless later connected to Supabase.
- The Operations Center Executive Summary uses realistic static demo analytics for executive KPIs, utilization, asset health, and revenue opportunities.
- Revenue opportunity cards are future/potential opportunities, not booked revenue.
- Presentation scenarios simulate state and do not mutate production venue data.
- The Crossroads map hotspot coordinates are placeholder/demo coordinates and can be refined later.
- Some admin routes still depend on Supabase configuration and are not part of the GM demo path.

## Demo-Only vs Platform-Ready vs Future Roadmap

Demoed today:

- Crossroads Venue Mode page with map/hotspots.
- Guided Presentation Mode.
- Family Mode path from South Lot to Field 6B.
- Tournament Mode dashboard.
- Venue Operations Mode dashboard.
- Simulated Weather Delay and Championship Sunday scenarios.
- Maintenance request list, local create form, filters, status updates, and QR-style intake routes.
- Operations Center Monday-morning executive dashboard.
- Asset Register list, filters, detail panel, related maintenance, and local maintenance-request-from-asset action.
- Facility utilization and revenue opportunity demo cards.
- Provider-ready equipment endpoint placeholders.
- Crossroads Bar TV dashboard powered by normalized game state from a mock Daktronics read-only feed.
- Scoreboard feed health states for live, delayed, final, stale, offline, manual update, and future GameChanger source.
- Crossroads Today front door with event, weather placeholder, games, visitors estimate, field status, announcements, and quick links.
- Digital Experience display zones for Chill Zone TVs, Bar TVs, Menu Boards, Main Concourse Displays, Restroom/Hallway Posters, future outdoor signage, and Venue TV Dashboard.
- Staff Mode for maintenance, concessions, security, venue staff, and event staff.
- Safety and emergency demo notices, shelter locations, incident reports, and emergency message previews.
- Building infrastructure and access-control awareness objects labeled as role-awareness/future integration.
- Community Dashboard with Village events, community announcements, tourism/visitor messaging placeholder, sponsor/community partner highlights, and Explore New Lenox messaging.
- QR Context demo showing parent, staff, and tournament views from a Field 6 scan.
- Future Vision phases for Connected Venue Software, Read-Only Integrations, Approved Vendor Integrations, Smart Venue / AI / Wayfinding, and Connected Municipality.
- GameDay Media Engine foundation for video sources, audio sources, overlay templates, overlay render jobs, media channels, distribution endpoints, media routes, and media sessions.

Platform-ready foundation:

- Organization -> Venue -> Zone -> Parent Field -> Field Layout -> Play Surface -> Session hierarchy.
- QR entry model for venue, field, play surface, parking, concession, and maintenance intake.
- Scoped operations concepts for venue, field, play surface, session, equipment, and maintenance.
- Future-provider interfaces for maintenance ticketing:
  - `createExternalTicket()`
  - `syncExternalTicketStatus()`
  - `closeExternalTicket()`
- Asset Register model for venue infrastructure, equipment, POIs, buildings, and life-safety assets.
- Scoped GM, maintenance, asset, and executive role visibility model.
- Future-provider contracts for venue mode equipment/network/location providers.
- Scoreboard input provider interface:
  - `connect()`
  - `disconnect()`
  - `readCurrentState()`
  - `subscribeToUpdates()`
  - `normalizeScoreboardState()`
  - `healthCheck()`
- Game State Engine normalization metadata:
  - `source`
  - `isOfficial`
  - `lastUpdatedAt`
  - data freshness
  - audit/history events
- Media Engine model:
  - video sources
  - audio sources
  - overlay templates
  - overlay render jobs
  - media channels
  - distribution endpoints
  - media routes
  - media sessions
- Overlay previews consume normalized game state for Field 6B, including teams, score, inning, count, game status, weather/emergency banner, sponsor placement, and Powered by GameDay OS.
- Digital Experience model:
  - display endpoints
  - display zones
  - content items
  - playlists
  - content schedules
- Safety and emergency foundation:
  - safety notices
  - emergency scenarios
  - shelter locations
  - incident reports
- Building infrastructure objects for electrical rooms, fire sprinkler rooms, network rooms, staff rooms, restrooms, water stations, first aid locations, access-controlled doors, poster QR locations, hallways, concession counters, and bar areas.
- Access-controlled areas are role-awareness/future integration only.

Scoreboard source phases:

- **Daktronics read-only phase:** passively read manually operated All Sport-style scoreboard state and normalize it for venue TVs, family pages, tournament operations, and audits.
- **Future GameChanger source-of-truth phase:** when available, GameChanger or another approved provider can become the upstream schedule/score source while GameDay OS normalizes the same display payloads.
- **Future scoreboard control phase:** any write/control path to physical scoreboards requires venue approval, vendor approval, explicit permissions, and audit logging. It is not part of the current demo.

Future roadmap:

- Physical scoreboard integration.
- Daktronics or other physical scoreboard control, pending vendor/venue approval.
- GameChanger source-of-truth integration when approved and available.
- PA/audio announcement integration.
- Digital signage automation.
- Digital signage player integrations.
- POS/menu system integration.
- RTSP/NDI/SRT camera ingest.
- PTZ camera control with scoped permissions.
- OBS/production system integrations.
- RTMP livestream destinations.
- Recording, replay, and automated highlight clips.
- Sponsor graphics and media overlays.
- Weather/lightning automation.
- Emergency communication override workflow.
- Cisco Meraki presence analytics.
- Cisco Spaces wayfinding.
- Security camera awareness, not streaming.
- Equipment health monitoring.
- CMMS or ticketing provider sync.
- External CMMS integration.
- Municipal asset management integration.
- Work order sync.
- Capital planning.
- Sponsorship management.
- Facility rental/reservation tools.
- AI operations assistant.
- Parent/family mobile app.
- Tournament app integrations.

Partner/vendor approval required:

- Cisco Meraki.
- Cisco Spaces.
- Daktronics or other scoreboard hardware vendors.
- Camera vendors and production systems.
- OBS/RTMP/livestream platform providers.
- Security camera provider integrations.
- PA/audio systems.
- Weather/lightning data providers.
- Access-control/keypad/badge systems.
- Digital signage player vendors.
- POS/menu systems.
- SportsEngine, TeamSnap, GameChanger, HomeTeamsOnline, or other schedule systems requiring API approval.

## Browser And iPad Testing Notes

Recommended demo devices:

- Laptop: 1366x900 or larger.
- iPad/tablet: 1024x768 or similar.

Pre-demo browser checks:

0. Open `/demo/crossroads/today` and confirm the page reads as the primary front door.
1. Open `/venue/crossroads`.
2. Confirm the Crossroads map image loads.
3. Confirm **Start Crossroads Tour** is visible.
4. Open `/demo/crossroads/presentation`.
5. Confirm no horizontal scrolling on laptop or iPad width.
6. Confirm presenter controls are visible without opening dev tools.
7. Confirm the Future Vision panel says vendor integrations are not live.
8. Open `/demo/crossroads/operations`.
9. Confirm Maintenance Requests and Staff QR Maintenance Entry sections render.
10. Open a maintenance QR route and confirm the location is prefilled.
11. Open `/demo/crossroads/gm`.
12. Confirm Executive Dashboard, Maintenance, Asset Register, Facility Utilization, Revenue Opportunities, and Future Roadmap tabs work.
13. Open `/demo/crossroads/tv` and confirm the emergency banner, live score panels, playlist cards, sponsor panel, Village event ad, and menu promo are readable at presentation distance.
14. Open `/demo/crossroads/staff?role=maintenance_staff` and confirm tasks, requests, incidents, and quick actions render.
15. Open `/demo/crossroads/staff?role=parent` and confirm the restricted message appears.
16. Open `/demo/crossroads/media` and confirm video source health, channels, endpoints, overlay preview, and routing matrix render.
17. Open `/demo/crossroads/media/overlay-preview` and confirm Field 6B shows Illinois Celtics vs Bulldogs with count and Powered by GameDay OS.
18. Open `MAYOR_DEMO_SCRIPT.md` and keep the 10-minute flow visible for the presenter.

Do not present with browser dev tools open.

## 10-Minute GM Demo Flow

Start at `/demo/crossroads/today`, then use `/demo/crossroads/presentation`.

1. **Crossroads Today** - 60 seconds  
   Show the front door for the Connected Venue Operating System: event, weather placeholder, games, visitor estimate, live/delayed fields, announcements, and quick links.

2. **Family arrival** - 60 seconds  
   Show venue QR entry, parking, main gate, map context, and Visitor Services.

3. **South Lot to Field 6B** - 60 seconds  
   Show how a parent understands where they parked and where the game is.

4. **Live family page** - 75 seconds  
   Show current game, score/status, schedule, weather awareness, concessions, restrooms, and playground context.

5. **Scorekeeper view** - 60 seconds  
   Show scoped game-day score entry. Emphasize that scorekeeper access does not grant venue control.

6. **Tournament dashboard** - 75 seconds  
   Show live fields, delayed fields, behind-schedule games, and readiness checks.

7. **Venue operations dashboard** - 75 seconds  
   Show complex health, alerts, equipment placeholders, maintenance requests, and announcement workflow.

8. **Operations Center executive summary** - 75 seconds  
   Open `/demo/crossroads/gm` or use the presentation scene. Show weekend games hosted, estimated guests, on-time starts, maintenance opened/resolved/pending, asset issues, utilization, and future revenue opportunities.

9. **Digital Experience and Venue Communications** - 60 seconds  
   Show Chill Zone TVs, bar TV live scores, Village event advertising, sponsor placement, menu board placeholder, and emergency banner override. State clearly that display players, POS/menu systems, and emergency systems are future integrations.

10. **Weather Delay scenario** - 90 seconds  
   Toggle **Weather Delay**. Show field delay state, family alert, tournament impact, and venue announcement workflow.

11. **Recovery** - 45 seconds  
   Show all-clear/recovery: games resume and the operational record remains consistent.

12. **Future Vision** - 75 seconds  
    Close with current vs future clarity. Say explicitly that vendor integrations, external CMMS, municipal asset systems, and facility rental/reservation tools are future targets and are not live in the demo.

## GM Demo Talking Points

- GameDay OS can give the GM a Monday-morning operating summary without asking staff to assemble spreadsheets.
- Maintenance requests, asset health, and equipment placeholders connect the game-day experience to facility accountability.
- Facility utilization shows which fields, POIs, and time windows matter most during tournament weekends.
- Revenue opportunities are deliberately labeled as future/potential: sponsorship zones, field naming, concessions insights, premium tournament packages, batting cage reservations, digital signage, and family app placements.
- The Operations Center Executive Summary is not for parents or family viewers; it is scoped to venue leadership and approved operational roles.
- GameDay OS connects the visitor experience, tournament operations, facility staff, venue communications, and future infrastructure integrations through one shared venue model.

## Final Audit Commands

Run before the demo:

```bash
npm test
npm run lint
npm run build
```

Optional route smoke test:

```bash
npm run dev
```

Then open the exact demo URLs above.
