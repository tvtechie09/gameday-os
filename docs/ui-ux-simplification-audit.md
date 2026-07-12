# GameDay OS UI/UX Simplification Audit

Date: July 8, 2026

Principle: **Powerful software should feel simple.**

Audience: parents, coaches, volunteers, tournament directors, venue staff, and scorekeepers. Most usage should assume a phone, outdoor light, one hand, and limited attention.

## Executive Diagnosis

GameDay OS has strong product depth, but the interface currently exposes the depth too early. The app now has more than 60 admin pages, multiple dashboard concepts, several operations centers, overlapping command surfaces, and demo/admin/public experiences that often show the same underlying data in different ways.

The product should move from a feature-index model to a task-first model:

- **Public users:** What is happening at my venue or field right now?
- **Scorekeepers:** What score/game state do I need to update?
- **Venue staff:** What needs attention right now?
- **Tournament directors:** What schedule/game problem needs action?
- **Coaches/volunteers:** What is my next responsibility?
- **Admins:** What needs setup, correction, or approval?

The primary UX issue is not styling. It is cognitive load.

## Product-Level Simplification Recommendation

Reframe the app around five primary surfaces:

1. **Today**
   - Public venue and field experience.
   - Current game, alerts, schedule, and wayfinding.

2. **Game**
   - One session command center.
   - Score, status, stream/media links, sponsor, volunteers, timeline.

3. **Venue**
   - Venue Command Center as the operational source of truth.
   - Status, announcements, delays, incidents, public impact.

4. **Setup**
   - Venues, fields, sessions, sponsors, resources, scoreboards, integrations.
   - Hidden from day-of users unless needed.

5. **Review**
   - Executive, system health, schema audit, analytics, logs, identity, permissions.
   - Mostly for directors/admins, not daily operators.

Everything else should become a secondary entry, contextual action, or advanced drawer.

## Screen-by-Screen UX Report

### Landing Page `/`

User intent: Understand what GameDay OS is.

Findings:

- The landing page should not compete with demo/admin surfaces.
- It should lead with one promise: **Connected Venue Operating System for sports venues.**
- Avoid listing every module.

Recommendation:

- One hero.
- Three proof cards: Parents know where to go, staff know what needs attention, directors see the whole venue.
- One primary action: **Open Demo** or **Open Admin** depending environment.

### Admin Shell

User intent: Navigate quickly.

Findings:

- Sidebar exposes too many items at once.
- Operations group alone contains dashboards, identity, people, families, teams, roles, pilots, AI, health, and organizations.
- Pinned links duplicate sidebar links.
- Global search is present but non-functional, which creates expectation debt.
- Organization switcher, hierarchy labels, pinned links, full nav, breadcrumbs, search, quick actions, and page content all compete.

Recommendations:

- Replace full sidebar with role-based primary navigation:
  - Today
  - Venue Command
  - Games
  - Setup
  - Review
- Move Schema Audit, Sync, Integrations Health, Roles, AI, and System Health into **Review / Advanced**.
- Collapse Identity subpages into one Identity area with tabs.
- Remove hierarchy chip block from default sidebar.
- Keep organization switcher, but make it a compact top-bar control.
- Hide non-functional search behind “Search coming soon” or remove until useful.

### Admin Overview `/admin`

User intent: Start admin work.

Findings:

- Shows four totals and a setup checklist.
- Primary action is unclear: Pilot Prep and New Field compete.
- Counts are useful, but not action-driving.

Recommendation:

- Turn this into **Today’s Priorities**:
  - Needs setup
  - Games today
  - Active alerts
  - Pending requests
- One primary action based on state:
  - If no venue: **Create Venue**
  - If no fields: **Add Field**
  - If ready: **Open Venue Command**

### Operations Dashboard `/admin/dashboard`

User intent: Understand venue activity.

Findings:

- Imports and renders venues, fields, sessions, sponsors, alerts, resources, activations, volunteers, weather, follows, page views, sync jobs, branding, sport filters, field status actions, and public links.
- This is a wall of operational information.
- It overlaps heavily with Game Day, Status Board, Venue Command Center, Executive Dashboard, Resource Dashboard, and System Health.

Recommendation:

- Merge into **Venue Command Center** or retire as a standalone page.
- Keep only attention-driving cards:
  - Active alerts
  - Delayed/closed fields
  - Active games
  - Pending requests
  - Missing coverage
- Move analytics, counts, sync, sponsor/page views, and weather profile details to Review.

### Venue Command Center `/admin/operations-center` and `/admin/venue-command-center`

User intent: Communicate and manage venue status.

Findings:

- Correct strategic home for operations.
- Current UI shows multiple templates, forms, field scopes, delay controls, announcements, incident placeholders, decision support, assets, and timeline at once.
- “Run Action” is vague and risky.
- Delay/all-clear/emergency actions need higher hierarchy than secondary forms.

Recommendation:

- Make this the central day-of screen.
- Top card: **Venue is Normal / Weather Delay / Closed / Emergency**.
- One primary action based on state:
  - Normal: **Start Delay**
  - Delayed: **All Clear**
  - Emergency: **Send Update**
- Secondary actions:
  - Add Announcement
  - Update Field Delay
  - Close Field
- Put templates in a modal/action sheet.
- Rename buttons from “Run Action” to concrete verbs: **Start Weather Delay**, **Close Venue**, **Post Announcement**.
- Hide AI suggestions, automation targets, incidents, and asset detail behind collapsible panels.

### Game Day Center `/admin/game-day`

User intent: Monitor games today.

Findings:

- Overlaps with Operations Dashboard and Status Board.
- Contains filters, summary cards, field cards, weather, AI recommendations, scoreboards, audio, volunteers, resources.
- Too broad for mobile.

Recommendation:

- Redesign as **Today’s Games**:
  - Live now
  - Starting soon
  - Needs attention
- One primary action: **Open Venue Command** if there is an issue, otherwise **Open Live Game**.
- Move resource/volunteer/scoreboard details into each field/session detail.

### Status Board `/admin/status-board`

User intent: See every field at a glance.

Findings:

- Valid operational screen, but overlaps with Game Day and Venue Command.

Recommendation:

- Keep as a focused board for tablet/laptop.
- No setup links, no analytics, no long text.
- Field card should show:
  - Field name
  - Status
  - Current/next game
  - Delay
  - One quick status control
- Link from Venue Command only, not as a primary nav item for every user.

### Executive Dashboard `/admin/executive`

User intent: Leadership review.

Findings:

- Should not be day-of operational navigation.
- Useful, but likely too visible in daily admin nav.

Recommendation:

- Move to **Review** group.
- Use weekly/monthly framing.
- Hide system-level details unless requested.

### System Health `/admin/system-health`

User intent: Diagnose readiness/configuration.

Findings:

- Valuable for admins, but not for venue staff, scorekeepers, or volunteers.

Recommendation:

- Move to **Advanced / Review**.
- Default should show only health score and top three blockers.
- Detailed checks should be expandable.

### Schema Audit `/admin/schema-audit`

User intent: Developer/admin diagnostics.

Findings:

- This is not an operational product screen.
- It can scare non-technical users.

Recommendation:

- Hide under **Developer Tools**.
- Never show in default navigation for venue users.

### AI Assistant `/admin/ai`

User intent: Get recommendations.

Findings:

- It should not become another dashboard.
- Best use is embedded, not standalone.

Recommendation:

- Rename to **Suggestions**.
- Surface only 1-3 recommendations contextually.
- Keep standalone page for Review/Advanced.

### Venues `/admin/venues`

User intent: Manage venue records.

Findings:

- Good setup page, but should not be day-of prominent.
- Public links and QR actions are useful but can crowd list rows.

Recommendation:

- Make **Venue Settings** a Setup page.
- Primary action: **Add Venue**.
- For each venue show only name, status/readiness, and “Open”.
- Put QR, public URL, branding, map, edit in overflow/detail.

### New/Edit Venue

User intent: Create or correct a venue.

Findings:

- Branding, map, colors, and operational data can make create flow feel long.

Recommendation:

- Split into steps:
  1. Venue basics
  2. Public page branding
  3. Map
  4. Advanced
- New venue should require only name and address.

### Fields `/admin/fields`

User intent: Manage fields and QR links.

Findings:

- Field list, public URLs, QR previews, status, map coordinates, venue grouping, and creation links can overload the page.

Recommendation:

- Default view: fields grouped by venue with status and next game.
- Primary action: **Add Field**.
- QR code preview should move to field detail or “QR” action sheet.
- Quick status update can remain if day-of role.

### Field Control Center `/admin/fields/[fieldId]/control`

User intent: Operate one field.

Findings:

- This should be one of the most important role-specific screens.
- It risks becoming a mini dashboard with alerts, resources, volunteers, sponsors, timeline, scoreboard, and actions.

Recommendation:

- Top: field status and current game.
- Primary action:
  - If active game: **Open Score Control**
  - If no active game: **Start Next Game**
- Secondary:
  - Change Field Status
  - Post Alert
  - Open Public Page
- Everything else: tabs or collapsible sections.

### Public Field Page `/fields/[fieldId]`

User intent: Parent scans QR and understands what is happening.

Findings:

- Strong direction: current/next game is prominent.
- Still includes field status card, status banner, multiple alert groups, session card, stats strip, game links, schedule, sponsors, community links, map, scoreboard status, share link.
- Repeats field/venue/status multiple times.
- Technical language leaks through: streaming, scoreboard profile, links available, GameDay metadata.

Recommendation:

- First screen should contain only:
  - Venue name
  - Field name
  - Current status
  - Current/next game
  - Score/time
  - Active alert if any
- Below fold:
  - Today’s schedule
  - Sponsors
  - Map/find field
  - Links
- Move share URL, scoreboard status, community links, tournament badge, technical status to collapsible sections.
- Replace “Current / Next Game” with human copy:
  - “Now Playing”
  - “Up Next”
  - “Final”
- Remove duplicate field status card when header already shows status.

### Public Venue Page `/venues/[venueId]`

User intent: Parent/visitor understands venue today.

Findings:

- Good public structure, but too much below the hero: display link, active alerts, schedule, recent updates, fields, venue map, sponsors, resources, share links.
- “Open Venue Display” is not a parent primary action.
- Share links and display URLs are admin/demo concerns, not public visitor content.

Recommendation:

- Hero should answer: “What is happening here today?”
- First sections:
  - Active alert/status
  - Today at this venue
  - Find your field
- Move resources, sponsors, share links, venue display link below “More”.
- Public page should not show code-style URLs unless opened from admin.

### Sessions `/admin/sessions`

User intent: Manage game schedule.

Findings:

- Sessions list, create, edit, bulk, command center, and live dashboard are split across many routes.
- “Session” is product-internal language; most users think “Game”.

Recommendation:

- Rename user-facing label to **Games**.
- Keep database model as Session.
- List page should default to Today / Upcoming / Needs attention.
- Primary action: **Add Game** or **Import Schedule** depending context.

### Session Dashboard `/admin/sessions/[sessionId]`

User intent: Control one game.

Findings:

- This overlaps with Command Center and score control.

Recommendation:

- Merge with `/admin/sessions/[sessionId]/command-center`.
- Use one screen: **Game Command Center**.
- Score control should be visually primary for scorekeeper role.

### Session Command Center

User intent: Understand and control one game.

Recommendation:

- Sections:
  - Game summary
  - Score
  - Public links
  - Alerts
  - Timeline
  - Advanced: streaming, sponsors, volunteers, integrations.
- One primary action based on status:
  - Scheduled: **Start Game**
  - Active: **Update Score**
  - Final: **View Summary**

### Scoreboard Displays `/scoreboard/*`

User intent: View score from across a room.

Findings:

- This should remain separate and minimal.

Recommendation:

- No admin links.
- No explanation text.
- Large teams, score, status, inning/period.
- Sponsor optional.
- Small “Powered by GameDay OS.”

### Scoreboards Admin

User intent: Configure scoreboard sources/displays.

Findings:

- Scoreboards, adapters, display controls, profile pages are separate.

Recommendation:

- Merge into one **Scoreboards** area with tabs:
  - Displays
  - Profiles
  - Adapters
  - Advanced
- Default tab should be **Launch Display**.

### Sponsors

User intent: Create sponsors, assign placements, view performance.

Findings:

- Sponsor management, assignments, analytics, detail, edit, public display all compete.

Recommendation:

- Sponsor list default:
  - Sponsor name
  - Active placements
  - Clicks/impressions summary
- Primary action: **Add Sponsor**.
- Assignment workflow should be a guided sheet:
  1. Choose sponsor
  2. Choose placement scope
  3. Publish
- Analytics should be detail-only.

### Alerts / Notifications

User intent: Communicate important changes.

Findings:

- Alerts, notifications, operations announcements, weather operations, venue status, and public updates overlap.

Recommendation:

- Operations-created alerts should originate from Venue Command Center.
- `/admin/alerts` becomes **Alert History** and advanced editor.
- `/admin/notifications` becomes audit/read-only unless real delivery channels exist.

### Resources / Activations / Volunteers

User intent: Track support for the game/field.

Findings:

- Resource inventory, activations, resource dashboard, volunteers, audio, assets overlap.

Recommendation:

- Day-of users see **Help & Coverage**:
  - Pending help
  - Active livestream/audio/camera/scorekeeper
- Venue/admin users see inventory under Setup.
- Volunteers should merge into Identity/Assignments long term.

### Assets `/admin/assets`

User intent: Manage physical venue assets.

Recommendation:

- Keep as advanced venue operations.
- Do not expose in primary nav for everyday users.
- Tie asset issues into Venue Command Center as attention items.

### Weather

User intent: Handle weather-related operations.

Findings:

- Weather page and weather operations overlap with Venue Command Center.

Recommendation:

- Merge weather operations into Venue Command Center.
- Weather profile setup remains under Setup > Venue Settings > Weather.

### Integrations / Sync / Import

User intent: Bring external schedule data into GameDay OS.

Findings:

- CSV Import, Integrations, Integration Health, Sync Engine, Sync Jobs, Sync Review are split.

Recommendation:

- One area: **Imports & Integrations**.
- Default path:
  1. Choose source
  2. Preview
  3. Review
  4. Import
- Health and sync jobs under Advanced.

### Identity / Roles

User intent: Manage people and access.

Findings:

- Identity, people, families, teams, roles, role framework are separate nav items.
- Permissions should be powerful but hidden from daily operations.

Recommendation:

- One nav item: **People & Access**.
- Tabs:
  - People
  - Families
  - Teams
  - Roles
  - Requests
  - Audit
- Default view: “Who has access?”
- Permission matrix behind Advanced.

### Organizations

User intent: Super admin manages tenants.

Recommendation:

- Hide from non-platform users.
- Organization switcher is enough for most users.
- Organization dashboard belongs in Review/Setup, not Operations.

### Pilot Pages

User intent: Prepare/test a pilot.

Findings:

- Pilot Launch, Pilot Prep, Pilot Script overlap with System Health, Showcase, Demo pages.

Recommendation:

- Merge into **Pilot Mode**:
  - Launch
  - Readiness
  - Test Script
  - Public Links
- Hide after production unless demo/pilot flag is enabled.

### Demo / Showcase / Crossroads Pages

User intent: Present product story.

Findings:

- Crossroads Today is strong but includes many panels below the fold.
- Presentation Mode is strong but presenter controls compete with scene content.
- GM/TV/Media/Staff are useful demo surfaces but should not influence core admin navigation.

Recommendation:

- Keep demo mode separate from product admin.
- Crossroads Today should be the demo front door.
- Presentation controls should be visually quieter in “audience mode.”
- Add a presenter-only toggle to hide controls during the meeting.

### Public Crossroads Routes

User intent: Role-specific demo experiences.

Recommendation:

- Family route: keep parent language only.
- Tournament route: schedule and readiness only.
- Operations route: staff/venue language only.
- Staff route: tasks only.
- Avoid showing future roadmap panels on pages meant to simulate real user experiences.

## UI Simplification Plan

### Principle 1: One Surface Per Job

Consolidate around:

- **Venue Command Center:** venue status, communications, delays, incidents.
- **Game Command Center:** one game/session.
- **Today:** public/family experience.
- **Setup:** configuration.
- **Review:** analytics, health, audit, integrations, permissions.

### Principle 2: Role-Based Defaults

Default screens should change by user type:

- Parent: current/next game, alerts, schedule, wayfinding.
- Scorekeeper: update score.
- Coach: game/team tasks.
- Tournament director: schedule exceptions and field readiness.
- Venue staff: venue status, alerts, field delays, tasks.
- Executive: summary, health, trends.

### Principle 3: Advanced By Default Hidden

Hide by default:

- API/source metadata.
- Schema audit.
- Permission matrix.
- Audit logs.
- Integration health.
- Provider placeholders.
- Device details.
- Analytics tables.

## Wireframe Recommendations

### Public Field Page

```text
[Venue Name]
[Field Name]                     [Open/Delayed/Closed]

[ALERT if active]

[Now Playing / Up Next]
Team A           4 - 3           Team B
Bottom 3rd · 1-2 count · 1 out
[Watch / Follow / Photos if available]

[Today’s Schedule]
8:00  Team A vs Team B
9:30  Team C vs Team D

[Find this field]
Map preview

[Sponsors]
```

Remove from first screen:

- Share URL.
- Scoreboard profile text.
- Streaming availability labels unless there is a live link.
- Community contribution forms.
- Technical resource status.

### Venue Command Center

```text
[Venue Status: Normal Operations]              [Start Delay]
Last update: 8:42 AM

Needs attention
- Field 4 is 30 min behind        [Update]
- Weather alert expires soon      [Send Update]

Field delays
Field 1  On Time
Field 2  On Time
Field 4  30 min behind

Announcements
[Add Announcement]

[Recent timeline]
```

Advanced drawers:

- Incident management.
- Automation targets.
- AI suggestions.
- Asset issues.
- Audit log.

### Game Command Center

```text
[Game: Celtics vs Panthers]       [Live]
Field 6B · 8:00 AM

Score
Celtics      4
Panthers     3
[Home +1] [Away +1] [Count] [End Game]

Public links
[Open Field Page] [Open Scoreboard]

Timeline
8:12 Score updated
8:05 Game started

[Advanced: sponsors, stream, volunteers, media]
```

### Admin Home

```text
Good morning.

Needs attention
1. Field 4 delayed 30 min
2. 2 pending resource requests
3. No public alert for venue delay

[Open Venue Command]

Today
Live games  8
Upcoming    24
Alerts      1
```

## Navigation Improvements

Current navigation has too many first-class destinations.

Recommended primary admin navigation:

1. **Home**
2. **Venue Command**
3. **Games**
4. **Fields**
5. **Setup**
6. **Review**

Recommended secondary grouping:

- Setup:
  - Venues
  - Fields
  - Games
  - Sponsors
  - Resources
  - Scoreboards
  - Imports
- Review:
  - Executive
  - System Health
  - Schema Audit
  - Integrations
  - Identity
  - Audit Logs

Mobile nav:

- Bottom bar or top action strip:
  - Home
  - Command
  - Games
  - More
- “More” contains advanced pages.

## Dashboard Improvements

Dashboards should answer:

- What needs my attention?
- What should I do next?

Recommended dashboards:

- **Home:** top attention items.
- **Venue Command:** live operations.
- **Game Command:** one game.
- **Executive Review:** trends and outcomes.

Dashboards to merge or demote:

- Operations Dashboard into Venue Command/Home.
- Resource Dashboard into Venue Command and Resources setup.
- Integration Health into Review.
- Status Board into Venue Command as a mode.
- System Health into Review.

## Mobile-First Recommendations

- Use 44px minimum tap targets everywhere.
- Avoid horizontal scroll except map canvases.
- Use action sheets for secondary actions.
- Sticky bottom primary action on high-frequency screens:
  - Public field: Follow / Open live link.
  - Scorekeeper: Update score.
  - Venue Command: Start Delay / All Clear.
- Reduce card nesting.
- Use fewer badges per card.
- Use single-column forms with short labels.
- Put advanced form sections behind “More settings.”
- Avoid tables on phones; use grouped list rows.
- Use stronger contrast for sunlight use.

## Component Consolidation Opportunities

Create or standardize:

- `PageHeader`
  - title, subtitle, one primary action, optional secondary menu.
- `AttentionList`
  - top issues across dashboards.
- `PrimaryActionBar`
  - sticky mobile action.
- `StatusPill`
  - one status language system.
- `AlertCard`
  - shared public/admin alert display.
- `GameCard`
  - shared session/game summary.
- `FieldCard`
  - shared field status/current game.
- `DashboardMetric`
  - only for summary pages.
- `ActionMenu`
  - overflow actions.
- `AdvancedPanel`
  - hides audit, source, integration, and technical details.
- `EmptyState`
  - already exists; enforce across pages.

Current duplicated patterns:

- Alert stacks exist in public field and public venue pages.
- Session active/upcoming logic appears across multiple pages.
- Dashboard summary cards are repeated.
- Public field/venue branding headers are similar.
- Field status labels/classes appear in several places.
- Multiple pages define local formatters and grouping helpers.

## Pages To Split

Split only where a page has multiple unrelated jobs:

- Venue create/edit:
  - Basics
  - Branding
  - Map
  - Advanced
- Field create/edit:
  - Basics
  - Map/QR
  - Advanced
- Sponsor management:
  - Sponsors
  - Placements
  - Analytics
- Integrations:
  - Import workflow
  - Source configuration
  - Health/advanced logs

## Pages To Merge

- `/admin/dashboard` into `/admin` and `/admin/operations-center`.
- `/admin/operations-center` and `/admin/venue-command-center`.
- `/admin/weather/operations` into Venue Command Center.
- `/admin/sessions/[sessionId]` and `/admin/sessions/[sessionId]/command-center`.
- `/admin/resources/dashboard` into Venue Command Center and Resources.
- `/admin/roles` into `/admin/identity/roles`.
- `/admin/import`, `/admin/integrations`, `/admin/sync`, `/admin/sync/jobs`, `/admin/sync/review` into Imports & Integrations.
- Pilot Prep, Pilot Launch, Pilot Script into Pilot Mode.

## Pages To Hide From Default Navigation

- Schema Audit.
- Sync Jobs.
- Integration Health.
- Identity permission matrix.
- AI Assistant standalone.
- Scoreboard adapters.
- Audio profiles.
- Weather profiles.
- Organization dashboard for non-platform users.
- Demo/showcase pages outside demo mode.

## Bold Simplifications

1. Rename user-facing **Sessions** to **Games**.
2. Make **Venue Command Center** the only day-of operations hub.
3. Replace wide admin sidebar with a short role-aware nav.
4. Remove public share/display URLs from public venue pages.
5. Merge redundant dashboards.
6. Treat every technical/provider/integration detail as Advanced.
7. Create a mobile sticky primary action for day-of screens.
8. Make Crossroads demo routes separate from production admin routes.

## Prioritized Implementation Plan

### Phase 1: UX Foundation

Goal: reduce cognitive load without changing data.

1. Define role-based navigation map.
2. Replace sidebar items with Home, Venue Command, Games, Fields, Setup, Review.
3. Create shared `PageHeader`, `ActionMenu`, `StatusPill`, `GameCard`, `FieldCard`, `AlertCard`.
4. Standardize one primary action per page.
5. Hide advanced nav items.

### Phase 2: Public Experience

Goal: make parent QR scan effortless.

1. Redesign public field first screen.
2. Redesign public venue first screen.
3. Move share URLs, technical links, resource details, and community contribution forms below More.
4. Simplify alert language and display order.
5. Test on iPhone-size viewport.

### Phase 3: Operations Simplification

Goal: make venue staff faster.

1. Refactor Venue Command Center around current status and next action.
2. Merge weather operations into Venue Command.
3. Move templates/forms into action sheets.
4. Make All Clear / Start Delay / Close Venue unmistakable.
5. Add attention list at top.

### Phase 4: Game Flow

Goal: make scorekeeper and game operations obvious.

1. Merge session detail and command center.
2. Rename user-facing Sessions to Games.
3. Build role-specific scorekeeper view.
4. Move stream/sponsor/volunteer/media into advanced sections.

### Phase 5: Admin Consolidation

Goal: preserve enterprise power behind simpler doors.

1. Merge Imports/Integrations/Sync.
2. Merge Identity/Roles.
3. Move System Health/Schema Audit into Review.
4. Merge resource dashboard into Venue Command.
5. Hide demo/pilot pages unless demo mode is active.

### Phase 6: Visual System Pass

Goal: calm, modern, consistent.

1. Reduce card borders and nested panels.
2. Use fewer badges.
3. Define semantic color meanings:
   - Green: good/open/confirmed.
   - Amber: attention/delay.
   - Red: urgent/closed/emergency/live only when appropriate.
   - Slate/black: neutral/admin.
4. Normalize spacing scale.
5. Normalize button hierarchy.
6. Remove decorative metrics unless they drive action.

## Success Criteria

- A parent understands a field page in under 10 seconds.
- A scorekeeper can update score in one tap after opening the game.
- Venue staff can start delay/all-clear without scanning the page.
- Tournament director can identify delayed games in one glance.
- Admin users can still access advanced features, but only when they need them.
- Main admin navigation has six or fewer primary items.
- Every page has one obvious primary action.

