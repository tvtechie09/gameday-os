# GameDay Venue UI/UX 1.1B — Field Disruption Recovery

## Pre-implementation workflow audit

The implemented product can identify a disrupted field, but the recovery journey is split across six operating surfaces. `/admin/fields` is the best detection surface after UI/UX 1.1A; `/admin/command-center` owns the only conflict-checked manual move; `/admin/sessions` and the game routes own detailed schedule context; `/admin/fields/work-orders` owns issue lifecycle; `/today` repeats day-of status; and `/fields/[fieldId]` owns the public QR projection.

| Operator step | Current route and behavior | Gap before UI/UX 1.1B |
| --- | --- | --- |
| Mark a field delayed, closed, or in maintenance | `/admin/fields` changes the canonical field status after capability and field-scope checks. Closure/maintenance confirmation states that games are not moved automatically. | The resulting card counts upcoming games for closure/maintenance, but does not list them or provide a disruption-specific next step. |
| Understand active issues | Field detail shows the highest-priority unresolved work order and a total count. | **Open field issues** lands on the unfiltered `/admin/fields/work-orders` board, so the triggering field context is lost. |
| Determine affected games | Field detail links managers to `/admin/sessions?q={field name}`. Staff do not see that link because it uses the broader schedule-management capability even though the existing rapid operation allows `venue.field.manage`. | The operator must leave the field, search a mixed historical schedule, and infer which games are relevant. There is no In Progress / Starting Soon / Later Today impact view. |
| Review a game | `/admin/sessions/[sessionId]` shows live and game details. | The field disruption and a return destination are not carried into the game context. |
| Move a game | `/admin/command-center` exposes a compact **Move to…** form. It calls `rapidScheduleAction`, which calls `executeRapidScheduleOperation`, performs venue boundary and permission checks, rejects overlaps, and writes atomically through `apply_schedule_operation`. | Reaching the control from Fields requires unrelated navigation. The form does not show from/to context in a confirmation and always redirects to Command Center. |
| Audit and communicate the move | The canonical operation writes the actor into the provider-neutral outbox, records an operations event, queues existing schedule-change communication, and writes an audit log. | The audit summary contains count and operation ID but not the old/new field and time values; the success copy only reports a count. |
| See current and next games internally | Field Operations and Command Center independently calculate current and next. Today uses another 30-minute lookback rule. | Lifecycle exclusions and time boundaries differ, so cancelled, postponed, stale scheduled, or completed rows can be classified differently. |
| See current and next games publicly | `/fields/[fieldId]` independently calculates active, next, upcoming, and Today using server-local calendar dates. Its top card falls back to a final or any scheduled row. | A historical completed/scheduled row can appear as **Next Game** while Today is empty. Venue timezone, cancellation, and moved-game rules are not shared with internal projections. |

### Duplicated and disconnected behavior

- **Fields** should remain the physical detection and field-status surface.
- **Today** should remain the mobile day timeline and role-specific quick-action surface.
- **Schedule** should remain the full game inventory and detailed edit surface.
- **Command Center** currently duplicates field current/next, issues, field state, and rapid movement. Its schedule mutation is canonical and must be reused, but the move control should be reachable contextually rather than requiring Command Center discovery.
- **Operations Center** duplicates venue/field status and delay controls, with a wider communications focus. It should not gain another disruption board in this phase.
- **Issues** remains the canonical work-order lifecycle, but needs a field-preserving query so a field detail action does not discard context.

## Implementation record

### Implemented workflow

- Field Operations now makes **Review impact** the primary action for delayed, closed, maintenance, or issue-flagged fields. Status changes remain explicit and never move games automatically.
- `/admin/fields/[fieldId]/disruption` is a contextual recovery view. It explains why the field is disrupted, groups affected games into **In Progress**, **Starting Soon**, and **Later Today**, and provides a useful empty state when no remaining game needs a decision.
- Issue links retain `fieldId`; the work-order board and report form filter and preselect the triggering field.
- A manager or staff operator with `venue.field.manage` can open a contextual **Move game** flow. The flow names the original field and time, previews the target, preserves the original start time by default, and allows an explicit time change when needed.
- The move submits through the existing `executeRapidScheduleOperation` service and `apply_schedule_operation` RPC. There is no second schedule-write implementation.

### Current, next, and Today semantics

`session-projection-core.ts` is now the shared projection used by Field Operations, Command Center, scoreboard display, venue display, public venue pages, and public field pages.

- **Today** means the venue's local calendar day, using the venue timezone rather than the server timezone.
- **Current** means an eligible session on Today whose state or time window makes it active now. A stale historical row marked active/live is not current.
- **Next** means the earliest eligible future session after current time. It may be beyond Today so a quiet field can still show its genuinely next scheduled game.
- Cancelled, postponed, final, completed, and archived sessions are excluded from Current and Next. They may still appear in a full Today schedule when that schedule is intentionally historical.
- The public field page no longer falls back to a historical final or stale scheduled row for **Next Game**. With no eligible future session it says **Not scheduled** and **No session scheduled**.

### Affected-game rules

- **Closed or maintenance:** current plus every remaining valid game on Today.
- **Delayed:** current plus the next valid game on Today. The page explicitly states that later games are uncertain rather than claiming the entire day is affected.
- **Open field with an unresolved issue:** current plus the next valid game on Today.
- Invalid lifecycle states are never offered for movement, and both the page loader and server action re-check that the selected game is still in the affected set.

### Movement, permissions, conflict checks, and audit

- Both source and target fields must remain inside the signed-in venue. The action requires `venue.field.manage`; the canonical operation independently repeats that permission check.
- The target conflict preview is advisory. The canonical operation rechecks overlap server-side immediately before applying the change.
- The default operation moves only the field. Start time changes only when the operator explicitly supplies a different valid time.
- Audit metadata now records session/game identity, original and new field IDs/names, and original and new start times. Existing provider-neutral outbox, operation-event, and schedule-change communication behavior remains canonical.
- Successful completion states **Public schedule updated** and returns the operator to the disruption context. Existing communications remain best-effort; this phase does not claim delivery to a recipient or partner system.

### Role and public boundaries

- Venue GM, Venue Staff, and Venue Tech Manager retain the same frontline `venue.field.manage` boundary for status changes and contextual movement. A dedicated route guard was added ahead of the field-configuration catch-all so staff do not see an action that direct navigation rejects.
- Field setup and configuration routes still require the broader field-management capability. Family/public roles cannot open internal disruption routes.
- Public pages receive only the existing public-safe field, venue, session, alert, and sponsor projection. Internal work orders, operator identity, conflict details, and audit metadata are not rendered publicly.

### Acceptance evidence

- Automated tests cover closure/maintenance, delay, issue, no-impact, stale active rows, venue-local dates, lifecycle exclusions, next-beyond-Today behavior, route guards, canonical authorization, audit metadata, and public no-historical-fallback behavior.
- Browser acceptance passed for Venue GM and Venue Staff on Field Operations and the disruption empty state. The live development dataset had no remaining games on the operating day, so no schedule mutation was performed. The populated close/delay and movement/conflict paths are covered deterministically by service and route tests; a real browser move still belongs in staging when an affected fixture is available.
- Responsive checks passed without horizontal overflow at 320, 390, 430, 768, and 1440 pixels for Field Operations and the disruption view.
- Public Field 8 showed **Not scheduled** and **No session scheduled** rather than surfacing an old game as next. Browser logs contained only the pre-existing `venue_assets.health_message` schema warning; no new client error was observed.
- No migration, production schedule mutation, push, or deployment is part of UI/UX 1.1B.

### Recommended UI/UX 1.1C boundary

Keep the next phase focused on eliminating remaining duplicate day-of projections and controls, not adding automation. Command Center should deep-link to this same disruption review instead of retaining a competing compact move form; Today should consume the shared projection directly for every field/game card; and the public venue/field status language should share one small presentation adapter. Defer automatic rescheduling, bulk movement, partner-write automation, and notification-delivery promises until pilot evidence proves operators trust the manual recovery flow.
