# GameDay UI/UX 1.0A Audit

Date: September 1, 2026
Repository: `gameday-venue-os`
Baseline branch: `security/audit-remediation-2026-08-28`

## Executive finding

GameDay has a capable venue-operations product, but its interface asks a phone user to understand the product map before completing a task. The baseline contains 140 page routes and only 28 shared TSX components. Most pages build their own title, cards, buttons, forms, status treatments, empty states, and responsive behavior directly from utility classes. That ratio explains why otherwise related workflows look and behave differently.

The highest-impact 1.0A change is a shared application shell, not a new visual theme. On the baseline mobile shell, the full desktop navigation appeared above page content. Command Center separately implemented a fixed four-item mobile bar, so one route could show a different navigation model from the rest of the signed-in product. The signed-in shell now needs one role-aware mobile pattern with no more than five destinations, a safe “More” surface, and content padding that prevents navigation overlap.

The design direction should remain operational and sports-oriented: direct language, strong game/field state, large controls, and progressive disclosure. It should not become a generic analytics dashboard.

## Inventory and evidence

- 140 `page.tsx` routes across signed-in admin, organization, public venue/field, display, demo, scorekeeping, and authentication surfaces.
- 28 shared TSX components before 1.0A.
- 16 files contain tables or horizontal overflow patterns. Tables are concentrated in imports, billing, identity roles, sponsor reporting, and field bookings.
- Approximately 845 uses of `text-xs`, `text-[11px]`, or `text-[10px]` existed across app/components. Tiny text is especially common in navigation, status metadata, card eyebrows, and secondary actions.
- Approximately 290 compact-control class patterns (`h-8` through `h-10`, `min-h-8` through `min-h-10`, or very small vertical padding) existed across app/components.
- Approximately 1,240 rounded-border combinations existed across app/components, showing that “put it in another bordered box” had become the default hierarchy tool.
- Six route-level loading states and three route-level error states cover only a small share of the route inventory.
- Existing reusable styling was limited to `.ui-card`, `.ui-button`, and `.ui-empty`; pages largely bypassed it.

Counts are directional source-code evidence, not a claim that every occurrence is user-facing or defective.

## Current application structure

### Signed-in shell

- `AppFrame` correctly resolves the session and builds capability-filtered navigation on the server.
- `AppShell` receives only allowed navigation items, but baseline mobile behavior rendered the full dark desktop navigation before the page.
- Command Center contained its own fixed mobile navigation, creating overlap and inconsistent destination labels.
- Normal navigation is capability-filtered, but route/server-action authorization correctly remains independent. The UI must preserve this boundary.

### Public shell

- `SiteHeader` serves public/auth/QR pages and is intentionally hidden for signed-in admin/Today routes and unattended display/scoreboard screens.
- The mobile menu control was 40px, below the target touch size.
- Public field and venue pages contain strong domain content but use local status/card patterns rather than a shared system.

### High-use operations surfaces

- `/admin/command-center` is the strongest day-of surface, but it combines seven summary tiles, communication controls, schedule pulse, checklists, three attention tiers, a field board, and jump links.
- `/today` is simpler and role-aware. It is the right reference for progressive disclosure: quick actions, expandable live-game details, and inline field status.
- `/admin/operations-center` contains valuable venue-wide controls but exposes templates and the vague “Run Action” label alongside high-risk actions.
- `/admin/fields` places four peer actions in the page header and nests fields inside venue cards inside field cards.
- `/admin/sessions` remains information-dense and uses many locally styled controls.

## Pattern findings

### Duplicate UI patterns

- Page titles are repeatedly hand-built from uppercase eyebrow, large heading, description, and actions.
- Status badges use separate maps in Today, Command Center, reservations, weather, sponsor campaigns, officials, work orders, and display surfaces.
- Empty, error, and loading states vary by route and often omit an accessible live region.
- Buttons repeat similar emerald/white/red classes with inconsistent heights, radii, weights, and focus treatment.
- Forms repeat label/input/help structures without one error-description pattern.
- Command Center and the global shell each define mobile navigation independently.

### Spacing and hierarchy

- Most pages use reasonable outer padding, but vertical spacing varies between `mt-3`, `mt-5`, `mt-6`, `mt-7`, and `mt-8` for equivalent sections.
- Borders and nested cards do too much hierarchy work. Whitespace and headings should separate sections first.
- Desktop grids often shrink dense content rather than reprioritize it for mobile.
- Tiny uppercase text is overused for information users actually need to read outdoors.

### Touch targets

- Many important controls already use `min-h-11` or `min-h-12`.
- Navigation, demo helpers, jump links, sign-out, compact actions, and some form controls remain 32–40px.
- Small text links are sometimes the only route to secondary operational actions.

### Tables and responsive behavior

- Some tables correctly sit in horizontal overflow containers, but this transfers the burden to the user.
- Identity roles, billing, import review, sponsor reporting, and bookings need later task-specific mobile alternatives rather than a global CSS rewrite.
- Desktop is frequently a stretched grid of mobile cards; leadership/reporting pages need intentional wider layouts in a later pass.

### Language

- Navigation has already improved toward “Schedule Imports,” “People & Access,” and “Venue Status & Alerts.”
- Remaining user-facing system language includes “Run Action,” source record identifiers, sync terminology, provider health terms, schema diagnostics, and internal/demo readiness concepts.
- Technical identifiers are appropriate in developer-only surfaces but should not leak into the day-of default experience.

## Accessibility findings

- Many links/buttons have no consistent focus ring; several rely on hover-only affordances.
- Status generally includes text, which is good, but color maps are duplicated and can drift in contrast.
- Native semantics are mixed: some card-like links are good, while some interactive areas rely on visually styled generic containers.
- The baseline has no shared dialog/sheet focus-management pattern.
- Bottom navigation requires safe-area padding and matching content padding to prevent overlap.
- Small status/navigation labels can be difficult outdoors even when technically above minimum contrast.

## 1.0A design decisions

1. Keep authorization and navigation construction unchanged on the server.
2. Hide the desktop sidebar below `lg`; introduce a compact app header and persistent role-aware bottom navigation.
3. Limit the bottom navigation to Home, Schedule, GameDay, Updates, and More when those destinations are permitted. Missing capabilities produce fewer items rather than disabled links.
4. Put all remaining allowed destinations in an accessible native-dialog sheet.
5. Reserve enough safe-area-aware bottom padding so fixed navigation never covers page content.
6. Standardize a 48px base control height, 16px body text, visible focus rings, softer surfaces, and a small radius/spacing scale.
7. Centralize page, card, status, alert, button, state, row, form, tabs, modal, and sheet primitives without adding a dependency.
8. Adopt the system first on the signed-in shell and representative daily-use screens. Do not mechanically rewrite all 140 routes in one release.

## Representative 1.0A adoption scope

- Global signed-in application shell and mobile navigation.
- Public mobile header touch target and global focus behavior.
- `/today` as the lightweight operator screen.
- `/admin` as the setup/leadership starting screen.
- `/org` as the organization-manager starting screen.
- `/admin/command-center` navigation overlap removal while preserving its contextual section jumps.

## Deferred legacy surfaces

The following need route-specific 1.0B/1.0C work after shell acceptance:

- Dense data workflows: identity roles, imports, billing, sponsor reports, bookings, schema audit, and sync review.
- Complex forms: venue/field/session setup, integrations, audio, scoreboards, sponsors, tournaments, and automation builders.
- Public field/venue pages and scorekeeper screens need visual adoption without changing their intentionally distinct public/rapid-entry modes.
- Demo/Crossroads, TV, scoreboard, and presentation surfaces should keep their purpose-built visual language and adopt only accessibility/tokens where appropriate.
- Remaining status maps should migrate to `StatusChip` after domain-by-domain label and contrast review.
- Remaining technical copy should be simplified only on non-developer surfaces.

## Acceptance criteria

- At 320, 375, 390, and 430px: no horizontal page overflow, no covered controls, and bottom navigation remains usable with one thumb.
- At tablet and desktop: the shell changes intentionally, with desktop navigation visible only at `lg` and above.
- Every primary interactive primitive has an approximately 48px touch area and visible keyboard focus.
- Mobile navigation never contains a route omitted by server capability filtering.
- Modal/sheet uses native dialog behavior for focus trapping, Escape handling, and accessible naming.
- Authentication, route guards, server actions, APIs, data services, and schemas remain unchanged.
