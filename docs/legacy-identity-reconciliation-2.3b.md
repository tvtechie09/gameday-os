# GameDay Improvement 2.3B — Legacy Identity Reconciliation Preview

## Recommendation

**READY FOR HOSTED PREVIEW ACCEPTANCE; NOT READY FOR BULK MIGRATION.** The feature is read-only and execution is structurally absent.

## Legacy sources and boundaries

The Team/Family legacy graph is keyed by text `state_id` plus text record IDs:

- `gdt_people` contains local/provider/imported person records and unverified email/phone values.
- `gdt_players.person_id` connects the player profile; player names, birth data, photos, producer notes, and walk-up settings are separate domain data.
- `gdt_guardian_relationships` connects guardian person IDs to player IDs, including consent provenance.
- `gdt_memberships`, `gdt_team_seasons`, family members/participants, invitations, registrations, permissions, and provider mappings carry downstream relationship/access consequences.
- Client-side roster CSV creates records without a durable provider row key. Those imported people are blocked as `SOURCE_KEY_REQUIRED` unless a future explicit import-source record key is persisted.

The preview reads a maximum of 100 people per page and caps supporting lookups. It requires the exact `platform_organization_legacy_mappings` row for `gameday_team / state_id / <state>`. No mapping means every person is `ORG_MAPPING_REQUIRED`; organization names are never guessed.

## Classification contract

Order is conservative:

1. synthetic/inactive → `SKIP_INACTIVE`
2. no exact organization mapping → `ORG_MAPPING_REQUIRED`
3. existing `person_legacy_links` record → `ALREADY_MAPPED` and never remapped
4. CSV/import without durable source key → `SOURCE_KEY_REQUIRED`
5. disagreeing verified canonical identifier evidence → `CONFLICTING_STRONG_IDENTIFIER`
6. exact durable `person_source_identities` match → `DETERMINISTIC_LINK`
7. unverified legacy email/phone resembling a verified canonical identifier → `POSSIBLE_MATCH`
8. no evidence → `DISTINCT_NEW_PERSON`

Name alone never links. Legacy email/phone is never promoted to verified. Active keep-separate rules remove that candidate; a rejected-only candidate results in a distinct proposal rather than recurring as deterministic. Existing mappings always win over newer heuristics.

## Relationships and families

Guardian relationships are counted as a separate projected consequence. They do not change person classification. Shared guardian email, siblings, child/parent shared phone, and multi-household guardians therefore cannot collapse people: person identity and relationship projection remain separate decisions. A future migration must apply relationship edges only after relevant person mappings exist.

## Preview UI and manifest

`/admin/identity/reconciliation` and its manifest endpoint require a current, non-impersonating Platform Admin/Super Admin. The report shows batch counts, projected review volume, masked identifiers, reason code, relationship count, and a stable evidence fingerprint. It does not load a general people directory or return raw names in the manifest.

The fingerprint covers resolver version, stable legacy record identity/source timestamp, organization mapping and candidate evidence. Any source or canonical evidence change produces a different fingerprint, so future execution must reject a stale preview. The JSON schema is `legacy-identity-reconciliation-manifest.schema.json` and fixes `executionEnabled` to false.

## Metrics and actual-data status

Counts are generated per requested state and page, by classification. This environment has no authorized hosted staging data connection, so no actual staging population counts are claimed in this document. Hosted preview must record organization totals, classification totals, provider/source totals, and projected review volume before an execution sprint is proposed.

## Future migration order and rollback

Recommended batches:

1. validate already-mapped rows and fingerprints;
2. apply exact durable-source links in small organization batches;
3. establish server-owned source keys for CSV/import rows, then re-preview;
4. route possible/conflicting matches through Identity Review in bounded batches;
5. create distinct canonical people only after source and relationship review;
6. project relationships separately through the retryable projection queue.

Suggested first batch: one organization, 100 people maximum, then inspect queue/audit before continuing. Rollback is an audited identity unlink plus legacy-link history and projection compensation—not deletion of `gdt_people`, provider history, or canonical people. Canonical decisions and domain projections stay transactionally separate.

## Mutation-free proof and acceptance gate

The service contains select-only queries; the route exports JSON with `private, no-store`; no POST/PATCH/DELETE action, insert/update/upsert/delete, RPC decision call, review-case enqueue, or Apply All UI exists. Automated tests exercise all classifications, stable/stale fingerprints, keep-separate, shared-guardian relationship separation, masking, platform-only authorization, paging, and no-write source contracts.

Hosted staging acceptance remains required for exact mappings, actual counts, direct-route denial, cross-organization substitution, large-page query performance, schema/RLS/grants, and zero before/after mutation fingerprints. No migration and no production deployment are authorized.
