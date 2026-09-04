# GameDay Platform Identity 1.3 — GameDay Truth

## What GameDay Truth means

GameDay Truth is the authorized, organization-scoped explanation of what GameDay currently uses for a canonical person, which source asserted it, and which existing authority rule produced that result. It is not another resolver, a searchable person directory, or a replacement for Team, Family, or Venue systems of record.

The 1.3 surface is intentionally limited to identity facts for which `person_provenance_assertions` already retains source-specific values: `profile.display_name`, `profile.preferred_name`, `profile.first_name`, and `profile.last_name`. Email and phone remain multi-valued identifiers and are not converted into a single Truth value. Birth dates, financial data, roster participation, jersey numbers, statistics, batting orders, and game state are excluded.

## Effective-value algorithm

For one organization, canonical person, domain, and field, GameDay considers only current assertions whose source identity is active, belongs to the same organization, and remains linked to that person. An organization link must also be active.

1. An active organization-specific authority rule for the assertion's provider wins over a platform rule for the same field and provider.
2. Otherwise, an active platform rule applies.
3. Otherwise, the provider has the deterministic platform fallback priority of zero.
4. Only assertions at the highest resulting priority can win.
5. If every highest-priority assertion agrees, that value is current.
6. If values differ and one value has the uniquely latest source/ingestion timestamp, that value is current and the disagreement is visible.
7. If different highest-priority values share the latest timestamp, GameDay returns an unresolved conflict and no current value. It never selects by row order.
8. Stable provider and assertion identifiers order display-only provenance after the decision; they never break an unresolved value tie.

The same evaluation result supplies both the selected value and its explanation code, preventing UI prose from drifting from calculation.

## Authority precedence

Authority is field-specific, not a global provider ranking. The current contract is: organization rule, then platform rule, then priority-zero fallback. Higher numeric priority wins. A newer lower-priority assertion never replaces a higher-priority value.

GameDay account or administrator-sourced assertions are visibly human-confirmed, but they win only where an existing field rule gives that provider higher authority. Account ownership does not make every account-entered field authoritative.

## Conflict semantics

- `NO_CONFLICT`: one current source value.
- `AGREEING_SOURCES`: multiple current sources report the same value.
- `DIFFERENT_SOURCES`: current sources disagree, but configured authority or a unique most-recent equal-authority assertion determines the current value.
- `UNRESOLVED_CONFLICT`: equally authoritative, equally recent values disagree; no value is presented as current.
- `HUMAN_RESOLVED`: sources disagree and the winning assertion is a GameDay human source under an applicable authority rule.

An alternate value is informational when a deterministic winner exists. An unresolved conflict is an explicit operational state. 1.3 does not add a free-form conflict editor.

## Human confirmation

Sources `gameday_account` and `gameday_native` are labeled as GameDay confirmation. Existing account claim and administrator review evidence distinguishes user and administrator actions where available. This is provenance, not a universal authority override. Competing provider assertions and prior values remain intact.

## Provenance

The summary returns a bounded history (five entries per supported field by default, maximum ten), translated into provider label, value, status, and source timestamp. It does not return provider connection keys, external person IDs, raw audit logs, or unmasked contact identifiers. Provider labels are normalized for GameChanger, SportsEngine, TeamSnap, PlayMetrics, LeagueApps, Studio Director, GameDay, and manual import.

## Relationships

Relationship Truth is separate from person-field Truth. Active `guardian_of`, `coach_of`, `member_of`, and `volunteer_for` assertions retain their own source provenance. Distinct relationship types are not collapsed into one another. Related people use an authorized display label; provider IDs and connection IDs are omitted.

## Projection-state separation

Canonical Truth is calculated only from canonical identity, active source, provenance, and authority state. Team/Family projection queue status is returned as a separate section. `PENDING`, `RETRY`, or `FAILED` projection work cannot unset the canonical value, reopen a resolved identity review, or reverse a human decision. Authorized administrators may request an existing retry without editing Truth.

## Authorization

Truth is available only to authenticated administrators with `identity.review` in the exact organization scope. Platform administrators may select an organization; organization administrators remain bound to their organization. The server loader validates scope before the service-role RPC. The RPC itself requires an active person-organization link and is executable only by `service_role`; `public`, `anon`, and general `authenticated` roles receive no access. Ordinary Venue Staff, parents, coaches, and public users receive neither navigation nor direct-route access.

Truth is reached from an existing Identity Review candidate or an authorized known-person deep link. 1.3 adds no global canonical-person search.

## UI model

The administrator sees a compact card per supported value: Current Value, Source, Why GameDay Uses This, conflict state, other sources, and progressively disclosed history. Separate cards explain relationship provenance, identity review state, account claim, and projection delivery. Status is conveyed in text rather than color alone, headings are semantic, and native `details`/`summary` controls support keyboard access on narrow and wide screens.

## Staging acceptance

Synthetic acceptance in project `oiyitfatarrhnussyxfu` covers: organization authority, human authority plus a later provider assertion, equal-authority conflict, failed/retried projection with unchanged Truth, cross-organization denial, unresolved identity without false attribution, provider-tenant isolation, and archival of fixtures without deleting provenance or audit evidence. Production is excluded.

Accepted September 4, 2026. Case A returned `Charlie` with `ORG_AUTHORITY_RULE`; Case B returned human-confirmed `Charlie` despite a later lower-authority provider value; Case C returned `UNRESOLVED_CONFLICT` and no effective value; Case D moved a synthetic queue item from `FAILED` through authorized retry to `COMPLETED` with the field summary byte-for-byte unchanged; Case E returned no summary across the organization boundary; Case F exposed the open review without attaching the unresolved source's assertions to the candidate. Two LeagueApps tenants with the same external person ID remained separate, relationship types remained independent, and bounded history retained current and stale values.

Cleanup archived all three synthetic people, inactivated their organization links, sources, relationship assertions, temporary authority rules, and open review state, and completed the synthetic queue. Nine provenance assertions and four audit events remain as acceptance evidence. No production project was accessed.

## Remaining limitations

- Truth is read-only and supports only four name fields with established provenance.
- A confirmed human assertion requires an explicit applicable authority rule to win.
- No general conflict-resolution authoring flow or authority-rule editor is included.
- Unresolved source assertions remain attached to the source identity, not a candidate person, so the person page shows the review state without pretending those values are canonical.
- Relationship entity labels are limited when the related entity is not another canonical person.
- Deep history is not loaded by default.

## Recommendation for Platform Identity 1.4

Pilot the read-only explanations with support and organization administrators. Use observed conflicts to choose one tightly constrained, audited confirmation workflow for `profile.preferred_name`, including downstream projection and retry. Do not broaden fields or add an authority editor until pilot evidence establishes a real operational need.
