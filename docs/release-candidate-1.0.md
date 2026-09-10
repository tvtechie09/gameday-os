# GameDay Release Candidate 1.0

Status: **IN PROGRESS — NOT READY FOR PRODUCTION**

This document is the master evidence record for the Release Candidate 1.0 staging acceptance and production-readiness gate. Evidence is labeled as recorded baseline, local verification, staging hosted verification, production read-only verification, or not tested. Production deployment and production migrations are outside this sprint's authorization.

## Phase 0 — Authoritative baseline

Recorded on 2026-09-10 before any staging mutation.

### Repositories

| Product | Checkout | Branch | Starting HEAD | Worktree | Remote comparison |
| --- | --- | --- | --- | --- | --- |
| Venue | `/Users/kmcgraw/Documents/Codex/2026-09-10/gameday-venue-2.0c` | `codex/production-readiness-2.0c` | `61243279a506f806e1cf23455bb448b0247f5d9c` | Clean | No upstream configured; 16 commits ahead of local `origin/security/audit-remediation-2026-08-28` (`02b1f301655954be72da85cfe215a3465af5cc61`) |
| Team/Family | `/Users/kmcgraw/Documents/Codex/2026-09-10/gameday-team-remaining` | `codex/remaining-sprints-2026-09-10` | `13924e503961cca946edcb480e3f27147ab29768` | Clean | No upstream configured; 18 commits ahead of local `origin/security/audit-remediation-2026-08-28` (`b63a4defeda4fb8619a7ef4b3698a3b1ade742b0`) |

The release-candidate branches are therefore not represented by the currently deployed previews. Remote references were inspected locally; no push was performed.

### Recorded automated baseline

| Check | Venue | Team/Family |
| --- | --- | --- |
| Tests | 699 / 699 | 674 / 674 |
| TypeScript | Passed | Passed |
| Lint | 0 errors, 1 existing warning | 0 errors, 1 existing warning |
| Production build | Webpack passed | Standard Next.js build passed |
| Client readiness | Passed | Passed |

These are the immediately preceding verified results and will be rerun after any release fixes.

### Migration inventory

- Venue local SQL migrations: 119.
- Team/Family local SQL migrations: 17.
- Staging migration reconciliation: not yet completed.
- No migration has been applied by this release-candidate sprint at the time of this entry.

### Hosted targets

- Authorized staging Supabase project: `oiyitfatarrhnussyxfu` (`gameday-os-staging`, `us-east-2`, healthy). Verified through the connected Supabase management interface without retrieving credentials.
- Production Supabase project: unknown/not inspected. Production inventory is gated until staging acceptance passes.
- Venue Vercel project: `gameday-os` (`prj_fQmKMpCszNFolQAxEqzycx5ZYAo7`).
- Team Vercel project: `game-day-team` (`prj_npnRcoVRFlnnK6DcspfcD5N3w73a`).
- Latest known Venue preview: `https://gameday-37st643uc-gamedayos.vercel.app`, READY, commit `02b1f301655954be72da85cfe215a3465af5cc61`.
- Latest known Team preview: `https://game-day-team-9a8mm1hs1-gamedayos.vercel.app`, READY, commit `17be3db3ed4f510fce4148890f4a5f1fb01ac64d`.
- Both previews predate the release-candidate HEADs and are not release-candidate evidence.

### Current known blockers entering the sprint

1. Exact staging migration state has not been reconciled to schema truth.
2. Current previews do not contain the release-candidate commits.
3. Preview/production environment parity has not been verified.
4. Hosted GM, Staff, cross-venue, and object-level authorization matrices remain unaccepted for this candidate.
5. Projection worker scheduling, retry, backlog monitoring, and identity-decision preservation remain unproven in this staging cycle.
6. Work Order photo bucket privacy, lifecycle, EXIF/GPS behavior, and role isolation remain unproven in hosted staging.
7. SportsEngine Kelly Green hosted feed acceptance is outstanding.
8. Responsive, accessibility, weak-network, concurrency, runtime-log, analytics, privacy-preview, and reconciliation-preview gates are outstanding.
9. Production database inventory, backup/PITR evidence, schema delta, exact migration manifest, rollback target, and forward-fix plan are gated behind staging acceptance.
10. Privacy and P2 product-policy decisions remain unresolved.

## Sequential phase ledger

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 — Baseline | PASS | This document; both starting worktrees were clean before this file was added. |
| 1 — Staging access | PASS | Exact project `oiyitfatarrhnussyxfu` resolved as healthy `gameday-os-staging`. |
| 2 — Staging migration reconciliation | PASS | Exact forward-only staging manifest documented below. |
| 3 — Exact staging migration application | PASS | Four approved additive migrations applied to staging only; hosted history recorded all four. |
| 4 — Post-migration staging verification | PASS | Schema postflight passed; RC 1.0A enabled leaked-password protection, cleared the related advisor warning, and accepted the reviewed `btree_gist` placement for this RC. |
| 5+ | NOT TESTED | Not started. This narrowly scoped RC 1.0A task stops after clearing Phase 4. |

## Phase 2 — Staging migration reconciliation

Evidence type: **staging hosted, read-only**.

Staging reports 52 migration-history rows. Several known migrations were applied through the hosted migration interface and therefore have generated versions that differ from repository filenames. Classification uses migration purpose/name plus schema truth, not timestamp equality.

### Existing reconciliation and Platform Identity wave

| Current repository migration/purpose | Classification | Evidence |
| --- | --- | --- |
| Pilot public-table privilege hardening | Already present | Hosted migration `harden_pilot_public_base_tables`; no `anon`/`authenticated` grants were returned for the private tables sampled. |
| Identity-invite organization reconciliation | Already present | `identity_invites.organization_id` and its index exist; hosted reconciliation migration recorded. |
| Shared session compatibility | Already present | Required organization, operations-status, and scoreboard columns/indexes exist; hosted reconciliation migration recorded. |
| Work Order operations reconciliation | Already present | Game/asset/system-key fields and required indexes exist; private table grants remain server-only in the sampled grant inventory. |
| Logical asset health reconciliation | Already present | Connection-health and Edge-device fields/indexes exist; hosted reconciliation migration recorded. |
| Staging access roles 1.0B | Already present | Hosted migration recorded. |
| Identity-invite privilege hardening | Already present | No browser grants returned; hosted hardening migration recorded. |
| Venue Director permissions 1.0C | Superseded/already satisfied | All 14 required Venue Director permissions are present. Replaying the local migration is unnecessary. |
| Platform Identity 1.0 through 1.3 | Already present | Hosted migrations are recorded through Truth empty-state fix; canonical tables, projection tables, representative indexes, and all seven critical runtime/projection/Truth functions sampled are present. |

The identity tables intentionally have RLS enabled without `FORCE ROW LEVEL SECURITY`, matching the current repository migrations. Direct browser grants remain revoked; service-role access is the intended server boundary.

### Exact Phase 3 staging manifest

| Order | Repository migration | Classification | Preflight result | Intended impact |
| --- | --- | --- | --- | --- |
| 1 | `20260831190412_super_admin_permission_superset.sql` | Safe forward-only candidate | Migration absent. `super_admin` is missing the two permissions currently held by `platform_admin`: `integrations.view` and `integrations.edit`. | Add only missing role-permission rows and assert the superset invariant. |
| 2 | `20260910103000_notification_preferences_2_1a.sql` | Safe forward-only candidate | Preference table and all three notification columns are absent; one existing notification maps deterministically to `announcements`. | Add service-only preferences, notification category/priority/dedupe fields, indexes, constraints, and private grants. |
| 3 | `20260910143000_work_order_photo_evidence_2_1c.sql` | Safe forward-only candidate | Photo table and bucket are absent. Required UUID FK targets exist; staging has one Work Order. | Create private 8 MiB image bucket, service-only metadata table, constraints, indexes, and grants. No browser storage policy is introduced. |
| 4 | Team `20260909090000_sportsengine_calendar_schedule_events.sql` | Safe forward-only candidate | Event table is absent. Composite parent/provider keys and required provider columns exist. `gdt_team_profiles` currently has zero rows, so provider seeding is a no-op until an explicit staging Team mapping exists. | Add service-only schedule-event projection table and provider catalog seed behavior. Feed URL is not stored in Postgres. |

### Explicit exclusions

- No historical migration row will be cosmetically repaired or marked applied.
- No prior migration will be replayed solely because its repository timestamp differs from hosted history.
- Venue map, weak-network hardening, privacy preview, and legacy reconciliation preview are application-only in this candidate and require no schema migration.
- No acceptance fixture, SportsEngine credential, Auth identity, or production object is part of the Phase 3 migration set.
- Production remains untouched.

## Phase 3 — Staging migration application

Evidence type: **staging hosted, mutation authorized by the sprint**.

Applied sequentially to `oiyitfatarrhnussyxfu`:

1. `release_candidate_1_0_super_admin_permission_superset`
2. `release_candidate_1_0_notification_preferences_2_1a`
3. `release_candidate_1_0_work_order_photo_evidence_2_1c`
4. `release_candidate_1_0_sportsengine_calendar_schedule_events`

All four returned success and appear in hosted migration history with generated versions `20260910133956`, `20260910134004`, `20260910134009`, and `20260910134015`. No staging reset, data wipe, historical-history repair, Auth mutation, fixture creation, credential retrieval, or production access occurred.

## Phase 4 — Post-migration verification and stop condition

Evidence type: **staging hosted, read-only postflight**.

### Passing postflight evidence

- `venue_notification_preferences`, `work_order_photos`, and `gdt_team_events` exist with RLS enabled and forced.
- `anon` and `authenticated` have no SELECT/INSERT/UPDATE/DELETE privileges on those tables or on `notifications`.
- `service_role` has the required server-side table privileges.
- The `work-order-evidence` bucket is private, has an 8 MiB limit, permits only JPEG/PNG/WebP, and has zero bucket-specific browser policies.
- Required PK, FK, unique, check, and supporting index definitions are valid; no invalid index was returned for the new tables.
- The existing notification row was backfilled; zero notification rows have a null category.
- `super_admin` now contains every permission currently held by `platform_admin`.
- Projection queue state remains five `COMPLETED` items with no incomplete item introduced by these migrations.
- SportsEngine provider seeding remains zero because staging currently has zero `gdt_team_profiles`; this is expected and means hosted Kelly Green mapping is still outstanding.
- Migration-history verification shows all four release-candidate entries exactly once.

### Advisor result

Security advisor:

- Error-level findings: zero.
- Warning: leaked-password protection is disabled. This is a P1 authentication-security blocker for the release candidate. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Warning: `btree_gist` is installed in the `public` schema. Its dependents must be inventoried before any relocation; it was not moved during this run. See [Supabase database lint 0014](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).
- Informational: 108 RLS-enabled tables have no policies. This is consistent with the service-only, grants-revoked pattern for many GameDay tables, but the complete set still requires privilege verification during security acceptance. See [Supabase database lint 0008](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Performance advisor:

- 108 informational unindexed-FK findings.
- 231 informational unused-index findings.
- Two `auth_rls_initplan` warnings.
- 30 multiple-permissive-policy warnings.
- Two duplicate-index warnings on `sessions`.
- One informational Auth absolute-connection-allocation finding.

These performance findings were recorded and not changed because this is a release-validation sprint, the new-table postflight is valid, and speculative remediation is outside scope.

### Original absolute stop

The original sequential queue stopped at Phase 4 because leaked-password protection was disabled. Phases 5–59 were not started. Specifically, no Vercel environment inspection, preview deployment, hosted Auth acceptance, GM/Staff mutation, SportsEngine feed retrieval, responsive/browser acceptance, production inventory, production migration planning, or production access followed that finding. RC 1.0A subsequently addressed and revalidated this gate as documented below.

## RC 1.0A — Authentication security remediation and Phase 4 revalidation

Evidence type: **staging hosted configuration and read-only post-remediation verification**, recorded 2026-09-10.

### Staging and Auth configuration

- The exact target was reconfirmed as Supabase project `oiyitfatarrhnussyxfu`, named `gameday-os-staging`. No local or production project was used.
- Leaked-password protection was **disabled before** remediation and is **enabled after** remediation. The setting was saved through the normal Supabase Auth configuration interface and then reopened to verify persistence.
- Minimum password length has no explicit override displayed in the dashboard. The interface identifies six characters as the platform minimum/default behavior and recommends eight or more; this evidence must not be read as an explicit eight-character staging policy.
- No additional required password character-class option is selected.
- Secure email change is enabled.
- Secure password change is disabled, and requiring the current password when updating a password is disabled. These settings were recorded, not broadened into an Auth redesign.
- No GM or Staff password was reset. Existing synthetic credentials were not safely available in this session, so lightweight hosted authentication is deferred to the normal Phase 6 acceptance gate.

### Security advisor rerun

The post-remediation security advisor returned:

- Error-level findings: **0**.
- Warning findings: **1**, the pre-existing `btree_gist` extension-in-public finding.
- Informational findings: **108**, all `rls_enabled_no_policy` notices.
- The leaked-password warning is no longer present. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- No new error-level finding appeared.

### Read-only `btree_gist` dependency audit

- Extension: `btree_gist`, version `1.7`, owned by `supabase_admin`, currently installed in `public`, and marked relocatable by PostgreSQL.
- Extension-owned inventory: 26 operator classes, 12 operators, 26 operator families, 188 functions, and 12 types. No extension-owned `SECURITY DEFINER` function was found.
- Current GameDay dependency: exclusion constraint `public.field_slot_claims.field_slot_claims_no_overlap` and its backing index. The constraint excludes overlapping confirmed time ranges on a field: UUID equality uses `public.gist_uuid_ops` from `btree_gist`, while the range overlap uses `pg_catalog.range_ops`.
- Repository provenance: `supabase/migrations/20260717090000_field_reservations.sql` enables the extension and defines the overlap constraint. No Team/Family migration references it.
- The application schema therefore requires the extension for database-enforced prevention of overlapping confirmed field reservations.
- The intended `extensions` schema exists. In the current privilege inventory, `PUBLIC`, `anon`, `authenticated`, and `service_role` have schema usage but not schema creation on `public`; only the database owner can create there. The same browser roles do not have create privilege on `extensions`.
- Classification: **ACCEPTABLE FOR RC**. The warning identifies schema-placement hygiene, but the required extension does not create a practical browser-role security exposure under the verified schema privileges. Relocation is technically possible, yet changing a live extension that backs an active exclusion constraint/index is unnecessary release-candidate churn. Any future relocation should be a separately reviewed forward-only maintenance change with dependent-constraint validation. No schema was changed in RC 1.0A. See [Supabase database lint 0014](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).

### Service-role exposure recheck

- A tracked-repository scan found no literal service-role/secret credential and no `NEXT_PUBLIC_` service-role or secret variable name. Server-only references to `SUPABASE_SERVICE_ROLE_KEY` remain in server modules; documentation contains names/placeholders only.
- The existing compiled client-static output contains no `SUPABASE_SERVICE_ROLE_KEY`, `service_role`, or `sb_secret_` marker.
- The currently deployed pre-RC Venue preview response contains no service-role variable name or `sb_secret_` marker. This preview predates the RC branch and is supporting exposure evidence only, not RC deployment evidence.
- Preview runtime-log searches over the available seven-day window returned no match for the service-role variable name or secret-key prefix.
- The connected Vercel project metadata exposed no publicly named service-role/secret variable. No credential value was retrieved, copied, stored, printed into this record, or committed.
- No client analytics integration contains or receives the service-role credential in the reviewed repository paths. Browser-role Supabase access continues to use the public anonymous/publishable key boundary.

### Phase 4 decision and resume marker

**Phase 4: PASS.** Leaked-password protection is enabled and its advisor warning is cleared; the advisor has zero error-level findings; `btree_gist` has been explicitly audited and accepted for this RC; and no new Auth or security regression was identified by the scoped checks.

Release Candidate 1.0 may resume at **Phase 5**, starting from the post-Phase-4 state recorded here. Phase 5 and all later phases remain unexecuted by RC 1.0A. Phase 6 must perform GM and Staff hosted-auth smoke because credentials were intentionally not retrieved or reset here.

## Release boundary

- Production remains untouched.
- No production deployment or migration is authorized.
- No destructive privacy erasure or bulk legacy identity migration is authorized.
- Private provider URLs and credentials must never appear in this document.
