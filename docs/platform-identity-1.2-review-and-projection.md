# GameDay Platform Identity 1.2 — Review and Projection

## Existing review contract

Platform Identity 1.1 stores ambiguous resolution work in `identity_resolution_cases`. The durable status values are `open`, `confirmed`, `rejected`, and `superseded`; `outcome` remains one of `LINKED`, `POSSIBLE_MATCH`, or `DISTINCT`. One partial unique index permits at most one open case per source identity. Repeated ambiguity updates that row using a deterministic `case_key` derived from the source, candidates, and reason codes.

Candidates are represented by `candidate_person_id` for a single candidate and `evidence.candidate_person_ids` for the complete server-produced set. Evidence also identifies the provider and source identity. `reason_codes` explains why automation stopped; `confidence` distinguishes deterministic, candidate, and no-match outcomes. Every case and source is scoped to one canonical organization.

`person_source_identities` owns the durable provider, provider-connection/tenant, external person ID, organization, and canonical-person link. `identity_separation_rules` records source/person pairs that future resolution must not relink. `identity_resolution_events` is the append-only actor/reason audit stream. Cases link directly to their source, reviewer, candidate, organization, and—through emitted events—the resulting human decision.

The 1.1 retrieval path is the service-role-only `list_platform_identity_review_cases(organization_id)` RPC, wrapped by `createPlatformIdentityRuntime().reviewCases()`. It returns open cases only and intentionally provides no browser table access. The 1.1 confirmation RPC permits a proposed candidate for an authenticated user but historically allowed an administrator to nominate any same-organization person. Platform Identity 1.2 removes that administrative escape hatch from the review workflow.

## Review workflow

Identity Review is a focused exception queue, not a canonical-person browser. An authorized administrator sees same-organization cases grouped as Needs Review, Deferred, or Resolved. Search is restricted to the returned case set. Each card describes the incoming provider identity, proposed candidates, and the plain-language reason automation stopped.

The detail workflow permits four decisions:

- Link Records: select exactly one server-proposed candidate.
- Keep Separate: persist separation rules for the proposed candidates and resolve the case without linking.
- Review Later: retain the unresolved case and record defer metadata.
- Cancel: make no change.

No arbitrary merge, person creation, canonical-person editing, or global identifier search is exposed.

## Authorization

The capability is `identity.review`. It is granted only to `super_admin`, `platform_admin`, and `organization_admin`. Every page and server mutation resolves the authenticated session, checks the capability, and then enforces organization scope. Platform-scoped administrators may select an organization; organization-scoped administrators are restricted to their own organization. Venue, team, coach, parent, player, fan, and ordinary staff contexts fail closed.

Browser roles receive no table privileges and cannot execute identity RPCs directly. UI requests call server-only services using the service role only after application authorization. Direct routes, object IDs, case mutations, and projection retries repeat the same capability and organization checks.

## Evidence model

Review output contains only decision-relevant fields: displayed names, provider label, verification state, relationship types, reason explanations, provenance summary, and masked email/phone identifiers. Raw provider payloads, unmasked identifiers, provider connection secrets, and unrestricted canonical-person lookup are excluded.

Reason codes are translated into sentences such as:

- `AMBIGUOUS_IDENTIFIER`: multiple people share a verified identifier.
- `CONFLICTING_STRONG_IDENTIFIERS`: strong identifiers point to different people.
- `SAME_GUARDIAN_AND_CHILD_CONTEXT`: relationship context is similar but no verified identifier safely resolves the person.
- `EXPLICITLY_MARKED_DISTINCT`: a prior administrator decision prevents automatic linking.

Technical reason codes remain available only as secondary details.

## Human decisions

The review decision RPC locks the case and checks `review_status` plus an expected integer version. Stale or already-resolved writes fail without altering the source, audit stream, or projection queue. Candidate confirmation validates against the stored server-produced candidate set before calling the canonical confirmation pathway.

Confirmed links preserve source identity, identifiers, provenance, and audit history. The source link wins on every later provider sync. Human confirmation is therefore durable and cannot be undone by heuristic matching.

The canonical decision transaction stops at a durable projection intent. It atomically commits the source-to-person link, resolved review state, administrator audit event, and deduplicated queue item. Legacy/domain mapping materialization and compatibility projection occur only after a worker claims that queue item in a later transaction. A projection exception therefore cannot undo the link, reopen the review, or repeat the administrator decision.

## Keep-separate behavior

Keep Separate creates or reactivates a separation rule for each proposed candidate, resolves the case as rejected, and retains all evidence. Repeated provider ingestion filters those candidates before matching, preventing the rejected pair from returning as the same proposed link. It never deletes either person or the incoming source identity.

## Concurrency

Every decision supplies the case version observed by the administrator. The database locks the case row, rejects version drift, and changes version exactly once. Queue deduplication uses a stable originating identity event plus target domain and operation type, so a repeated click cannot duplicate projection work.

## Projection queue architecture

`platform_identity_projection_queue` is a narrow, database-backed, at-least-once queue. It stores organization, canonical person/source/event references, operation, target domain, minimal structured context, lifecycle status, attempt count, availability, lease metadata, safe error code, and timestamps. RLS is enabled; only `service_role` can access it.

Lifecycle states are `PENDING`, `PROCESSING`, `RETRY`, `COMPLETED`, and `FAILED`. A worker claims one eligible item using `FOR UPDATE SKIP LOCKED`, a bounded lease, and an incremented attempt count. It re-reads current canonical state, validates organization and domain mapping, applies an idempotent projection, and completes the item. Transient failures use deterministic bounded backoff; invalid mappings, cross-organization targets, or domain invariants fail permanently.

`platform_domain_person_projections` records compatibility linkage metadata without replacing domain models. It maps a canonical person and source to an existing legacy/domain entity. Stable uniqueness prevents duplicates. It is linkage metadata—not a copy of roster, Family, consent, or team state.

## Retry and idempotence

The deduplication key is the identity event, target domain, and operation type. Worker retries always re-read canonical source/person/legacy-link state; queued snapshots are never authoritative. Completed work can be safely replayed because projection writes upsert the stable domain identity mapping. Authorized administrators may retry failed work without editing payloads or changing canonical identity.

Retry delay is bounded and deterministic. Temporary database/dependency failures become `RETRY`; exhausted attempts become `FAILED`. Organization mismatch, missing explicit mapping, and invalid domain references fail immediately with safe error codes. Browser-visible errors never contain stack traces or raw PII.

Projection failure is intentionally not an identity-resolution failure. The queue records `RETRY` or `FAILED` independently while the canonical link, resolved review, and administrator audit remain committed. Authorized retry changes only queue execution state. Once the downstream condition is corrected, the worker rereads canonical state and brings the domain projection to the authoritative final state without recreating the human decision.

## Team and Family projection boundaries

The projection may establish canonical linkage metadata for existing `gdt_people` and `gdt_players` IDs and compatible guardian relationships. It never overwrites roster role, jersey number, batting order, season membership, consent, team nickname, or Family permissions. Existing Team/Family records remain the operational source of truth.

Studio Director continues resolving students and guardians independently. After canonical resolution it registers the explicit legacy mapping for projection. Provider ingestion itself is not queued; only downstream compatibility work is.

The generic client-side Team roster CSV remains deferred. Its future minimum safe contract is a server-generated immutable import-instance UUID plus an immutable row key from an explicit provider ID or file-content row fingerprint. Names, email alone, and row position are not durable source keys. A server worker must own preview-to-commit consistency before that path enters canonical ingestion.

## Security

All new tables use RLS and deny `public`, `anon`, and `authenticated`. Functions are `SECURITY INVOKER`, set an empty search path, and grant execution only to `service_role`. Application services separately enforce `identity.review`, current authenticated actor, case organization, and target organization.

Cross-organization review retrieval, candidate access, mutation, queue retry, and projection execution fail closed. A worker validates the queued organization against current source, person-organization link, legacy mapping, and target projection before writing.

## Staging acceptance

Staging acceptance passed only in Supabase project `oiyitfatarrhnussyxfu` using generated synthetic `example.test` identity data. Case A produced an ambiguous review, accepted only a proposed candidate, linked it, completed its compatibility projection, and reused the durable source link on repeat ingestion. A separate transaction-guarded probe confirmed that a same-organization person outside the proposed candidate set is rejected. Case B persisted two candidate separation rules and repeat ingestion did not relink either rejected person. Case C deferred once and rejected the stale second mutation without another event. Case D intentionally failed because its legacy mapping was absent, entered retry, accepted an authorized retry after the condition was corrected, completed, and retained one idempotent projection row. Case E returned no cross-organization detail and rejected the wrong-organization mutation.

Readback recorded four synthetic sources, three review cases, thirteen identity audit events, two active separation rules, and two completed queue items. A separate wrong-organization queue-enqueue probe was rejected without inserting work. Cleanup marked all four sources stale, archived every resolved synthetic person, removed every synthetic legacy link, superseded the remaining deferred case, and left the two compatibility projections inactive. No synthetic person, source, legacy link, or compatibility projection remained active. Audit and completed queue evidence were retained.

All new tables have RLS enabled. Browser roles have zero table or function grants. All service functions are `SECURITY INVOKER` with an empty search path. The `identity.review` permission is present for `super_admin`, `platform_admin`, and `organization_admin`. The Supabase security advisor reported no Platform Identity 1.2 finding. Two initially missing leading foreign-key indexes were corrected; remaining 1.2 performance notices are expected unused-index information immediately after installation and synthetic cleanup.

No production migration or deployment was performed or authorized.

## Deferred privacy, export, and erasure

Canonical-person editing, deletion, bulk merge, privacy export, GDPR/CCPA erasure, global search, arbitrary person creation, bulk legacy backfill, and GameDay Truth UI remain separate product/security phases.

## Recommendation for Platform Identity 1.3

Platform Identity 1.3 should add GameDay Truth visibility only after pilot evidence shows review accuracy and projection reliability. It should explain effective values and provenance conflicts without expanding identity search or editing. Live vendor roster adapters and the generic Team CSV server-ingestion contract should remain independently gated.
