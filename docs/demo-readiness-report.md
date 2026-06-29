# GameDay OS Demo Readiness Report

Date: June 29, 2026

## Readiness Summary

Crossroads Experience Center is demo-ready for a guided GM/Village leadership walkthrough with the following scope:

- Family experience
- Tournament operations
- Venue operations
- Maintenance requests
- Asset register
- Executive/GM summary
- Facility utilization
- Future revenue opportunities
- Future roadmap clarity

The demo should be presented as a working local/reference experience plus clearly labeled future integrations. It should not be presented as live hardware, CMMS, Meraki/Cisco Spaces, weather automation, or municipal asset-management integration.

## Demo-Critical URLs

Primary:

- `/venue/crossroads`
- `/demo/crossroads/presentation`
- `/demo/crossroads/gm`
- `/venue/crossroads/operations`

Supporting:

- `/venue/crossroads/family`
- `/venue/crossroads/tournament`
- `/venue/crossroads/field/6`
- `/venue/crossroads/surface/6B`
- `/venue/crossroads/parking/south-lot`
- `/venue/crossroads/maintenance/new?locationType=equipment&locationId=field-6-scoreboard`

## What To Show

### 1. Crossroads Landing

Show:

- venue map
- 9 fields and 22 play surfaces
- QR/demo links
- Start Crossroads Tour
- GM Mode

Avoid:

- Opening too many admin pages before framing the story.

### 2. Presentation Mode

Show:

- family arrival
- South Lot to Field 6B
- live game card
- scorekeeper scope
- tournament operations
- venue operations
- Monday Morning GM View
- Weather Delay
- Recovery
- Future Vision

Validate before demo:

- Next, Previous, Restart, Jump all work.
- Normal Tournament Day, Weather Delay, and Championship Sunday scenario toggles reset correctly.
- Future Vision clearly labels vendor work as future.

### 3. GM Mode

Show:

- Executive Dashboard
- Operations Today
- Maintenance
- Asset Register
- Facility Utilization
- Revenue Opportunities
- Future Roadmap

Talking point:

“This is what the GM can look at Monday morning without waiting for staff to assemble a manual report.”

### 4. Operations Mode

Show:

- complex health
- field status grid
- equipment placeholders
- maintenance requests
- staff QR maintenance entry
- asset register

Talking point:

“Operations Center owns communication and delay workflows; GM Mode summarizes leadership impact.”

## Known Demo Caveats

- Crossroads pages use local checked-in demo data.
- Maintenance and asset actions are local UI state.
- No external ticketing or CMMS system is connected.
- No hardware commands are sent.
- No weather automation is connected.
- No push notifications are sent.
- Revenue cards are future opportunity examples, not contracted revenue.
- Parent/family accounts are not implemented as a full auth model yet.

## Current Demo Quality

Ready:

- Crossroads map and POIs.
- Family route and Field 6B story.
- Tournament Mode.
- Operations Mode.
- Presentation Mode.
- GM Mode.
- Maintenance Requests.
- Asset Register.
- Future Vision language.

Needs monitoring:

- Admin dashboard sprawl may confuse unguided users.
- Some admin pages require Supabase setup and are not demo-path-critical.
- Browser dev-server warnings such as LCP hints are not demo blockers.

## Pre-Demo Checklist

1. Run `npm run build`.
2. Start the dev server or deploy to Vercel.
3. Open `/venue/crossroads`.
4. Confirm map image renders.
5. Confirm Start Crossroads Tour and GM Mode links are visible.
6. Open `/demo/crossroads/presentation`.
7. Walk scenes 1-11 with Next.
8. Toggle Weather Delay on the Weather Delay scene.
9. Toggle Championship Sunday and confirm delay state clears.
10. Restart tour and confirm Normal Tournament Day.
11. Open `/demo/crossroads/gm`.
12. Click every GM tab.
13. In Asset Register, create a local maintenance request from an asset.
14. Open `/venue/crossroads/operations`.
15. Confirm Maintenance Requests and Asset Register render.

## Demo Risk Register

Low risk:

- Broken build: current build passes.
- Missing Crossroads image: asset exists at `public/demo/crossroads-map.png`.
- Scenario reset: regression test covers Championship Sunday reset from Weather Delay scene.

Medium risk:

- Users may confuse future roadmap with live integration. Mitigation: keep saying “future integration, not live.”
- Users may ask if demo data is real. Mitigation: say it is realistic demo data built on platform models.
- Users may ask if GM Mode is permission-enforced. Mitigation: explain visibility model exists; backend enforcement is expanding across all sensitive actions.

High risk:

- Presenting without a guided script. Mitigation: use `DEMO_READINESS.md` 10-minute flow.

