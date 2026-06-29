# Crossroads Experience Center Demo Readiness

This checklist is for the Wintrust Crossroads Sports Complex GM demo and related Village, investor, or venue-partner walkthroughs.

## Exact Demo URLs

Open these locally at `http://localhost:3000` or on the deployed `NEXT_PUBLIC_APP_URL`.

Primary flow:

- `/venue/crossroads`
- `/demo/crossroads/presentation`
- `/venue/crossroads/family`
- `/venue/crossroads/tournament`
- `/venue/crossroads/operations`
- `/demo/crossroads/gm`

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

GM Mode:

- `/demo/crossroads/gm`
- Use after Presentation Mode scene **Monday Morning GM View**.
- Intended for venue GM, venue admin, maintenance manager, asset manager, and executive viewer roles, not parent/family users.

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
- No Daktronics, Cisco Meraki, Cisco Spaces, PA/audio, security camera, weather automation, or scoreboard hardware integration is live.
- No push notifications, SMS, or email are sent.
- Maintenance requests in Crossroads demo UI are local demo state unless later connected to Supabase.
- GM Mode uses realistic static demo analytics for executive KPIs, utilization, asset health, and revenue opportunities.
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
- GM Mode Monday-morning executive dashboard.
- Asset Register list, filters, detail panel, related maintenance, and local maintenance-request-from-asset action.
- Facility utilization and revenue opportunity demo cards.
- Provider-ready equipment endpoint placeholders.

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

Future roadmap:

- Physical scoreboard integration.
- PA/audio announcement integration.
- Digital signage automation.
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
- Security camera provider integrations.
- PA/audio systems.
- Weather/lightning data providers.
- SportsEngine, TeamSnap, GameChanger, HomeTeamsOnline, or other schedule systems requiring API approval.

## Browser And iPad Testing Notes

Recommended demo devices:

- Laptop: 1366x900 or larger.
- iPad/tablet: 1024x768 or similar.

Pre-demo browser checks:

1. Open `/venue/crossroads`.
2. Confirm the Crossroads map image loads.
3. Confirm **Start Crossroads Tour** is visible.
4. Open `/demo/crossroads/presentation`.
5. Confirm no horizontal scrolling on laptop or iPad width.
6. Confirm presenter controls are visible without opening dev tools.
7. Confirm the Future Vision panel says vendor integrations are not live.
8. Open `/venue/crossroads/operations`.
9. Confirm Maintenance Requests and Staff QR Maintenance Entry sections render.
10. Open a maintenance QR route and confirm the location is prefilled.
11. Open `/demo/crossroads/gm`.
12. Confirm Executive Dashboard, Maintenance, Asset Register, Facility Utilization, Revenue Opportunities, and Future Roadmap tabs work.

Do not present with browser dev tools open.

## 10-Minute GM Demo Flow

Use `/demo/crossroads/presentation`.

1. **Welcome** - 45 seconds  
   GameDay OS turns Crossroads into a connected venue operating layer for families, tournaments, and venue staff.

2. **Family arrival** - 60 seconds  
   Show venue QR entry, parking, main gate, and map context.

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

8. **Monday Morning GM View** - 75 seconds  
   Open `/demo/crossroads/gm` or use the presentation scene. Show weekend games hosted, estimated guests, on-time starts, maintenance opened/resolved/pending, asset issues, utilization, and future revenue opportunities.

9. **Weather Delay scenario** - 90 seconds  
   Toggle **Weather Delay**. Show field delay state, family alert, tournament impact, and venue announcement workflow.

10. **Recovery** - 45 seconds  
   Show all-clear/recovery: games resume and the operational record remains consistent.

11. **Future Vision** - 75 seconds  
    Close with current vs future clarity. Say explicitly that vendor integrations, external CMMS, municipal asset systems, and facility rental/reservation tools are future targets and are not live in the demo.

## GM Demo Talking Points

- GameDay OS can give the GM a Monday-morning operating summary without asking staff to assemble spreadsheets.
- Maintenance requests, asset health, and equipment placeholders connect the game-day experience to facility accountability.
- Facility utilization shows which fields, POIs, and time windows matter most during tournament weekends.
- Revenue opportunities are deliberately labeled as future/potential: sponsorship zones, field naming, concessions insights, premium tournament packages, batting cage reservations, digital signage, and family app placements.
- GM Mode is not for parents or family viewers; it is scoped to venue leadership and approved operational roles.

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
