# GameDay Venue UI/UX 1.1D — Work Order Field-to-Resolution

## Product boundary

Work Orders remains a supporting Field Operations tool. It is not a new dashboard or a generic facilities-management product. The operational job is deliberately narrow: report a field problem, establish one owner, begin work, record the resolution, and return to field or game operations.

## Architecture audit

### Routes and creation path

- `/admin/fields` is the canonical field operating surface. Its field detail sheet deep-links to `/admin/fields/work-orders?fieldId=…`.
- `/admin/fields/work-orders` is the lightweight cross-field triage list and field-context creation route.
- `/admin/fields/work-orders/[workOrderId]` loads current information and canonical audit history only when a work order is opened.
- `/admin/fields/[fieldId]/disruption` remains the canonical affected-game and recovery workflow. Work Orders links to it rather than duplicating it.
- `/admin/sessions/[sessionId]` remains the canonical related-game route.

Creation writes the existing `field_work_orders` entity. Field-context creation carries the field as a hidden, server-validated value instead of asking the operator to select it again. The form requests only a problem title, simplified priority, and optional detail.

### Existing relationships

- Field: `field_id`, required by the current manual creation flow.
- Venue: `venue_id`, resolved from the field and used for tenant scope.
- Game/event: nullable `game_id`; shown only when it resolves to a session on a field in the caller's scoped venue set.
- Asset: nullable `asset_id`; preserved in the backend but not elevated on the compact card without a trustworthy display requirement.
- Issue type/source/system key: preserved for manual or system-generated operational issues. They are not presented as taxonomy that frontline staff must understand.
- Audit: the existing `audit_logs` table with `resource_type = field_work_order` is authoritative. No parallel comments/history table was added.

### Assignment, notes, notifications, and permissions

Assignment uses approved, active, role-filtered venue assignments. It does not expose every platform user. `I'll Take It` is the fast self-assignment path. Managers can assign/reassign an eligible teammate in a focused sheet. Notes are canonical audit events and appear in History.

No work-order-specific automatic notification chain existed, so this sprint does not claim or invent one. Escalation raises priority to urgent and writes an audit event; the confirmation explicitly says it does not send an external notification.

All mutations require an authenticated actor, `venue.field.manage`, non-organization scope, and object-level venue/field scope. Assignment to another person, reassignment, escalation, and reopen additionally require `venue.manage`. Navigation visibility is not treated as authorization.

## Old workflow

The old root mixed triage, free-text assignment, due-date entry, acknowledgement, start, resolution entry, Resolve, and Reopen controls inside every list row. Multiple equally weighted actions were visible even when they were not valid for the current lifecycle. The list loaded work orders broadly and filtered scope in memory. It showed current lifecycle fields but could not show actor history. Returning to a field lost the selected-field sheet context.

Observed minimum interaction counts before 1.1D:

| Task | Old interactions | Friction |
| --- | ---: | --- |
| Open a field-related work order | 2 taps | Field card → View details → Open field issues. |
| Assign | 2+ interactions | Type a free-text role, optionally choose a due time, then Save; no eligible-person picker. |
| Acknowledge | 1 tap | Available alongside competing actions and without clear ownership rules. |
| Start work | 1 tap | Could be shown before a valid acknowledgement. |
| Escalate | Not supported | No action or plain-language meaning. |
| Mark resolved | 2 interactions | Optional note plus Resolve, while a second Resolve control was also visible. |
| See who changed what | Not possible | Only current row fields/timestamps were available; canonical audit history was not presented. |
| Return to related field | 1 tap, context lost | Generic Back to Fields did not reopen the related field. |

## Final lifecycle

No migration or new status was needed. Existing values support the intended workflow, and legacy `done` rows remain readable as resolved.

| Backend value/condition | Visible state | Meaning |
| --- | --- | --- |
| `open` with no owner | New | Reported but nobody owns it. |
| `assigned` or an existing assignee | Assigned | One venue teammate owns the next decision. |
| `acknowledged` or existing acknowledgement timestamp | Acknowledged | The owner has explicitly accepted responsibility. |
| `in_progress` | In Progress | Work has begun. |
| `resolved`, legacy `done`, or `closed_at` | Resolved | Work is complete and the resolution is retained. |

The only normal forward transitions are New → Assigned → Acknowledged → In Progress → Resolved. Management may reopen Resolved → New. Blocked and Cancelled were not added because the existing domain has no canonical states for them. Escalated is not a separate lifecycle state; it is urgent priority plus an audit event.

## Next-action model

The reusable mobile card derives one dominant control from lifecycle, actor ownership, and capability:

- New + worker capability: `I'll Take It`.
- Assigned to the current user, unowned legacy assignment, or management: `Acknowledge`.
- Acknowledged by the current user or management: `Start Work`.
- In Progress and owned by the current user, unowned legacy work, or management: `Resolve`.
- Resolved, view-only, or work owned by another staff member: `View Details`.

Reassign, escalation, notes, related field/game/disruption links, and reopen are subordinate under More Actions. Server status predicates repeat the lifecycle rules; the UI is not trusted to enforce them.

## Assignment experience

Self-assignment is one tap and conditionally updates only an unassigned `open` record. If two workers claim the same version, the first succeeds and the second receives a conflict message. Management assignment uses a venue-scoped eligible-person sheet. The server re-resolves the target person against an approved, active assignment for the exact venue before writing.

## Acknowledgement and start

Acknowledgement is a separate responsibility signal, not silently combined with assignment. It records the actor and time once. Starting work is a single action with no form. Staff cannot advance work assigned or acknowledged by somebody else; management retains intervention authority.

## Resolution and field status

Resolve opens a focused sheet with one optional resolution note and one `Mark Resolved` action. Failed requests keep the note in place and report a safe error. Success records `closed_at`, the resolution note, actor audit event, and a resolved confirmation on the detail screen.

Resolution never changes field availability. If the related field remains Delayed, Closed, or Maintenance, the resolved view explicitly prompts the operator to review field status and deep-links back to that field.

## Field and game context

Field context is carried through Field Operations → work-order root → create/detail → return. The work-order card leads with the field name. `Back to Field …` returns to `/admin/fields?fieldId=…`, and Field Operations reopens that field's detail sheet.

When `game_id` resolves to a scoped canonical session, the card shows the game label, venue-local start time, and current game status, with a link to the canonical game page. Field-bound work also links to the existing disruption review for affected games. No impact is inferred when there is no trusted relationship.

## Issue vs Work Order

An **issue** is the plain-language problem reported from a field. A **work order** is the same canonical record once GameDay needs ownership, lifecycle, resolution, and auditability. Operators use one report path and are not asked to choose between two near-duplicate object types. The backend remains `field_work_orders`; system issue metadata is preserved and no casual data-model merge or duplicate engine was introduced.

## Audit and history

The list retrieves lightweight current summaries and never fetches history per card. The detail route queries `audit_logs` once for the opened work order, batches actor display-name lookup, and translates canonical event names into plain language such as `Assigned to Alex by Pat` or `Resolved by Alex: Replaced cable`. Current Information stays above History so audit detail does not dominate the operational task. Legacy records without canonical events keep a transparent legacy-history message.

## Work Orders root and attention integration

The root has only four filters: Needs Attention, Mine, Open, and Resolved. Needs Attention includes unresolved work that is unassigned, overdue, Important, or Urgent. The existing Fields and Home/Today operational projections continue to consume the same work-order rows; this sprint adds no competing board, duplicate polling, or copied list.

## Mobile acceptance

Acceptance passed at 320, 390, 430, 768, and 1440px with no document-level horizontal overflow. At 320px the four root filters wrap into two rows rather than becoming a hidden horizontal scroller. At 390px a Venue GM completed the primary lifecycle using normal browser interactions: Field detail → work orders → `I'll Take It` → Acknowledge → Start Work → Resolve with a note → resolved detail/history → return to the still-closed field. The detail history showed the report plus the four canonical transition events and the field link reopened the originating field sheet.

The same isolated development fixture verified trusted upcoming-game context, disruption recovery linking, a venue-scoped assignee list, manager escalation to Urgent with an audit event, and Venue Staff visibility without assignment, escalation, reopen, or reassignment controls. Direct staff, unauthenticated, invalid-transition, optimistic-conflict, and cross-venue mutation denials are covered by server/action regression tests. No staging or production record was used.

The implemented controls use 44–52px targets, semantic headings, visible text status, non-color-only priority/status labels, existing focus-managed dialog/sheet primitives, localized pending states, disabled repeat actions, and no horizontal ticket table.

## Deferrals

- Photo/evidence upload: defer until Work Orders has a canonical attachment policy and storage lifecycle.
- Blocked/cancelled states: defer until customer evidence proves these are necessary and the backend semantics are defined.
- Automatic escalation notifications: defer until notification recipients, delivery policy, and failure behavior are product decisions.
- Offline synchronization: explicitly out of scope; current behavior preserves inputs and exposes retryable errors on weak connections.
- Recent-assignee ranking and team queues: defer until usage data exists; current safe list is role- and venue-scoped.
- Asset-specific controls: retain the backend relationship but keep device remediation in existing asset/control surfaces.
- Advanced filtering, SLAs, dependencies, inventory, and facilities reporting: defer to avoid turning GameDay into generic ticketing software.
