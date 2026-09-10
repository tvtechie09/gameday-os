# GameDay Improvement 2.1B — End-of-Day Operations

## Decision

End of Day is a Venue GM closeout checklist that answers one question: **Is there anything I need to handle before I leave?** It is read-only. It does not invent a venue-closed state, bulk-update games or fields, dismiss announcements, or require a meaningless acknowledgement.

## Previous behavior

The legacy route at `/admin/command-center/end-of-day` already contained trustworthy venue-local game-ledger, Work Order, field, and asset calculations. Its presentation was a retrospective report: several KPI grids, printable output, plain-text carryover rows, and no deep links. The broad Command Center guard also allowed Venue Staff to open it. Active announcements were absent, and historical dates worked only through a manually constructed query string.

## New closeout

The same compatibility URL now leads with a compact **Needs attention** list. Each item is a link to its canonical workflow:

- unresolved Work Order → Work Order detail
- closed, delayed, or maintenance field → Fields
- unfinished game → game/Schedule detail
- active operational announcement → Announcement edit/detail
- offline, unhealthy, or never-reporting trusted asset record → Venue Systems

The page does not duplicate any controls. When no attention item exists, it says **You're all set for today.** A four-line summary and progressively disclosed notes preserve useful facts without recreating a dashboard.

## Included and excluded

Included: all unresolved Work Orders in the venue, fields still delayed/closed/in maintenance, games for the selected venue day without an expected terminal state, active announcements overlapping that venue-local day, known unhealthy assets, and asset records that have never reported.

Excluded: unrelated platform/identity backlog, provider configuration, billing, sponsor metrics, broad historical analytics, and failed identity projections. Identity projection failures are a platform-admin concern today; exposing canonical identity operations to a Venue GM would violate the current product boundary.

There is no separate Issue domain in Venue: the user-facing Issue workflow is backed by `field_work_orders`, so it is counted once as Work Orders rather than duplicated.

## Authorization and isolation

The route and navigation entry now use `canManageVenueSettings`, which includes Venue GM and platform management roles but excludes Venue Staff. Middleware/direct-route and server-page checks use the same capability. The loader resolves the acting venue first and then filters fields, Work Orders, assets, announcements, and games to that venue. Organization-scoped identities remain excluded from venue operations navigation.

## Date and timezone semantics

The default date is calculated from the venue's IANA timezone. A simple native date control allows only today or the preceding 14 venue-local dates; malformed, future, or older dates fall back to today. Calendar-day comparisons use venue-local date strings, including DST transitions. This is a current-state reconstruction, not a materialized historical snapshot: later edits to a record can change how an older closeout appears.

## Responsive and accessibility contract

The page is one column with wrapping header/date controls, 44px minimum form actions, full-row focusable links, visible focus rings, semantic headings/lists, and no horizontal table. The `max-w-3xl` container supports 320, 390, 430, tablet, and desktop widths. Hosted browser acceptance remains required before release.

## Deliberate deferrals

- Persistent closeout snapshots and GM acknowledgement: no demonstrated operational need.
- Historical reporting warehouse or exports: outside the closeout job.
- Full announcement history reconstruction: current alert rows do not preserve every prior active-state transition.
- Automatic clearing/closing: unsafe and contrary to canonical workflow ownership.

No database migration is required for 2.1B.
