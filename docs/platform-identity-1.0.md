# GameDay OS Platform Identity 1.0

## Architecture found

GameDay already had three related, but non-equivalent, identity layers:

1. Venue `public.users` maps an internal authorization user to an optional Supabase Auth UUID through `auth_user_id`. Roles, permissions, organization memberships, and scoped assignments refer to this internal user.
2. Venue's older `public.people`/`families`/`family_members`/`teams` foundation models operational people and relationships. Its `people.user_id`, email, and phone fields predate a provider-neutral resolver. The shared staging project does not currently contain these older `people` tables, so Platform Identity 1.0 must create them additively when deployed.
3. Team/Family persists its current product snapshot in `gdt_people`, `gdt_players`, `gdt_guardian_relationships`, and `gdt_family_members`. These use tenant `state_id` and text person IDs. They are live product records and are not safe to rewrite into UUID canonical identity without an explicit state-to-organization mapping.

The integration platform already provides `integration_connections`, provider capability records, external entity links, conflict records, and duplicate candidates. Those links require a canonical target immediately, so they cannot represent an unresolved human. Provider normalization had event/team/participant contracts and deterministic event matching, but no centralized person resolver. SportsEngine schedule import is implemented; other people-capable providers are live, link-out, credential-gated, or scaffolded according to the provider registry. There was no durable keep-separate rule, account claim history, field-level person provenance, or reversible person-source link history.

## Architecture implemented

- `people` remains the canonical UUID human and gains preferred-name and lifecycle status fields. It is independent of Auth and may exist without a login.
- `account_people` links one Supabase Auth account to one existing canonical person. Legacy `people.user_id -> users.auth_user_id` links are preserved as `legacy_link` claims.
- `person_organization_links` separates global person identity from tenant visibility.
- `person_identifiers` stores normalized email/phone values, display values, verification state, organization scope, and source identity. Identifiers are lookup evidence, never primary keys, and are not globally unique.
- `person_source_identities` preserves `provider + provider connection key + external person ID`, permits `person_id` to remain null during review, and has non-destructive inactive/stale/disconnected/deleted-at-source states.
- `person_relationships` keeps guardian, coach, member, and volunteer context separate from identity and retains the asserting source.
- `person_provenance_assertions` keeps simultaneous source-specific facts and hashes. Conflicting provider facts are not overwritten by last-write-wins.
- `identity_resolution_cases`, `identity_separation_rules`, and `identity_resolution_events` provide review state, durable keep-separate behavior, reversibility, and actor/reason history.
- `identity_authority_rules` is the field/domain authority foundation. It is not a global provider ranking.
- `person_legacy_links` reserves a durable compatibility mapping for legacy Team/Family person IDs.
- `platform-identity.ts` is the single provider-neutral resolver. `provider-normalization.ts` now routes normalized person assertions through it and rejects provider, connection, or organization scope drift.

The data flow is:

```text
Provider or CSV adapter
  -> normalized person / identifier / relationship / fact assertions
  -> centralized deterministic resolver
  -> canonical person and source identities
  -> provenance plus authority rules
  -> explainable GameDay Truth projections
```

## Exact resolver rules

1. An existing `provider + providerConnectionKey + externalPersonId` link returns `LINKED` with `SOURCE_IDENTITY_ALREADY_LINKED` and refreshes last-seen data idempotently.
2. One unique canonical person in the same organization with an exact verified email returns `LINKED` with `VERIFIED_EMAIL_EXACT_MATCH`.
3. One unique canonical person in the same organization with an exact verified phone returns `LINKED` with `VERIFIED_PHONE_EXACT_MATCH`.
4. If verified identifiers point to multiple people or conflict, the resolver returns `POSSIBLE_MATCH`; it never chooses one silently.
5. Same normalized name plus the same already-known guardian/child relationship is supporting context only and returns `POSSIBLE_MATCH` with `SAME_GUARDIAN_AND_CHILD_CONTEXT`.
6. Name alone never links. A new source identity creates a distinct canonical person with `NAME_ONLY_INSUFFICIENT` and `NEW_SOURCE_IDENTITY`.
7. A user or administrator may confirm a possible match. The link event records `USER_CONFIRMED_MATCH` or `ADMIN_CONFIRMED_MATCH`.
8. An administrator may unlink a source identity without deleting the source, person, identifiers, relationships, provenance, or history. The event records `ADMIN_UNLINKED_IDENTITY` rather than reusing a link reason.
9. A keep-separate rule prevents that source identity from being proposed or automatically attached to the rejected person on later syncs.
10. Account claiming considers only verified identifiers in the same organization. Exactly one person is claimed; zero or multiple candidates remain `POSSIBLE_MATCH`.
11. Email, phone, and name are never globally unique and never become durable provider keys.

## Schema and migration safety

Migration `20260903195110_platform_identity_1_0.sql` is additive. Follow-up migration `20260903201234_platform_identity_1_0_fk_indexes.sql` adds only the foreign-key covering indexes identified by the staging performance advisor. Together they create or evolve:

- `people`
- `person_organization_links`
- `account_people`
- `person_source_identities`
- `person_identifiers`
- `person_relationships`
- `person_provenance_assertions`
- `identity_resolution_cases`
- `identity_separation_rules`
- `identity_resolution_events`
- `identity_authority_rules`
- `person_legacy_links`

Lookup, source identity, relationship, provenance, review queue, audit, and authority indexes protect hot paths and idempotency. The migration backfills only mappings that are already deterministic in the legacy Venue tables: organization membership, Auth link, unverified email/phone identifiers, and a `gameday_legacy/venue_people` source identity. It does not update or delete `gdt_people`, `gdt_players`, `gdt_guardian_relationships`, `gdt_family_members`, families, teams, provider links, or Auth users.

## Security boundary

Every new identity table has RLS enabled. `public`, `anon`, and `authenticated` receive no direct table privileges. Only the server-side ingestion/review boundary receives service-role table access. Platform Identity 1.0 intentionally adds no browser identity search or mutation API, so service role is not used to bypass a user-facing policy. A later review/claim API must authenticate the actor, derive organization and family scope server-side, call the resolver, and expose only minimized evidence.

The pure authorization contract verifies:

- same-organization manager/admin review is allowed;
- cross-organization review is denied;
- parent and unauthenticated general identity review are denied;
- platform super-admin review remains explicit.

Direct browser access remains deny-by-default. Family access continues through its existing narrow Family projections; the new global person graph is not directly discoverable by parents.

## Provider disconnect and deletion

Disconnecting a provider changes source identity status; it does not delete a canonical person. Source assertions and relationships can become stale, inactive, disconnected, or deleted-at-source. A person remains when another provider, organization link, relationship, or GameDay account still refers to them.

## Observability and explainability

Resolver events use internal IDs, outcome, actor type, and deterministic reason codes. Plaintext email, phone, or names are not required in resolver logs. The service contract can answer why a record linked, which source asserted a fact or relationship, whether the decision was deterministic or a candidate, and which human confirmed or reversed it.

## Staging validation

Both additive migrations are applied to Supabase staging project `oiyitfatarrhnussyxfu`. Hosted catalog checks confirmed all 12 identity tables have RLS enabled, no `anon` or `authenticated` read/mutation grants, service-role-only policies, the durable source-identity uniqueness constraint, and all 22 foreign-key covering indexes added by the advisor follow-up. Supabase security advisors reported no Platform Identity findings. Performance advisors report only expected unused-index informational notices because the new tables contain no runtime data yet.

The connected SQL inspection surface is read-only. A rollback-only insertion test was refused before mutation, so hosted DML acceptance remains intentionally unclaimed; no synthetic or legacy staging row was changed during validation.

## Deferred work

- Build the persistence adapter/transaction boundary that writes resolver decisions from live provider workers. The pure resolver and normalized provider entry point are implemented; no unsupported provider API is claimed.
- Map Team/Family `state_id` to canonical organization UUIDs and backfill `gdt_people` through `person_legacy_links` in a separately reviewed compatibility migration.
- Add the small Identity Review and account-claim confirmation UI after the persistence and hosted RLS gates pass.
- Add provider-specific person extraction only as real provider credentials/partner access become available. CSV must generate a stable import-source row key rather than use email as its external ID.
- Expand authority rules into an organization-configurable selection service and GameDay Truth projection. Platform Identity 1.0 only supplies the model and deterministic selector.
- Define privacy retention/export/erasure behavior for canonical identity and provenance before broad consumer rollout.

## Risks

- Venue and Team/Family currently use different person ID and tenant representations. Automatic backfill without a reviewed mapping would create cross-tenant risk.
- Existing Venue code reads legacy email/phone columns directly. They remain for compatibility; new identity workflows must use `person_identifiers`.
- Provider participant support is not equally mature. SportsEngine is credential-gated; GameChanger is link-out; TeamSnap, LeagueApps, and PlayMetrics require partner access. Tests prove the common contract, not unavailable vendor APIs.
- The database persistence adapter and hosted migration are required before this foundation can be called runtime-accepted.
