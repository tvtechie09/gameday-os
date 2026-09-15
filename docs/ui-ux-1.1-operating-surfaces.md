# GameDay Venue UI/UX 1.1 — Operating Surfaces

## Decision summary

GameDay Venue now uses one primary surface per operational question:

- **Home — Where should I go next?** A lightweight router and attention summary.
- **Today — What is happening now and throughout this day?** A chronological venue-day projection.
- **Fields — Where is it happening and what needs attention?** Physical-location state, current/next games, disruptions, and contextual issues.
- **Schedule — What is planned and what needs to change?** Search, creation, editing, imports, and administrative schedule operations.

Command Center is retired as a user-facing board and redirects to Today. Operations Center is narrowed and renamed **Venue Status**: it exists only to set the official venue-wide operating state. Issues, work orders, announcements, reports, setup, and device tools remain supporting surfaces under **More** or contextual links.

## Before

The prior model put nine destinations in a Venue GM's `Run Today` navigation: Command Center, Venue Status & Alerts, Schedule, Tournament Operations, Fields, Scoreboards, Venue Systems, Announcements, and Reports. Four of those could describe the same day from a slightly different angle. Venue Staff saw Command Center, Venue Status & Alerts, Fields, and Announcements, with field-status controls repeated again inside Today.

The duplication was behavioral, not only naming:

- Today and Command Center both counted today's games, presented live/upcoming events, surfaced alerts, and offered quick actions.
- Command Center and Fields both presented current/next by field, field state, issues, and disruption actions.
- Command Center and Schedule both changed game times or fields.
- Operations Center, Today, Fields, and Announcements all changed or communicated field/venue status.
- Operations Center also contained duplicate announcement management, per-field delays, asset summaries, history, speculative decision cards, incident placeholders, and future automation placeholders.

This forced operators to learn the implementation history instead of following a stable mental model.

## Route inventory

| Route | Audience and permission | Primary question | Data and actions | Mobile use | Decision |
|---|---|---|---|---|---|
| `/admin` | Venue managers with the admin-workspace capability | Where should I go next? | Today's event/live/attention counts and links to Today, Fields, Schedule, and support tools | High; short routing page | **Keep and narrow** as Home |
| `/today` | Roles with operational tasks; venue and non-venue operators | What is happening now and during this venue-local day? | Changed, current, next, later, completed events; current alerts; immediate start/delay actions | Highest | **Keep** as canonical chronological surface |
| `/admin/fields` | Venue operators; configuration remains separately capability-gated | Where is play happening and what physical location needs attention? | Field state, current/next, disruption impact, contextual work orders, public field links, configuration for authorized roles | Highest | **Keep** as canonical physical surface |
| `/admin/sessions` | Schedule managers only; Venue Staff remains denied | What is planned and what needs to change? | Search, future/history, game creation/editing, officials, imports, generation, bulk tools | High for lookup and targeted changes | **Keep** as canonical schedule surface |
| `/admin/command-center` | Former venue-operator audience | Previously combined Today, Fields, Schedule, issues, devices, communications, and readiness | Duplicate aggregate board and duplicate rapid actions | Busy on small screens | **Redirect** to `/today`; preserve query values |
| `/admin/venue-command-center` | Legacy bookmark | Legacy alias | None | N/A | **Redirect** directly to `/today` |
| `/admin/operations-center` | Venue operators | What is the official venue-wide operating state? | Apply normal, weather delay, schedule delay, closed, emergency, or maintenance state to the whole venue | Occasional but urgent | **Narrow** to Venue Status and move under More |
| `/admin/fields/work-orders` | Venue operators | What operational work is open across the venue? | Global priority/lifecycle triage; field-filtered deep links; assignment, acknowledgement, progress, resolution | Medium | **Keep under More**, with contextual entry from Fields |
| `/admin/alerts` | Roles allowed to publish communications | What updates are active and what should be published? | Compose, publish, filter, edit, expire, hide, and review communications | Medium | **Keep under More** as management surface; Today only displays current updates |
| `/admin/sessions/[sessionId]` | Schedule/game operators | What is happening with this game? | Game state, score controls, public links, edit and device tools | High when reached contextually | **Keep** as game detail |
| `/admin/fields/[fieldId]/control` | Field/device managers | What controls and systems belong to this field? | Score, device, alert, and full field controls | Medium; expert surface | **Keep contextual**, not primary navigation |
| `/admin/fields/[fieldId]/disruption` | Operators allowed to change field state | What games are affected by this field problem? | Impact review, field-context issues, and canonical move workflow | High during disruption | **Keep contextual** from Fields |
| `/admin/command-center/end-of-day` | Venue operators | What happened today and what carries forward? | Retrospective game, schedule, issue, field, and device report | Low-frequency management | **Keep as report compatibility route**; return link points to Today |
| `/admin/executive` | Venue management | What outcomes and trends need review? | Retrospective reporting | Low day-of frequency | **Keep under More** |

## Capability matrix after consolidation

| Capability | Home | Today | Fields | Schedule | Venue Status | Announcements | Work Orders |
|---|---:|---:|---:|---:|---:|---:|---:|
| Venue-day count / live count | Summary | **Owns** | By field | All records | No | No | No |
| Chronological day view | Link | **Owns** | No | Searchable plan | No | No | No |
| Current / next by location | Link | Event cards | **Owns** | Searchable plan | No | No | Field context only |
| Field state | Attention count | Attention only | **Owns per field** | Context only | Whole venue only | Communicated result | Field context |
| Disruption impact | Link | Deep link through event/field | **Owns** | Administrative edit | No | Public message only | Related issue |
| Move game | No | Contextual drill-down | Disruption deep link | Administrative edit | No | No | No |
| Immediate start / delay game | No | **Owns** | Current-game context | Administrative control | No | No | No |
| Venue-wide state | Link | Displays effect | Displays effect | Displays schedule effect | **Owns** | Publishes resulting update | No |
| Compose/manage announcements | Link | Displays active only | Field context only | No | Link only | **Owns** | No |
| Field issues | Count/link | Lightweight summary | Contextual summary/link | No | No | No | **Owns global triage** |
| Work-order lifecycle | Link | Summary/link | Field-filtered link | No | No | No | **Owns** |
| Setup/configuration | No | No | Disclosed tools for permitted users | Disclosed tools | No | Advanced delivery options | No |

## Status projection decision

Today no longer has its own “30 minutes overdue” cutoff. `selectTodayEvents` uses the shared venue-day helpers, and `buildTodayTimeline` uses the same current/future eligibility semantics as internal and public field projections. The header count and timeline receive the same filtered event collection. Every non-draft/non-archived venue-day event is placed in changed/attention, current, next, later, or completed.

This fixes the accepted staging defect where Today said `1 event` while rendering `No games today`: an overdue scheduled game was counted by the server but rejected by the client timeline after 30 minutes.

## Final operating model

### Home

Home is a lightweight manager router. It shows only the venue-day event/live/attention summary and explains where each question belongs. It does not render a field board, schedule editor, communication manager, or inventory dashboard.

### Today

Today owns the venue-local chronology and immediate game-state actions. It displays active announcements and lightweight attention. Field administration and announcement composition were removed because their canonical homes already exist.

### Fields

Fields owns physical operational state, current/next by location, field-specific issues, field closure/delay/maintenance actions, and disruption recovery. The field detail sheet preserves field-filtered work-order and schedule links.

### Schedule

Schedule owns searching, creating, editing, importing, and administratively changing games. Its page now includes a server-rendered schedule-capability check, so Venue Staff cannot reach it through a direct URL.

### Command Center

**Retired.** It duplicated Today, Fields, Schedule, Announcements, and Work Orders. `/admin/command-center` remains as an authorized compatibility redirect to Today. The obsolete aggregate page, rapid-action UI, issue-action UI, and checklist component were removed. Canonical schedule, field, and work-order actions remain in their domain surfaces.

### Operations Center / Venue Status

**Narrowed.** Its one-sentence purpose is: **Set the official operating state for the entire venue.** Per-field delay management moved to Fields, custom communication management remains in Announcements, and duplicate asset/history/AI/incident/future-automation sections were removed.

## Issues, work orders, and communications

- Field-related issues appear in Fields and retain `fieldId` when opening Work Orders.
- The global Work Orders view remains under More for cross-field prioritization and lifecycle management.
- Today displays important active announcements but does not compose or administer them.
- Announcements remains the management surface for composing, publishing, targeting, filtering, editing, expiring, and historical review.
- Venue Status publishes only standard venue-wide operating messages. Custom wording and time windows route to Announcements.

## Role navigation

| Role | Primary navigation | More / contextual access |
|---|---|---|
| Venue GM / Director | Home, Today, Fields, Schedule | Venue Status, Announcements, Work Orders, reports, setup, devices, and other permitted management tools |
| Venue Staff | Today, Fields | Venue Status, Announcements, Work Orders, account; no Schedule or field setup |
| Venue Tech Manager | Home, Today, Fields | Venue Status, Work Orders, Venue Systems, Scoreboards; no Schedule without schedule capability |
| Coach / Scorekeeper | Today only when operational permission applies | No venue-internal Fields, Work Orders, or retired aggregate board |

Navigation visibility and route behavior are not the authorization boundary. Today, Home, Fields, Schedule, Venue Status, and the legacy redirect each enforce their applicable server-side capability/scope behavior.

## Route compatibility and context

- `/admin/command-center?...` → `/today?...`, preserving ordinary query values.
- `/admin/venue-command-center?venueId=...` → `/today?venueId=...`.
- `/admin/sessions/[sessionId]/command-center` → `/admin/sessions/[sessionId]`, preserving game context.
- Field disruption links retain `fieldId` and `sessionId`.
- Fields → Work Orders retains `?fieldId=...`.
- Field → Schedule retains a field-name search.
- The end-of-day report remains available and returns to Today.

## Removed complexity

- Venue GM primary `Run Today` destinations: **9 → 4**.
- Venue Staff primary destinations: **4 → 2** (Today and Fields), with support tools under More.
- Duplicate top-level aggregate boards: **1 retired** (Command Center).
- Mixed-purpose Operations Center: **8 major content groups → 2** (current state and whole-venue actions).
- Duplicate Today control families: **2 removed** (field administration and announcement composition).
- Obsolete Command Center UI modules: aggregate page replaced by redirect; rapid/issue action module and mode-checklist component removed.

## Five-second usability acceptance

### Venue GM

1. What is happening now? **Today**, reinforced by the Home summary.
2. Does anything need attention? **Home summary and Today changes**, then Fields for physical action.
3. Where is field status? **Fields**.
4. Where is a schedule changed? **Schedule**.
5. Is there uncertainty between Today, Command Center, and Operations Center? **No**. Command Center redirects; Venue Status is explicitly a whole-venue action under More.

### Venue Staff

1. What is happening? **Today**.
2. How do I reach a field? **Fields** is primary navigation.
3. Are inaccessible management features absent? **Schedule and field setup are absent and server-denied**.
4. Are unnecessary admin concepts shown? **No primary admin concepts**; permitted support tools are under More.

### Responsive browser evidence

Read-only acceptance used an isolated Crossroads development fixture. The linked Vercel preview configuration was verified to target Supabase staging project `oiyitfatarrhnussyxfu`, but its sensitive server-only values were not downloadable, so it was not used to run a misleading partial live test. No staging or production record was mutated.

At **320, 390, 430, 768, and 1440 pixels**:

- Home displayed the live/day and attention summaries, the three destination cards, and Home / Today / Fields / Schedule navigation without horizontal overflow.
- Today displayed `2 events, with 1 live now`, both matching event cards, the attention section, and direct Fields/Schedule guidance without horizontal overflow.
- Fields displayed Field 9's delayed state, current and next games, contextual issue, and disruption entry without horizontal overflow.
- Schedule displayed both fixture games, search, and the add-game entry without horizontal overflow.
- The public Field 9 page displayed one canonical live game and one canonical next game without horizontal overflow.

The GM journey reached Fields → disruption review → the affected game's manual move screen while retaining field and game context; no move was submitted. The legacy Command Center URL redirected to Today and preserved both supplied query values. Venue Staff saw Today and Fields as primary navigation, found permitted Venue Status / Announcements / Work Orders under More, reached Fields, and was redirected away from Home and Schedule by the existing authorization guards.

The final automated suite is **522 / 522 passing**. TypeScript, production build, and static client-readiness pass. Lint has zero errors and retains one unchanged warning in `set-password-form.tsx`. Live HTTP client-readiness remains deferred because the approved preview pull did not expose the required sensitive server configuration.

## Deferrals

- A dedicated Work Order UX progression sprint remains useful; this phase only clarified ownership and preserved contextual entry.
- The end-of-day report URL remains under the legacy `command-center` segment. A future report-information-architecture sprint may move it with a compatibility redirect.
- The internal `command-center-core` name remains because its tested projection helpers serve Fields, reports, impact, demo-day, and schedule calculations. Renaming a shared domain module would add migration risk without reducing user-facing complexity.
- Staging schema drift, existing provider outbox history, and the prohibited dangling test assignment are outside this UI consolidation.
- No new analytics, automation, AI, payments, registration, league management, scorekeeping, or streaming capability was added.
