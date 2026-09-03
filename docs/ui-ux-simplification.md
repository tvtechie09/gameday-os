# GameDay UI/UX 1.0C Simplification Review

Date: 2026-09-01

Scope: implemented GameDay Venue, organization, public, and shared operational routes. Demo-only and internal diagnostic routes are identified separately and are not treated as customer-ready product proof.

## Review standard

For every screen, the first view should answer what is happening, whether anything needs attention, and the next useful action. Immediate decisions stay visible. Configuration, diagnostics, history, integration metadata, and infrequent tools move behind `Details`, `More`, or `Advanced` without removing permission-aware capability.

## Screen-by-screen findings

| Route or surface | Primary user and job | Complexity finding | Decision | 1.0C action |
| --- | --- | --- | --- | --- |
| `/admin/command-center` | Venue GM and frontline staff running today | The 1.0B assistant brief fixed the KPI wall, but quick communication, readiness, attention, field cards, rapid schedule tools, and jump links still make this a deep power-user screen. | Keep operational depth; protect the first screenful. | Keep the assistant brief and primary attention action. Leave readiness, queue, and field detail below it. |
| `/today` | Tournament operator and lighter operational roles | 1.0B already establishes chronological cards and capability-aware actions. Field controls remain lengthy when a venue has many fields. | Keep; refine status language and destructive confirmation. | Centralize labels and require explicit confirmation only when closing or placing a field in maintenance. |
| `/admin/sessions` | Scheduler locating and opening a game | Five equal-weight header actions; repeated venue/field containers; score, inning, count, timestamps, and two competing actions on every card; no forgiving search. | Highest-impact simplification. | Add phone-friendly search across event, teams, field, venue, time, and tournament. Use the universal card, one `Open game` CTA, details for score/metadata, and move infrequent tools under `Schedule tools`. |
| `/admin/sessions/new` | Scheduler adding one game | One long form exposes tournament, status, demo mode, external links, notes, and end time before the common task is complete. Uses internal `session` terminology. | Simplify common path; preserve advanced capability. | Rename visible copy to `game or event`, default the only venue, keep location/teams/start visible, move optional status, tournament, demo, links, notes, and end time under `Advanced details`, and add a sticky mobile save area. |
| `/admin/sessions/[sessionId]` | Operator running one game | Seven equal-weight links/buttons before live controls; technical follower count and full event history interrupt the immediate scorekeeping task. | High-impact follow-up. | Make score control the dominant action. Move sharing, public links, follower count, and timeline under `More game tools` / `Activity details`. |
| `/admin/sessions/[sessionId]/edit` | Scheduler correcting a game | Long administrative form with provider/link data and operational state mixed together. | Defer after create-flow learning. | UI/UX 1.1: mirror the simplified create form while preserving schedule-change notification behavior. |
| `/admin/alerts` | Venue communicator reviewing notices | Five filters always visible; cleanup controls compete with the list; every card exposes four management actions and multiple technical chips. | Simplify status hierarchy and disclosure. | Use Informational / Important / Urgent vocabulary. Move filters and bulk cleanup under disclosure, with card management under `Manage update`. |
| `/admin/alerts/new` | Staff publishing an update | Type, scope, priority, visibility, targeting, dates, and raw `Active` state appear at once. `normal/high/urgent` are implementation vocabulary. | Simplify publishing decision. | Show message, venue, and publish window first. Move targeting/delivery under `Advanced delivery`; expose the three-level alert vocabulary; rename `Active` to `Publish now`; use a sticky mobile publish button. |
| `/admin/operations-center` | Venue leadership changing venue-wide posture | 700+ lines with status modes, announcements, per-field delays, resets, asset issues, active notices, and future control surfaces. Multiple equal-weight operational mutations can affect many users. | Preserve as advanced venue-wide control, not default home. | Navigation already places it behind `GameDay`. UI/UX 1.1 should split `Change venue status` from `Advanced recovery tools`; remove `Future control surfaces` from normal operations. |
| `/admin/fields` | GM configuring fields | Each field exposes public URL, copy links, QR, edit, control, print, status, analytics, map metadata, and timestamp at once; duplicate QR actions exist. | High complexity; defer full component extraction. | UI/UX 1.1: one `Open field` action, status visible, setup and analytics under details, one QR workflow. Today remains the fast status path. |
| `/admin/fields/[fieldId]/control` | On-site field operator | 500+ lines combining score, device, audio, camera, stream, field status, and diagnostics. Appropriate power-user depth but difficult one-handed. | Keep capability; reorganize later. | UI/UX 1.1: role-based control sections, sticky current-game context, and emergency status action separated from device diagnostics. |
| `/admin/fields/work-orders` | Staff owning issues | Assignment, acknowledgement, start, resolve, and shortcut status buttons create several equal-weight controls. | Needs workflow reduction. | UI/UX 1.1: a single recommended next action per lifecycle state, secondary reassignment/details behind disclosure. |
| `/admin/resources` and `/admin/scoreboards` | Venue tech | Management lists are operationally dense but role-limited. | Keep out of normal users’ path. | Mobile navigation already moves these under More. UI/UX 1.1 should standardize device health labels and collapse diagnostics. |
| `/admin/tournaments` | Tournament director | Simple cards and one primary creation action. | Keep. | Adopt centralized status labels when tournament lifecycle states are added. |
| `/org` | Organization owner | Four equal destination cards and explanatory product-boundary copy. Clear but still dashboard-shaped. | Lower priority. | UI/UX 1.1: lead with next reservation and the most useful action; move billing/settings to More. |
| `/org/reservations` | Organization scheduler or coach | Slot inventory is the core workflow; claims and grant terminology can become technical. | Keep current permission boundary. | UI/UX 1.1: replace `grant/claim` user copy with `field access/reservation request` while leaving backend names unchanged. |
| `/fields/[fieldId]`, `/venues/[venueId]` | Parent, fan, visitor | Large public pages combine status, schedule, score, map, weather, resources, sponsors, follows, and volunteer actions. Immediate status is present but secondary sections are long. | Preserve public capability. | UI/UX 1.1: universal GameDay cards, sticky field status, directions-first action, and collapsed volunteer/resource sections. |
| `/demo/crossroads/*` | Internal sales/demo operator | Separate navigation and many future/demo concepts intentionally create density. | Do not use as the normal product UX. | Retain as demo-only; label maturity and keep it out of customer navigation. |
| `/admin/schema-audit`, `/admin/system-health`, `/admin/developer`, `/admin/demo` | Platform/internal staff | Technical terminology and tables are appropriate for diagnostic users, not consumers. | Keep internal and permission-gated. | No customer UX investment in 1.0C. |

## Navigation review

- Mobile has four role-selected destinations plus More; management and internal tools do not occupy fixed mobile slots.
- Common operational destinations remain one or two taps away.
- Desktop still exposes full permission-filtered groups because Venue GMs and platform admins need breadth.
- Remaining overlap among Command Center, Venue Status & Alerts, and field control is a product-architecture issue, not something to solve by adding more navigation.

## Status vocabulary

The UI maps existing backend values to a smaller user vocabulary without changing database constraints:

- Games: `ON TIME`, `STARTING SOON`, `IN PROGRESS`, `DELAYED`, `CANCELLED`, `FINAL`.
- Fields: `FIELD OPEN`, `IN USE`, `DELAYED`, `FIELD CLOSED`.
- Alerts: `INFORMATIONAL`, `IMPORTANT`, `URGENT`.

Backend-only distinctions such as `scheduled`, `active`, `normal`, `high`, `maintenance`, and lifecycle transition names remain available in advanced/admin detail when necessary.

## Confirmation policy

- No confirmation for ordinary reversible status updates such as opening or marking a field active.
- Explicit contextual confirmation for closing a field or entering maintenance because public pages and scheduled games are affected.
- Existing typed confirmation for bulk deletion remains appropriate.
- Delete/remove integration flows continue to require confirmation.

## Outdoor and motion review

- Shared body text and muted text meet a stronger outdoor contrast baseline; controls are generally at least 44px tall.
- Fixed mobile navigation uses 56px targets and safe-area padding.
- Status never relies only on color: every chip and banner has text, and change banners include an icon.
- Reduced-motion handling already disables nonessential animation and transition duration globally.

## Deferred legacy areas

Priority candidates for UI/UX 1.1 are the Field list/control pair, Venue Status & Alerts, work-order lifecycle actions, session editing, and public field/venue pages. They retain real capability but remain denser than the 1.0A–1.0C standard.

## Browser acceptance and persona coverage

Validated locally at 320px, 390px, 768px, and 1440px with no horizontal overflow on Today, schedule, create game, communications, publish update, and game dashboard. The pass also verified forgiving schedule search, progressive disclosure, the sticky mobile create/publish actions, and the close-field impact confirmation without applying a field change.

| Requested perspective | Implemented acceptance result |
| --- | --- |
| Venue GM | UI/UX 1.0D repaired the dev fixture to the canonical Wintrust Crossroads Sports Complex scope. Populated Command Center, Today, Schedule, Announcements, and game-detail acceptance now passes. |
| Front desk or volunteer | Venue Staff is the implemented frontline role. UI/UX 1.0D accepted its reduced navigation, populated Command Center/Today/Announcements workflows, and denied direct Schedule/Identity routes. |
| Tournament operator / team manager | Tournament Director can reach Schedule, Updates, and creation routes with reduced navigation. The Venue repository does not define a Team Manager identity, and the seeded Tournament Director also has no populated venue-scoped schedule. |
| Parent / fan | The public field experience was validated at phone width with field status, directions, schedule, follow actions, updates, sponsors, and volunteer paths and no overflow. |
| Coach | No Coach identity exists in this Venue application. Coach and Team Manager authenticated acceptance belongs to the separate Family & Teams product and must not be simulated here. |

UI/UX 1.0D supersedes the earlier fixture blocker: missing weather configuration now renders neutral unavailable copy, repeated navigation produced no Suspense fallback, and the production build plus authenticated browser acceptance passed. Full evidence is recorded in `docs/ui-ux-1.0-acceptance.md`.
