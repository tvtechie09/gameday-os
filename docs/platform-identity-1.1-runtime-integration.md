# GameDay Platform Identity 1.1 — Runtime Integration

## Provider ingestion before/after

Before 1.1, Venue had a provider-neutral in-memory person contract and resolver, but no database transaction adapter connected to a real person import. Team/Family had the only live external person import: The Studio Director CSV commit route. That route wrote existing `gdt_*` projections directly. The regular Team roster CSV is a client-side onboarding/state workflow, and the Team JSON package is a GameDay export/import format. Neither has a durable external row ID contract suitable for automatic canonical ingestion yet.

After 1.1, a provider adapter emits a normalized person input, resolves the explicit organization context, and calls `resolve_platform_person`. That database function is the sole durable decision-maker for source reuse, verified-identifier matching, distinct creation, keep-separate enforcement, review cases, identifiers, provenance, relationships, legacy links, and audit events. The Studio Director commit route is the first real worker/import path using this boundary. Existing provider schedule behavior is unchanged.

| Path | Source object | Context and durable source key | Contact/relationship data | Current persistence | 1.1 status |
| --- | --- | --- | --- | --- | --- |
| SportsEngine Venue schedule | events, teams, venues | integration connection + canonical organization | no person payload in implemented adapter | sessions, provider event lineage | no person ingestion; existing schedule path preserved |
| SportsEngine people/roster | registry/capability scaffold only | connection and organization are available conceptually | contract can carry people | none | normalized runtime ready; vendor extraction remains credential-gated |
| TeamSnap | provider registry/Team mock | conceptual provider tenant | mock participant data only | mock Team integration state | bypass remains because no live provider worker exists |
| GameChanger | link-out/live-source metadata | external link/session context | no durable person record | links and live-source metadata | no person ingestion |
| PlayMetrics | registry/partner scaffold | conceptual provider tenant | no live payload | mock/config state | no person ingestion |
| LeagueApps | registry/Team mock | conceptual provider tenant | mock participant data only | mock Team integration state | no live person ingestion |
| Venue generic provider normalization | `NormalizedPersonAssertion` / participant | canonical organization + integration ID + external ID | email, phone, relationships supported by contract | previously in-memory only | persistent `NormalizedProviderPersonInput` boundary added |
| The Studio Director CSV | student, guardian, guardian-child link | Team `state_id`; stable derived student/guardian IDs | guardian email/phone; guardian relationship | `gdt_players`, `gdt_people`, `gdt_guardian_relationships` | live commit now projects to Platform Identity after the domain write |
| Team roster CSV | roster row, player, up to two guardians | Team season; IDs derived in client state | guardian email/phone and relationships | Team state/relational projection through `/api/state` | deferred: lacks an immutable import-instance/row source key and is not a server worker |
| Team JSON package | GameDay-owned people/players/relationships | GameDay organization/team package | full GameDay domain graph | Team state | not an external provider path; unchanged |
| Registration CSV | registration/application row | Team season | guardian registration fields | registration workflow | not canonicalized in 1.1; approval does not itself establish durable provider identity |
| Coach/volunteer manual workflows | GameDay user/domain role | authenticated Team/Venue scope | GameDay-entered person/role context | existing domain/auth tables | not provider ingestion; unchanged |

No implemented SportsEngine, TeamSnap, GameChanger, PlayMetrics, or LeagueApps worker currently delivers real roster people. Platform Identity readiness must not be represented as live vendor connectivity.

The canonical flow is:

`provider payload → provider adapter → normalized candidate → explicit organization resolution → Platform Identity RPC → source/provenance persistence → domain projection`

Provider adapters never query by name/email and choose a canonical person themselves.

## Canonical organization mapping

`platform_organization_legacy_mappings` maps `(legacy_system, legacy_namespace, legacy_id)` to one canonical organization UUID. Team uses `legacy_system=gameday_team`, `legacy_namespace=state_id`, and the exact `state_id`. One active mapping resolves. No mapping returns `unmapped`; only inactive rows return `inactive`; conflicting active rows return `ambiguous`. Invalid input returns `invalid`. Every non-resolved state fails closed. There is no name, slug, email-domain, or provider-name inference.

The active-key unique index prevents new conflicts, while the resolver still handles more than one active result defensively. Mapping rows are configuration, not a bulk migration. 1.1 does not seed a guessed mapping.

## Team/Family compatibility contract

Canonical identity answers **who the human is**. Team/Family remains the operational projection answering **what that person does for this team, family, and season**. Jersey number, roster status, position, team nickname, season, guardian permissions, consent, and team-specific coach roles stay in `gdt_*` domain records.

The Studio Director import keeps its existing preview, authorization, snapshot/CAS write, consent behavior, IDs, and response. After a successful domain write it attempts the idempotent canonical projection and returns a non-sensitive `identity_runtime` status. A missing/ambiguous/inactive mapping causes no canonical write and never guesses. A runtime error is reported as `failed` without PII. The already-durable domain import remains valid and the canonical projection can be retried safely.

This order is intentionally eventual across the Team state write and the canonical database RPC; there is no cross-system transaction. Each individual canonical identity decision is atomic. Existing Family and Coach reads remain on their current projection, so an unavailable identity runtime cannot remove roster or guardian access.

## Persistent transaction adapter

`resolve_platform_person(jsonb)` is one PostgreSQL transaction invoked only with the server-side service role. An advisory transaction lock serializes the durable `(provider, provider connection/tenant, external person ID)` tuple. The function validates organization scope, reuses an existing link, evaluates verified same-organization identifiers, applies persisted separation rules, creates or updates one deduplicated review case, and only then persists the linked person’s identifiers, provenance, relationships, and optional legacy link. Any exception rolls the full identity decision back.

Supporting service contracts cover deterministic organization resolution, confirmation, keep-separate, unlink, account claim, and effective-value projection. They are database RPCs rather than public HTTP search endpoints.

## Normalized provider contract

`NormalizedProviderPersonInput` contains provider, provider connection/tenant key, external person ID, canonical organization UUID, display name/person type, identifiers with explicit verification semantics, relationships, domain facts, provenance timestamps/references, safe source metadata, and an optional explicit legacy-person mapping.

The provider tuple is unique as `(provider, providerConnectionKey, externalPersonId)`. An external ID is never assumed globally unique. Studio Director uses `gameday_team:<state_id>:studio_director` as its connection key and its stable legacy student/guardian ID as the source ID. CSV contacts are always `unverified`; the adapter supplies no assertion that The Studio Director verified ownership.

## Resolution behavior

An existing linked source identity wins and is not heuristically rematched. Otherwise, exactly one non-separated person with a matching verified email/phone in the same organization is linked. Multiple candidates produce `POSSIBLE_MATCH`; no first-candidate selection occurs. Name alone creates a distinct person. Same normalized name plus an already-resolved relationship can produce a review candidate, never an automatic link.

Students and guardians are resolved independently. Guardian relationships are submitted only after both canonical IDs exist. A related person must have an active link to the same organization. Shared guardian email, phone, surname, or address is therefore not copied to children and cannot collapse siblings.

After unlink, canonical people and Team/Family rows remain. The source identity becomes disconnected and audit retains the previous person. A later sync follows normal resolver rules; administrators use keep-separate before resync when automatic relinking to the prior candidate must be prohibited.

## Idempotence

Source tuple uniqueness and an advisory lock prevent duplicate source identities or concurrently-created people. Person identifiers, active relationships, provenance values, legacy links, and open review cases have durable uniqueness boundaries. Replaying an unchanged source reuses its person, refreshes timestamps, and does not create duplicate identity rows. Changed facts preserve old provenance as stale and make the new assertion current.

Review cases are one open row per source. Materially changed candidates/evidence update that row and its deterministic `case_key`; resolved sources supersede the open case. Audit history is append-only.

## Provenance/authority

Adapters submit facts, not database-shaped provenance rows. The transaction records source, domain, key, value hash, external reference, and timestamps. `get_platform_person_effective_value` applies an organization-specific authority rule first, then a global rule, then deterministic recency. It returns effective value, source provider, authority reason, timestamp, provenance record ID, conflict state, and open-review state.

Lower-authority provider changes remain provenance and cannot displace a higher-priority user/admin assertion. No global arbitrary provider ranking was added. The future GameDay Truth UI can consume this projection without knowing the underlying joins.

## Account claiming

`claim_platform_account` supports people first created by provider ingestion. It accepts only GameDay-verified incoming identifiers, searches only active people in the supplied canonical organization, respects keep-separate rules for the account source, and claims only one exact candidate. Zero or multiple candidates return a non-linked result. Existing account claims win. Callers must first obtain canonical organization context; an unmapped/inactive Team state never gets an organization UUID and therefore cannot claim across organizations.

## Security

The new table has RLS enabled and no `public`, `anon`, or `authenticated` privileges. Every RPC is `security invoker`; execution is revoked from browser roles and granted only to `service_role`. The real import route already requires authenticated `manage_integrations` permission. No public or general authenticated identity read, email lookup, provider secret, or raw payload endpoint was added. Review evidence contains canonical IDs, provider name, reason codes, and candidate counts—not raw email or phone values.

Organization and provider-tenant boundaries are independently enforced. A source tuple already bound to another organization raises a conflict and rolls back. Relationships cannot point to a person outside the current organization.

Operational metrics remain the existing structured outcomes/status: `LINKED`, `POSSIBLE_MATCH`, `DISTINCT`, mapping/runtime status, reason codes, and non-sensitive counts. No analytics vendor or PII logging was introduced.

## Live staging acceptance

The runtime migration and a transaction-wrapped synthetic acceptance were applied only to staging project `oiyitfatarrhnussyxfu` after explicit approval. Production was not touched. The acceptance exercised explicit organization mapping, first ingest, replay/source reuse, verified-identifier linking, source-identity precedence, ambiguity and review-case deduplication, keep-separate behavior, unlink and administrator relink, account claim, authority-based effective values, and separate child/guardian resolution with an unverified shared contact and guardian relationship.

The acceptance completed successfully through the approved privileged staging migration channel. Readback found 8 sources, 6 people, 6 identifiers, 1 relationship, 3 provenance assertions, 19 audit events, 1 superseded review case, and 2 separation rules. Cleanup then archived every synthetic person, marked every synthetic source stale, deactivated the synthetic organization mapping, and removed the synthetic authority rules. No synthetic source remained active, no synthetic person remained unarchived, and the account-claim link was retained only as auditable acceptance evidence against its archived synthetic person. The ordinary query connector remained unable to execute the protected RPCs, which independently confirmed the service-role-only execution boundary.

Post-apply advisor review found no identity-specific security findings. The performance advisor reported the newly created organization-mapping lookup index as unused, which is expected immediately after installation and synthetic acceptance and is not a release blocker.

## Remaining deferred work

- Identity Review UI and GameDay Truth UI.
- Bulk conversion of `gdt_people`, `gdt_players`, Auth users, or historical provider rows.
- A canonical backfill job; only explicit per-person legacy links are supported.
- Live roster adapters for SportsEngine, TeamSnap, GameChanger, PlayMetrics, and LeagueApps pending actual provider access and contracts.
- Team’s client-side roster CSV until it has an immutable import-instance and row-key contract and a server-side worker boundary.
- Registration/person canonicalization until its approval and stable source semantics are specified.
- Cross-database distributed transactions. The Team projection/canonical projection handoff is idempotent eventual consistency.
- Admin-scoped review retrieval endpoints and UI. The stored case/evidence contract exists, but no browser access was opened.
