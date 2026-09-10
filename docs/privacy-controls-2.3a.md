# GameDay Improvement 2.3A — Privacy, Export, Retention & Erasure Controls

## Recommendation

**READY WITH POLICY BLOCKERS.** This sprint implements a platform-admin-only, read-only export and erasure-impact preview. It deliberately does not implement deactivation, provider unlink, Auth deletion, anonymization, or erasure execution. Those operations would be unsafe until retention, child/guardian, provider-resync, request verification, and audit rules are approved.

## Personal-data footprint

| Domain | Principal records | Classification | Current treatment |
|---|---|---|---|
| Supabase Auth/account | `auth.users`, `users`, `account_people` | authentication/security | Export includes stable account references, never credentials; Auth is not deleted with person |
| Canonical Identity | `people`, identifiers, organization links | user/provider supplied canonical data | Included when person is explicitly linked to requested organization |
| Provider identity | source identities, connection/external keys | provider sourced | Provider and external identity included; raw connection/config metadata excluded |
| Truth/provenance | provenance assertions and authority/review state | provenance/audit | Export includes references/hash, not asserted values or internal evidence payloads |
| Relationships | guardian/coach/member links | required relationship, child-sensitive | Relationship edges included without loading other persons' profiles; destructive preview blocks for review |
| Team/Family | Venue `families`, `family_members`, `teams`, `team_members`; Team `gdt_people`, `gdt_players`, guardian/family participants/members, invitations and registrations | domain projection and operational relationship | Canonical projections are enumerated where mapped. Legacy Team text-ID data needs explicit mapping before person-level erasure can be safe |
| Operations | Work Order actors, announcement authors, field/game audit | operational/audit | Not part of the direct identity export unless represented in identity audit; retention/pseudonymization policy required |
| Integration/projection | legacy links, domain projections, queue | derived/projection | Enumerated for cleanup impact; failures must remain visible and retryable |
| Pilot/analytics/feedback | coarse pilot events, page views, feedback | optional/operational | No reliable canonical-person join is claimed; retention and request matching remain policy work |
| Work Order photos | private evidence metadata/object | operational, retention-sensitive | Not assumed to belong to uploader as personal media; Work Order retention policy controls it |

## Operations are distinct

- **Export:** implemented as structured JSON, `private, no-store`, generic filename. Includes profile, account reference, identifiers, source links, relationships, organization/domain links, projection status, legacy links, and provenance references. Excludes secrets, provider config, fraud/security detail, audit metadata, other profiles, and raw asserted values.
- **Deactivate:** defined but not executable. Would stop active use without destroying history.
- **Erase/anonymize:** impact only. The UI always states erasure is blocked and exposes no destructive button or endpoint.
- **Provider unlink:** separate from canonical person and requires a resync tombstone/suppression contract.
- **Account deletion:** separate from canonical person. An Auth account must not cascade through child, guardian, team, provenance, or audit history.

## Authorization and isolation

Both page and export service require a current non-impersonating Platform Admin/Super Admin. The service validates person-to-organization membership before enumerating records. An invalid or cross-organization combination returns a generic unavailable response and does not echo IDs. Organization admins, Venue GM/Staff, parents, and public users have no route access. Self-service and guardian-on-behalf-of-child requests are deferred until verification policy exists.

## Child/guardian and shared data

One guardian request never deletes a child; one child request never deletes guardians or siblings. Relationship rows in which the subject or related person is in scope trigger manual review. Shared email/phone values cannot be deleted from another canonical person. Legacy unverified identifiers stay unverified. Future execution must operate on record identity, not value-wide deletes.

## Provider and projection behavior

Future erasure requires a non-PII tombstone sufficient to prevent an immediate provider re-import from recreating the erased identity. Whether a legitimate later resync creates a fresh person is policy-owned. Canonical identity, Team/Family cleanup, and Venue cleanup must be separate transactions: canonical decisions remain authoritative while projection cleanup failures are visible and retryable.

## Audit and retention

Identity resolution events, provenance references, legacy links, and operational audit cannot be broadly deleted without damaging security/decision integrity. Future execution should pseudonymize an actor only where approved and preserve a non-reversible request correlation. No legal duration is invented. Current code therefore treats all destructive classes as preview-only.

## Acceptance status

Pure dependency, account/person separation, relationship isolation, export-scope, no-cache, platform-admin, and no-destructive-endpoint contracts are automated. Hosted synthetic export, cross-org ID substitution, Supabase security advisor, Team legacy linkage, and destructive staging acceptance are not claimed and remain blocked. No migration is introduced and no production deployment is authorized.
