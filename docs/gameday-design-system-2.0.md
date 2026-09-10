# GameDay Design System 2.0

Status: adopted cross-product contract for Venue, Team, and Family.

## Product relationship

Venue is the reference language, not a literal template. All products share interaction geometry, state meaning, accessibility, and information hierarchy. Product accents remain distinct: Venue uses field green, Team uses operational blue, and Family uses navy/blue with a calmer consumer surface.

## Core contract

| Concern | Contract |
| --- | --- |
| Type | Inter/system sans; page titles are bold, compact, and sentence case; eyebrows are short uppercase context labels. |
| Page width | Compact 48rem, default 64rem, wide 72rem; 16px phone gutters, 24px tablet gutters, 32px desktop gutters. |
| Radius | 8px small, 12px controls, 16px cards, 24px feature surfaces. Pills are reserved for compact status. |
| Controls | 48px preferred; never below 44px for an interactive target. Primary actions are filled, secondary actions outlined, destructive actions red, tertiary actions text-only. |
| Surfaces | One border, quiet background, minimal shadow. Elevation communicates overlays, not ordinary cards. |
| Focus | Visible 3px focus ring with sufficient contrast. Keyboard and screen-reader names are mandatory. |
| Motion | Motion is brief and functional. Reduced-motion preference disables decorative movement. |

## Shared state language

State labels use the same meaning in every product: `ON TIME`, `STARTING SOON`, `IN PROGRESS`, `DELAYED`, `CANCELLED`, and `FINAL`. Field state uses `FIELD OPEN`, `IN USE`, `DELAYED`, and `FIELD CLOSED`. Informational is blue, successful/available is green, attention is amber, blocked or destructive is red, and complete/archived is neutral gray. Color never carries meaning alone.

Schedule changes state what changed, show old and new values when useful, include the reason/source when available, and distinguish `Updated` from `Acknowledged`. A downstream projection or provider warning is separate from the authoritative schedule decision.

## Event card contract

Every game or event card answers these questions in this order:

1. What event is this and who is involved?
2. What is its current status?
3. When does it start, and when should I arrive?
4. Where is it, including venue and field?
5. What changed or needs attention?
6. What is the single best next action?

Weather, assignments, source provenance, and secondary actions use progressive disclosure. Family may show child context; Coach may show readiness; Venue may show operating controls. Those additions do not reorder the shared facts.

## Navigation contract

- Customer roles have four or five primary destinations. Additional destinations remain contextual or under an existing workflow.
- Mobile uses persistent bottom navigation with safe-area padding. Labels stay short and must not silently disappear.
- Desktop uses a left rail and a consistent header with role/product context, page title, search, onboarding/help, and account access.
- Routes are permission-backed. Hidden navigation is not authorization.
- A product switcher appears only when current authenticated access can be proved. No speculative cross-product links are shown.

## Role priorities

| Role | Home-page priority |
| --- | --- |
| Venue operator | Today, live operations, field status, disruptions, and work requiring action. |
| Team manager | Next event, missing setup/invitations, roster readiness, then season tools. |
| Coach | Next event, attendance/availability, lineup, field or venue alerts, then team tools. |
| Parent/guardian | Next event, child-specific action, schedule change, directions, then broader calendar. |
| Follower/fan | What is happening, where, public updates, and safe live links. |

## Forms and feedback

Labels stay visible. Required fields are marked, help text explains consequences, validation appears beside the field, and entered data survives a recoverable error. Destructive or externally visible actions require a confirmation that names the impact. Success messages state what happened and the next state; errors state what failed and how to recover; loading uses stable skeletons or an explicit status; empty states explain why the area is empty and offer one relevant action.

Dense tables become cards or horizontally contained regions on small screens; the document itself must not overflow. Primary actions remain reachable without precision tapping.

## Responsive acceptance

Required widths are 320, 390, 430, 768, 1024, and 1440 pixels. Validate navigation, headers, event cards, dialogs, forms, tables, empty/loading/error states, and document-level overflow. iPad landscape is represented by 1024px.

## Repository ownership

Venue owns the reference primitives and semantic presentation vocabulary. Team and Family maintain synchronized local primitives because the applications deploy independently; a shared package is deferred until release/version ownership exists. Universal Search 2.0A and First-use Onboarding 2.0B remain the shared header patterns. Cross-product switching remains deferred until the identity/access layer can return verified product entitlements.
