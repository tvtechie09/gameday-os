# GameDay Venue UI/UX 1.1A — Field Operations

## Pre-implementation workflow audit

The previous `/admin/fields` screen was an inventory and configuration surface, not a day-of field-operations screen. Every field rendered a large card containing map metadata, public analytics, URLs, QR controls, an embedded public-page preview, edit/control links, and a generic status selector. At a 31-field complex this made rapid scanning impractical and mixed uncommon setup work with frequent outdoor operations.

| Operator question or task | Previous path | Interaction cost and friction |
| --- | --- | --- |
| View all fields | Open **Fields**, then scroll through venue groups | One navigation action, but several screens of oversized cards; only a few fields visible at once. |
| Check whether a field is open | Open **Fields**, locate the field, read its badge | Status existed, but QR, URL, analytics, preview, and setup controls competed with it. |
| Find the current game | Open **Command Center** or open a field's **Control** page | At least one extra navigation step; the Fields list had no current-game context. |
| Find the next game | Open **Command Center**, **Schedule**, or field **Control** | At least one extra navigation step and often a search/scroll. |
| Close or reopen a field | Open **Fields**, find the field, choose a value, then press **Update** | Three deliberate interactions after locating the field; the confirmation did not explain the number of affected games. |
| Mark maintenance | Same generic status selector on **Fields** or field **Control** | Maintenance, closure, and delay appeared as equivalent enum choices without plain-language distinctions. |
| View field issues | Leave Fields for **Work orders** or inspect Command Center attention | The Fields list did not show unresolved issues or link the affected field directly to issue context. |
| Find delayed fields | Visually scan every large card or use another operations screen | No field filter or attention view; delayed fields could be separated by many screens of setup content. |

Authorization was also inconsistent with the intended frontline workflow. Venue Staff holds `venue.field.manage`, and the mutation service enforces that permission plus venue scope, but navigation and the `/admin/fields` route guard required broader field-administration capabilities. Staff could change status on Today/Command Center but could not open Fields.

## Implementation decisions

- `/admin/fields` becomes the primary Field Operations screen. Configuration, QR administration, bookings, reservations, and new-field setup remain available as secondary management tools for roles that already have those permissions.
- Initial rendering uses bulk scoped fields, sessions, and work orders. It does not issue one request per field.
- The default order is natural field-name order within each venue (for example, Field 2 before Field 10). Outdoor staff build a physical mental map around field numbers; silently moving abnormal fields would make that map unstable. Abnormal cards use icon, text, border, and background treatment, and **Needs Attention** is a one-tap filter.
- The four operational filters are **All**, **Active**, **Needs Attention**, and **Closed**. Search is forgiving but optional.
- A compact FieldCard shows name, unambiguous status, current game, next game, the highest-priority active issue, and one contextual primary action. Secondary data and less-likely status changes live in a field detail sheet.
- Closing or putting a field into maintenance requires contextual confirmation showing the active and upcoming game impact. No game is moved, cancelled, or rescheduled automatically.
- Maintenance means the playing surface is unavailable for grounds/facility work; delayed means play is temporarily held with an expectation of resuming; closed means the field is not available for play until reopened. Existing backend enums remain unchanged.
- A field needs attention when existing data shows an abnormal field status, unresolved work order, delayed current game, or a closure/maintenance condition affecting upcoming games. No synthetic issue data or new backend issue state is introduced.

## Acceptance record

### New workflow and component hierarchy

`/admin/fields` now opens with one compact six-value situation summary followed by four filters, optional search, and naturally ordered field cards. A manager can identify an abnormal field from icon + text + border treatment, use the card's single contextual action, or open the native mobile sheet without leaving the screen.

The implementation is split into:

- `src/lib/services/field-operations-core.ts`: pure bulk projection, current-operating-day filtering, natural ordering, attention signals, summary, filters, and forgiving search.
- `src/app/admin/fields/page.tsx`: scoped server reads and role-shaped setup tools.
- `src/app/admin/fields/field-operations-board.tsx`: compact FieldCard, summary, filters/search, native detail Sheet, contextual status actions, and native impact Modal.
- `src/app/admin/fields/actions.ts`: capability + venue-scope checked field-status mutation with audit-preserving `updateFieldStatus` and public/internal revalidation.

The FieldCard hierarchy is:

1. field name and icon-backed status;
2. explicit needs-attention signal when applicable;
3. current game and next game;
4. highest-priority unresolved issue or affected-game count;
5. one contextual primary action and **View details**.

Common status actions are now one deliberate interaction for **Mark delayed**, **Return to open**, and **Reopen field**. Closure and maintenance remain two deliberate interactions because they open an impact explanation before the audited write. The detail sheet explains the difference among open, active, delayed, closed, and maintenance in plain language.

### Sorting, filtering, and unusual states

The default stays in physical/natural name order. **Needs Attention** returned the seven hosted fixture fields with abnormal status or unresolved issues in one tap. The empty-search result includes a recovery action. Long content is line-clamped or allowed to wrap without widening the page. Unit coverage verifies 31 fields, one/multiple closures, a delayed field, an active issue, current/next games, no current schedule, natural Field 2/Field 10 ordering, and missing aliases.

Search accepts numeric and colloquial physical-field language. Generic words such as `field`, `baseball`, `softball`, and `diamond` do not block a match when a specific number/name is present. On the hosted fixture, `Baseball 9` correctly finds Field 9, Field 9A, and Field 9B even though their canonical sport is softball and no map alias is stored.

Only sessions on the venue's current operating day are eligible for current/next context. Browser acceptance initially exposed old scheduled rows appearing as 52,000-minute delays; venue-timezone filtering now correctly renders **None** when no games exist today.

### Permissions and public behavior

| Persona | Result |
| --- | --- |
| Venue GM | Can scan all 31 fields, use status actions, review games/issues, and reach setup/full controls. |
| Venue Staff | Can open Fields from navigation, scan all 31 fields, use permitted status actions, and reach field issues. Setup tools are not rendered. |
| Venue Staff direct setup URL | `/admin/fields/new` is denied and redirects to Command Center. |
| Public user | `/admin/fields` redirects to sign-in. |
| Public field page | Field 3 continued to show `DELAYED`; internal issue text, admin controls, and internal ID text were absent. |

Every mutation rechecks `canOpenCloseField`, then `assertFieldInScope`, then calls `updateFieldStatus(fieldId, status, ctx.userId)`. Frontend visibility is not treated as authorization.

### Responsive and browser acceptance

Validated in the in-app browser against the populated **Wintrust Crossroads Sports Complex** fixture:

| Width | Layout | Result |
| --- | --- | --- |
| 320px | one card column | No horizontal page overflow; 48px operational actions; summary, filters, search, and cards remain usable. |
| 390px | one card column | Native bottom sheet and nested impact modal passed; one-hand actions remain reachable. |
| 430px | one card column | No horizontal page overflow. |
| 768px | two card columns | Field hierarchy remains readable without table compression. |
| 1440px | three card columns | Dense 31-field scan with no horizontal page overflow. |

Manager morning scan, issue discovery, search, needs-attention filtering, safe close-field confirmation, Staff access, Staff setup denial, logged-out denial, and public status/privacy were exercised. The close-field acceptance stopped at **Keep current status**; no persistent operational status was changed. No synthetic `.test` records were changed or cleaned up.

### Validation

- Full suite: 505 tests passing after the final historical-schedule regression was added.
- TypeScript: passing.
- Lint: zero errors and no new warnings. The pre-existing `set-password-form.tsx` internal-navigation warning remains unchanged.
- Static client-readiness contracts: passing.
- Production build: passing; `/admin/fields` remains a dynamic server-rendered route and `src/proxy.ts` remains active.
- Final Field Operations browser console: no errors or warnings.

### Backend limitations and deferrals

- The hosted fixture has no games on the September 1 operating day, so browser acceptance truthfully showed no current/next games; deterministic unit scenarios validate populated current/next and affected-game behavior.
- The existing public field page's older top-level **Next Game** module can still show a historical scheduled row while its **Today's Schedule** section says no sessions today. Public status propagation is correct, but that pre-existing public schedule inconsistency was outside this internal-screen redesign.
- The public field page also logs the existing `venue_assets table is unavailable; returning no assets` fallback in this environment. Field Operations does not depend on that table.
- **Open field issues** currently lands on the scoped issue board rather than a field-filtered issue detail route.
- No GIS field map, automatic rescheduler, automatic cancellation, or automatic game move was introduced.

## Recommended UI/UX 1.1B priority

Build a **field disruption review** on top of the existing schedule-management path: deep-link the affected games for one closed/delayed field, let an authorized scheduler review or move those games using existing schedule operations, and keep public/internal current-next projections consistent. Keep every move explicit and auditable; do not introduce automatic rescheduling yet.
