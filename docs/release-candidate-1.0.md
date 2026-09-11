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
- Release-candidate Venue preview: `https://gameday-g8k298dnc-gamedayos.vercel.app`, READY, Preview deployment `dpl_6ipbjRJzkGbDTjNZruPsZWRp3DCQ`, commit `7de1142185a2be7d22ad5e2bd6ed5294575fce79`.
- Latest known Team preview: `https://game-day-team-9a8mm1hs1-gamedayos.vercel.app`, READY, commit `17be3db3ed4f510fce4148890f4a5f1fb01ac64d`.
- The Team preview still predates the release-candidate HEAD. The Venue preview is protected release-candidate evidence for Phases 5 and 6 only.

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
| 5 — Environment parity | PASS | Preview is protected, targets staging project `oiyitfatarrhnussyxfu`, disables dev login, uses an explicit server-side Pilot marker, preserves normal Supabase Auth, and passed hosted route, runtime-log, and client-asset isolation checks on exact commit `7de1142`. |
| 6 — Hosted Auth setup and authentication | PASS | Existing synthetic GM and Staff identities authenticated normally, resolved to their intended Crossroads actors and roles, signed out cleanly, and passed the negative-auth, dev-login, runtime-log, and secret-isolation checks described below. |
| 7 — Hosted Venue GM authorization matrix | PASS | Normal Auth, allowed and denied direct routes, Crossroads scoping, search, Reports, object access, and runtime behavior passed on the protected Preview. |
| 8 — Hosted Venue Staff authorization matrix | PASS | Normal Auth, staff workflows, direct-route denials, manager-control denials, Crossroads scoping, search, and runtime behavior passed. |
| 9 — Cross-venue isolation | PASS | GM and Staff Riverside probes through routes, query parameters, search, Reports, fields, sessions, announcements, and venue surfaces exposed no private Riverside data. |
| 10 — Object-level authorization | PASS | Authorized Crossroads objects resolved; Riverside, unrelated-organization, invalid-ID, and parameter-substitution probes failed closed without scope widening or 5xx responses. |
| 11 — Identity Projection Worker Proof | PASS | A staging-only, database-native Supabase Cron worker now drains bounded batches through the existing service-only queue RPCs. Scheduled success, retry, terminal failure, idempotence, concurrency, stale-lease recovery, canonical-decision safety, and cross-organization denial passed. |
| 12 — Projection Monitoring | PASS WITH P1 PRODUCTION ALERTING REQUIREMENT | A service-only, PII-free health summary and worker run history are implemented and validated. Active production alert delivery is intentionally not configured in this staging-only sprint and is required before production. |
| 13 — Work Order Photo Storage Security | PASS | Private bucket/grants, anonymous and unrelated-user denial, GM/Staff and cross-venue object authorization, signed-URL expiry/renewal, safe keys/audits, and final reconciliation passed against real synthetic staging objects. |
| 14 — Work Order Photo Lifecycle | PASS | Canonical upload/read/remove, five-photo concurrency enforcement, invalid/oversized failure safety, resolution with/without media, Staff ownership controls, and final cleanup passed. A rejected-file retry defect was fixed and reaccepted on the protected Preview. |
| 15 — Photo Metadata and Retention | PASS WITH P1 PRIVACY POLICY REQUIREMENT | Hosted download proved EXIF orientation, description, and GPS are retained byte-for-byte. Logical removal plus physical object deletion passed; policy approval for metadata stripping and retention periods remains required before production. |

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

## Phase 5 — Environment parity

Evidence type: **Vercel configuration names/scopes, one explicitly revealed public project URL, deployed-preview behavior, and repository implementation review**, recorded 2026-09-10. Secret values were not revealed or retrieved.

### Preview/staging findings

| Requirement | Result | Evidence |
| --- | --- | --- |
| Public Supabase target | Correct target | `NEXT_PUBLIC_SUPABASE_URL` is Preview-scoped and resolves to authorized staging project `oiyitfatarrhnussyxfu` (`gameday-os-staging`). |
| Browser-safe Supabase key | Present | `NEXT_PUBLIC_SUPABASE_ANON_KEY` is Preview-scoped. Its value was not recorded. |
| Service-role credential | Present, server-only | `SUPABASE_SERVICE_ROLE_KEY` is Preview-scoped, unprefixed, and classified as a secret. No `NEXT_PUBLIC_` service-role variable exists. |
| Session/server secrets | Partially present | `SESSION_COOKIE_SECRET` is present for Preview and Production and is server-only. No Preview-scoped `CRON_SECRET` was found. |
| Work Order storage | Correct target | Work Order photo storage is Supabase-backed; the Preview public URL and service-role configuration target staging, and the verified private `work-order-evidence` bucket exists there. |
| SportsEngine calendar | Missing | No Preview-scoped `SPORTSENGINE_KELLY_GREEN_WEBCAL_URL` or equivalent private calendar-feed variable was found. OAuth-oriented SportsEngine variables are also absent from the inspected inventory. |
| Analytics/feedback | Staging-targeted by shared data boundary | The current feedback and sponsor-analytics server paths use the configured Supabase URL/service role. No separate cross-environment analytics credential was found. |
| Pilot marker | Wrong for current RC branch | `PILOT_PREVIEW` is absent. The implementation recognizes Vercel Preview as Pilot only for Git branch `security/audit-remediation-2026-08-28`; the current RC branch is `codex/production-readiness-2.0c`. |
| Dev-login gate | **P1 wrong configuration for intended RC preview** | `NEXT_PUBLIC_ENABLE_DEV_LOGIN` is Preview-scoped and set to `true`. The currently deployed pre-RC preview redirects `/dev-login` to normal `/login` only because its legacy branch activates the hard-coded Pilot exception. A new preview from the current RC branch would not activate that exception and would expose the unauthenticated demo-role selector and signed dev session workflow. |

### Production name/presence inspection

Read-only name/scope inspection found Production-scoped Supabase public, publishable/anonymous, service-role/secret, JWT, and database connection variables. `SESSION_COOKIE_SECRET`, `OPENWEATHER_API_KEY`, and `NEXT_PUBLIC_APP_URL` are shared across Production and Preview. Production values and target identifiers were not revealed, so their target correctness remains **unknown**. No production setting, deployment, database, or data was changed.

### Phase 5 remediation and hosted acceptance

The P1 dev-login exposure was corrected in commit `7de1142185a2be7d22ad5e2bd6ed5294575fce79` (`fix(venue): disable dev login in pilot previews`). The application now requires explicit local development, an explicit enable flag, no Vercel environment, and no Pilot marker before dev login can be used. Pilot classification no longer depends on a legacy branch name.

Preview configuration after remediation:

- `NEXT_PUBLIC_ENABLE_DEV_LOGIN=false` for Preview.
- `PILOT_PREVIEW=true` for Preview only.
- `NEXT_PUBLIC_SUPABASE_URL` resolves to authorized staging project `oiyitfatarrhnussyxfu`.
- Supabase service-role and session credentials remain unprefixed, server-only secrets.
- No private SportsEngine WebCal credential is configured; that remains a later provider-acceptance limitation.

During configuration, `PILOT_PREVIEW` was initially created with Vercel's default Production scope and immediately corrected to Preview scope before the release-candidate deployment was created. No production deployment, alias, database, migration, or data change occurred, and the final scope used by this release is Preview only.

Protected Preview evidence:

- Deployment `dpl_6ipbjRJzkGbDTjNZruPsZWRp3DCQ` is READY, has no production target, and is sourced from branch `codex/production-readiness-2.0c` at exact commit `7de1142185a2be7d22ad5e2bd6ed5294575fce79`.
- `/dev-login` redirects to `/login?next=%2Fdev-login` and renders only the normal email/password sign-in experience; no dev role selector is present.
- Direct `GET /api/dev-login/login` redirects to `/login?next=%2Fapi%2Fdev-login%2Flogin`.
- A crafted synthetic `POST /api/dev-login/login` returns `307` to the same normal-login path and does not create a dev session.
- A synthetic invalid login exercised normal Supabase Auth and returned the expected invalid-credential response without an auth redirect loop.
- Thirteen loaded client assets were scanned. The authorized staging project reference was present; no `sb_secret_`, service-role, session-secret, private SportsEngine, database-URL, or `service_role` credential pattern was found.
- Deployment-scoped runtime logs contained 200/307 traffic only for the acceptance probes, with no warning, error, fatal, or 5xx result and no matches for the reviewed secret patterns.
- Browser console review found no warning or error entries.
- All temporary protection-cookie and downloaded-asset artifacts were deleted immediately after testing.

Local regression evidence for the remediation: 24 focused tests passed; the complete Venue suite passed 707/707; TypeScript, client-readiness, and the production Webpack build passed; lint reported zero errors and the one pre-existing warning in `src/components/auth/set-password-form.tsx`. The default Turbopack build remains unsuitable in this external worktree because its dependency symlink is outside the inferred filesystem root; the Vercel-hosted Turbopack build itself completed successfully.

### Phase 5 decision

**Phase 5: PASS.** The exact reviewed commit is available on the protected, non-production Preview; the Preview targets the authorized staging project; dev login fails closed at both page and API boundaries; normal Supabase Auth remains available; and the scoped hosted isolation checks found no secret exposure. Phase 6 is next and was not started here.

Remaining later-phase limits: provide and accept the private SportsEngine WebCal configuration only at the authorized provider gate, and inspect production target correctness only under the later production read-only gate.

## Phase 6 — Hosted Auth setup and authentication

Evidence type: **staging hosted authentication, browser session behavior, deployment-scoped runtime logs, and focused local regression tests**, recorded 2026-09-10. No operational staging record or production system was changed.

### Environment and fixture preflight

- Deployment `dpl_6ipbjRJzkGbDTjNZruPsZWRp3DCQ` remained READY, non-production (`target: null`), and tied to exact reviewed commit `7de1142185a2be7d22ad5e2bd6ed5294575fce79` on `codex/production-readiness-2.0c`.
- The protected Preview continued to display its server-derived `PILOT` marker and used the authorized staging Supabase project `oiyitfatarrhnussyxfu`. Normal hosted Auth resolved staging fixture data; production was not inspected or changed.
- `/dev-login` continued to redirect to the normal login page. No development fixture chooser or successful dev-login session was available.
- The existing synthetic Venue GM and Venue Staff Auth users were reused. Each had a confirmed Auth user, an active linked `public.users` profile, exactly one approved Crossroads assignment, and the expected `venue_director` or `venue_staff` role. Neither current fixture has an `account_people` row; that canonical identity claim is not required by the current hosted actor resolver, which follows Auth user to profile to approved role assignment. No assignment, profile, venue scope, role, or identity metadata was modified.
- Prior temporary credentials were unavailable by design, so a reset was required. Two distinct policy-compliant temporary passwords were applied only to the two existing synthetic staging Auth accounts. The reset changed password hashes and Auth update timestamps only. No credential value was written to this document, chat, repository, persistent environment file, browser screenshot, or runtime log.

### Hosted authentication results

| Check | Result | Evidence |
| --- | --- | --- |
| Venue GM normal Auth | PASS | Normal email/password sign-in reached the authenticated Venue shell with `Venue GM`, the Crossroads venue context, and the `PILOT` marker. No platform-admin substitution or redirect loop appeared. |
| Venue GM session/sign-out | PASS | The authenticated shell and assigned venue data proved a usable hosted actor session. Normal sign-out returned the browser to `/login`; the GM actor shell was no longer present. No token or cookie value was read or recorded. |
| Venue Staff normal Auth | PASS | Normal email/password sign-in reached `/today` with `Venue Staff`, the Crossroads venue context, and the `PILOT` marker. No development login path or redirect loop was involved. |
| Venue Staff session/sign-out | PASS | The authenticated Staff shell loaded with the active assigned role and venue. Normal sign-out returned the browser to `/login`; the Staff actor shell was no longer present. No token or cookie value was read or recorded. |
| Invalid credentials | PASS | One bounded invalid-credential attempt remained on `/login`, showed the normal generic failure state, created no actor shell, exposed no raw internal error, and did not fall back to dev login. |
| Missing/inactive assignment | NOT HOSTED-TESTED | No dedicated safe invalid-assignment staging identity was identified, and a valid fixture was not mutated. The focused fail-closed hosted-actor regression test passed instead. |

The first click of each responsive-shell sign-out control did not navigate because duplicate desktop/mobile controls were present in the rendered DOM. Selecting the visible control explicitly completed each normal sign-out. This is an automation-selector observation, not evidence of a user-facing sign-out defect.

### Runtime, isolation, and regression evidence

- Deployment-scoped Preview logs for the acceptance window showed successful page/function responses and the expected login/logout redirects. There was no unexpected 5xx, warning, fatal entry, missing-schema error, unknown-role fallback, auth redirect loop, or successful dev-login activity.
- Aggregated runtime errors returned no error cluster for the reviewed window.
- The reviewed browser surfaces and runtime entries exposed no service-role key, session secret, private integration URL, development credential, password, token, or cookie contents.
- Focused local regression: 23/23 tests passed across `dev-login-environment`, `hosted-authorization-parity`, and `session-cookie` coverage. No application or Auth code changed, so the previously accepted 707/707 full suite, TypeScript, client-readiness, lint, local Webpack build, and hosted Turbopack build remain the code baseline rather than being re-run for this documentation-only phase.
- The original credential cleanup approach **B** was ended when hosted acceptance ceased to be contiguous. Both temporary staging passwords were invalidated after the pause by replacing them with distinct, unrecoverable random values generated inside PostgreSQL. Read-only postflight confirmed exactly two target Auth users, two distinct recently updated password hashes, the same two active expected Crossroads role assignments, and zero active Auth sessions. Profiles, roles, venue assignments, and metadata were not changed. Plaintext credentials remain absent from files, documentation, Git, logs, screenshots, and persistent environment variables; the SQL editor was scrubbed and saved with a credential-free placeholder after execution.

### Phase 6 decision

**Phase 6: PASS.** Both existing synthetic staging Venue identities authenticated through normal Supabase Auth, resolved to the intended Crossroads actor and role, and signed out cleanly. Invalid credentials failed safely, hosted dev login remained unavailable, and no session, secret, schema, or runtime regression appeared.

### RC pause marker after Phase 6

- **Phase 6:** PASS.
- **Phase 7:** NOT TESTED / intentionally skipped.
- **Phase 8+:** NOT STARTED.
- **Temporary hosted credentials:** invalidated after the pause; zero active sessions remain for the two synthetic accounts.
- **Next resume point:** Phase 7 — Hosted GM Authorization Matrix.
- On resume, generate fresh distinct temporary GM and Staff credentials, authenticate normally again, and run Phases 7 and 8 contiguously. Phases 0–6 do not need to be repeated unless the RC code, protected Preview, staging target, Auth configuration, fixture assignments, or another material environment assumption changes.

This pause marker is retained as historical evidence. The RC subsequently resumed without repeating Phases 0–6 and completed Phases 7–10 as recorded below.

## Phases 7–10 — Hosted authorization acceptance

Evidence type: **protected Preview behavior, normal staging Auth, direct-route and object probes, deployment-scoped runtime review, staging credential-cleanup postflight, and focused local regression tests**, recorded 2026-09-10.

### Fixed environment and identity boundary

- Protected Preview: `https://gameday-g8k298dnc-gamedayos.vercel.app`.
- Deployment: `dpl_6ipbjRJzkGbDTjNZruPsZWRp3DCQ`, READY, Preview target only, exact application commit `7de1142185a2be7d22ad5e2bd6ed5294575fce79`.
- Supabase: staging project `oiyitfatarrhnussyxfu` (`gameday-os-staging`). Production was not accessed or changed.
- Both existing synthetic users were reused. The GM retained exactly one approved `venue_director` assignment and the Staff user retained exactly one approved `venue_staff` assignment, both scoped to Crossroads. Neither user had a platform role or unexpected assignment.
- Hosted sessions used normal Supabase email/password Auth. `/dev-login` and `/api/dev-login/login` continued to fail closed to normal login.
- The Preview continued to display the server-derived `PILOT` marker. No credential or secret value was recorded.

### Phase 7 — Venue GM authorization matrix

The authenticated Venue GM resolved to Crossroads and exposed the canonical capability set: `venue.manage`, `venue.staff.manage`, `venue.field.manage`, `venue.device.control`, `venue.alert.send`, `venue.emergency.override`, `device.manage`, `device.control`, `sponsor.manage`, `media.manage`, `audit.review`, `identity.role.manage`, `game.status.update`, and `tournament.game.delay`. The `identity.role.manage` capability did not grant the platform Roles surface, which separately requires platform permission management.

Allowed navigation and direct-route checks passed for Home, Today, Fields, Schedule, Work Orders, Venue Status, Announcements, End of Day, account, Reports, Venue Settings, the authorized Crossroads public venue page, the authorized Crossroads field-control page, the authorized Crossroads session detail/edit entry points, and field disruption review. The role-specific Getting Started guide and navigation matched the GM job.

Direct probes of Platform Admin, Roles, Identity, Organizations, Billing, Developer, Impersonation, and platform onboarding routes redirected to the authorized Venue home. Universal Search returned only authorized Crossroads fields, games, teams, and the safe Work Order; Riverside searches returned no Riverside result. A Reports request carrying a Riverside `venueId` remained scoped to Crossroads. The GM actor and venue context remained stable across allowed and denied probes.

The disruption page was authorized and correctly reported no remaining games affected. The only safe Crossroads session fixture was historical, so the canonical move entry could not perform a live reversible move. This is fixture coverage debt, not an authorization failure.

### Phase 8 — Venue Staff authorization matrix

The authenticated Venue Staff user resolved to Crossroads with exactly `venue.field.manage`, `venue.alert.send`, `device.control`, and `game.status.update`. The Staff navigation was limited to Today, Fields, Venue Status, Announcements, Work Orders, account, and Feedback; its Getting Started guide contained no Schedule or manager task.

Allowed navigation and direct-route checks passed for Today, Fields, Work Orders, the authorized Work Order detail, Venue Status, Announcements, account, the Crossroads public venue page, permitted field status actions, and disruption review. The authorized Work Order exposed Add Note and Add Photo but did not expose Reopen or another manager-only control. Staff search results stayed operational and Crossroads-scoped and did not expose Schedule links.

Direct probes of Home/admin, Schedule, Venue Settings, Roles, Reports, Identity, Organizations, Billing, Developer, platform onboarding, field creation, scoreboards, resources, integrations, and full field setup/control redirected to Today. Riverside searches produced no Riverside field, session, or Schedule link.

### Phase 9 — Cross-venue isolation

Riverside probes used its known venue, field, and session identifiers through direct URLs, query parameters, Universal Search, Reports, Fields, Schedule, Work Orders, Announcements, disruption, private venue-mode, and public venue-map surfaces. Neither role received private Riverside field, schedule, Work Order, announcement, identity, or management data. No safe Riverside Work Order or announcement fixture existed, so those object-detail cases are supported by route/query probes and focused automated coverage rather than a live Riverside object.

The public Riverside venue route intentionally returned public venue information and no management terms or private content. Some unauthorized or missing GM venue-mode/announcement routes rendered a shell without private content instead of an explicit redirect or 404; this is a denial-UX limitation, not data exposure.

### Phase 10 — Object-level authorization

Known authorized Crossroads field, session, Work Order, disruption, and public-map identifiers resolved for the appropriate role. Known Riverside field and session identifiers, unrelated-organization targets, privacy/identity/reconciliation targets, and invalid object identifiers failed closed through direct paths and parameter substitution. Staff manager-only routes returned to Today. Invalid sessions produced a safe not-found state, invalid Work Orders returned 404, and no probe produced an internal error or 5xx response.

The query-parameter matrix covered `venueId`, `organizationId`, `fieldId`, `gameId`, and `workOrderId` on Today, Schedule, Fields, Work Orders, Announcements, and Reports. None widened venue or organization scope.

### Runtime, regression, and credential cleanup

- Browser console review for both roles found no warning or error, hydration failure, redirect loop, missing-column error, or uncaught exception.
- Deployment-scoped review found no error, warning, or fatal entry during the acceptance window. It did not expose a secret, private integration value, password, token, or cookie.
- Focused local authorization regression ran 81 tests across hosted parity, tenant isolation, venue scope, navigation, Universal Search, Work Orders, field disruption, legacy reconciliation, and Platform Identity; all 81 passed.
- No application code changed. The accepted complete baseline remains 707/707 tests with TypeScript, client readiness, Webpack production build, and hosted build passing; lint remains at zero errors with the one pre-existing warning.
- No operational staging record was mutated during Phases 7–10. The unavailable historical game-movement fixture was not forced into an artificial mutation.
- After acceptance, both temporary staging passwords were replaced with distinct unrecoverable values generated inside PostgreSQL and both Auth sessions were deleted. Postflight returned two target users, two distinct hashes, both prior temporary passwords invalid, two recently updated Auth rows, two active profiles, both expected approved Crossroads assignments, zero platform assignments, zero unexpected assignments, and zero active sessions.
- Profiles, roles, venue assignments, user metadata, memberships, and production remained unchanged. The credential-bearing SQL was removed from the editor after verification. No credential-bearing file, environment file, screenshot, log entry, documentation entry, or Git artifact was created or retained.

### Phases 7–10 decision

**PHASES 7–10 PASS.** The GM and Staff matrices, cross-venue isolation, and object-level authorization passed on the protected staging Preview. The documented fixture and denial-UX limitations do not expose data and do not block the RC from advancing.

The next gate is **Phase 11 — Identity Projection Worker Proof**. It was not started by this acceptance run.

## Phase 11 — Identity Projection Worker Proof

Evidence type: **repository implementation audit, staging schema/function/queue inspection, scheduler inventory, and focused local regression**, recorded 2026-09-10.

### Implemented queue architecture

- `platform_identity_projection_queue` is the database-backed queue. It stores organization, canonical person, source identity, originating identity event, operation, target domain, stable dedupe key, minimized context, status, attempt count, availability, lease ownership, safe error code, and lifecycle timestamps.
- Lifecycle states are `PENDING`, `PROCESSING`, `RETRY`, `COMPLETED`, and `FAILED`. Supported operations are `ENSURE_PERSON_MAPPING`, `SYNC_RELATIONSHIPS`, and `CLEANUP_SOURCE_MAPPING`; the implemented target domain is `team_family`.
- Enqueue validates organization ownership and uses a unique `dedupe_key`. Claims use `FOR UPDATE SKIP LOCKED`, increment attempts, and create a 120-second lease by default. Expired claims return to `RETRY` below five attempts and become `FAILED` at the fifth attempt.
- Retry backoff is deterministic exponential delay starting at 60 seconds and capped at 3,600 seconds. Authorized manual retry resets attempts and availability without editing the payload or canonical identity.
- Apply re-reads current source, person-organization, legacy-link, and relationship state. Person and relationship projections use stable upserts; cross-organization source state and stale canonical state fail closed. Projection failure remains transactionally separate from the committed canonical link, resolved review, and administrator audit.
- Queue tables and RPCs are service-only. Hosted privilege inspection confirmed `anon` and `authenticated` cannot execute claim, apply, fail, or retry; `service_role` can. The functions are `SECURITY INVOKER`.
- Venue's server worker entry point is `processPlatformIdentityProjectionQueue` in `src/lib/services/platform-identity-review.ts`. It drains at most 25 items per call and is currently invoked in batches of five only after administrator resolution or retry actions. Team's `processProjectionQueue` is similarly invoked as part of the Studio Director identity import request path.
- Existing administrator detail pages expose per-person/per-review projection status, attempt count, safe error code, and an authorized retry action for failed items. No independent bounded queue-health dashboard or alert was evaluated because Phase 12 was not reached.

### Scheduler and hosted staging evidence

- Venue `vercel.json` configures only `/api/weather/auto-check` at `0 12 * * *`; it has no identity projection worker route or cron.
- Team `vercel.json` configures only `/api/cron/family-reminders` at `0 14 * * *`; it has no identity projection worker route or cron.
- Staging project `oiyitfatarrhnussyxfu` has neither the `pg_cron` nor `pg_net` extension installed, so no database Cron job can drain the queue.
- Staging has zero deployed Supabase Edge Functions, including no projection worker.
- The protected RC Preview therefore has an action-triggered in-request queue processor, not an active independent scheduled or durable triggered worker. Work that remains `PENDING`/`RETRY` after the initiating request, or becomes eligible after backoff/lease expiry, has no guaranteed future execution unless another administrator/import action happens to invoke the processor.

### Safe staging baseline

- Queue state is five `COMPLETED` items, each with one attempt. `PENDING`, `PROCESSING`, `RETRY`, and `FAILED` counts are zero.
- The inspection returned only status counts and schema/function metadata; no personal payload, provider secret, credential, or raw identity data was read.
- No synthetic person, source mapping, review, relationship, queue item, or domain projection was created. No staging data or configuration was changed, and production was not accessed.

### Focused regression

- Venue Platform Identity 1.2–1.3 focused suite: 32/32 passed.
- Team Platform Identity boundary focused suite: 8/8 passed.
- No application code changed. The accepted Venue 707/707 and Team 674/674 full-suite baselines, TypeScript, lint, builds, and client-readiness remain the release baseline and were not rerun.

### Phase 11 decision and stop

**PHASE 11 BLOCKED — P1 worker availability.** The queue schema, service-only security boundary, leases, bounded retry, idempotent apply, stale-claim recovery, cross-organization checks, canonical-decision separation, and action-triggered processors are implemented. However, there is no real scheduled or durable triggered worker in either application or in hosted staging. The Phase 11 acceptance contract explicitly requires such a worker and forbids faking readiness through manual queue mutation.

The run stopped at Phase 11.3 before creating a synthetic fixture or exercising hosted success, transient retry, terminal failure, concurrency, stale-claim, unlink/relink, relationship, or account-claim scenarios. Phase 12 was not started.

Required remediation is a separately reviewed, authenticated, server-only projection worker scheduled against staging, with bounded batches, current claim/apply/fail RPCs, a single-purpose secret, runtime logging, backlog/stale-item health visibility, and a non-customer staging alert destination. After it is deployed, rerun Phase 11 from the queue baseline and proceed to Phase 12 only if the complete hosted worker matrix passes.

## Phase 11A — Durable Identity Projection Scheduler and Worker Availability

Evidence type: **implemented migration, focused regression, and hosted staging acceptance**, recorded 2026-09-10. This section supersedes the earlier Phase 11 blocked decision while preserving that decision as historical evidence.

### Architecture and security boundary

- Staging migration `20260910222026_durable_identity_projection_scheduler.sql` enables `pg_cron` in `pg_catalog`, creates one every-minute job named `gameday-identity-projection-worker`, and calls `run_platform_identity_projection_worker(10)` directly inside PostgreSQL. No HTTP endpoint, `pg_net`, Vercel secret, Redis, Kafka, BullMQ, Edge Function, or second domain worker was added.
- Each run claims at most ten items; the function rejects batch sizes outside 1–25. It delegates claim, apply, and fail behavior to the existing canonical queue RPCs and retains their leases, dedupe keys, five-attempt bound, backoff, current-state revalidation, and organization checks.
- `LEGACY_MAPPING_REQUIRED` is classified as retryable configuration debt by `20260910222658_identity_projection_retry_classification.sql`. Permanent canonical-state and scope failures remain terminal.
- Worker execution and the health RPC are `SECURITY INVOKER`, executable by `service_role` only, and revoked from `public`, `anon`, and `authenticated`. The worker-run table is forced-RLS and deliberately has no browser policy. Its records and function results contain only aggregate counts, timestamps, status, and safe error codes.
- `pg_cron` 1.6.4 is installed only in staging. `pg_net` remains absent. One active job targets the staging `postgres` database. Production was not inspected, migrated, scheduled, or changed.

### Hosted acceptance matrix

- **Scheduled success:** a canonical synthetic mapping entered `PENDING`; without a manual processor call, the next Cron run changed it to `COMPLETED` with attempt count one and exactly one active projection.
- **Idempotence:** re-registering the same logical mapping through the official function preserved the completed queue item and single projection.
- **Transient retry and decision safety:** an administrator-confirmed `LINKED` review was committed, its synthetic downstream legacy mapping was temporarily unavailable, and Cron moved projection to `RETRY` with safe code `LEGACY_MAPPING_REQUIRED`. The review stayed confirmed, the canonical source link and truth summary stayed resolved, and the link audit remained exactly once. Restoring the mapping through the canonical registration path allowed a later scheduled run to complete on attempt two.
- **Permanent failure:** changing current canonical source state through the official confirmation path caused the obsolete queued mapping to end `FAILED` with `CANONICAL_STATE_CHANGED`, attempt one, and zero projection. The new current mapping was repaired and completed independently.
- **Concurrency:** two trusted workers competed for one item. Aggregate evidence showed two runs, one total claim, one completion, one empty run, and exactly one projection.
- **Stale lease:** an intentionally abandoned 30-second claim remained `PROCESSING` until expiry, then a scheduled run reclaimed and completed it on attempt two without duplicate projection or lock failure.
- **Cross-organization isolation:** attempting to enqueue an organization A source against an organization B person failed with `PROJECTION_SCOPE_DENIED`; no queue row was created.
- A final privileged invariant check confirmed the success, retry/recovery, permanent failure, canonical review/truth preservation, concurrency, stale recovery, cross-organization denial, health, and Cron-run assertions together.

### Runtime, advisors, and cleanup

- At the final acceptance snapshot, Cron had 23 successful and zero failed runs; maximum observed duration was 43.864 ms. Worker history had 26 successful and zero failed executions. Later empty runs are expected and remain bounded.
- Supabase security advisors reported no new worker vulnerability. The worker-run table has the expected informational `rls_enabled_no_policy` finding because browser access is intentionally denied by forced RLS and grants. Performance advisors reported no worker-specific finding.
- Synthetic provider `gameday_rc_test` fixtures were retired after proof: ten source identities are stale, all associated synthetic people are archived, organization links/relationships/domain projections are inactive, legacy links are removed, and no fixture queue item remains claimable. Historical evidence remains six completed items and one intentional terminal failure; the complete queue contains eleven completed and one failed item.

### Phase 11 redecision

**PHASE 11 PASS.** A real, independent, staging-only scheduler now executes the existing queue safely and the full required hosted matrix passed. The implementation preserves the committed canonical identity decision when projection fails and confines retries to downstream projection state.

## Phase 12 — Projection Monitoring

Evidence type: **implemented health surface and hosted staging validation**, recorded 2026-09-10.

- `get_platform_identity_projection_health()` returns only `pendingCount`, `oldestPendingAt`, `oldestPendingAgeSeconds`, `retryCount`, `failedCount`, `staleProcessingCount`, last successful/failed worker timestamps, last run status, and a safe error code. It is service-only and contains no names, email, phone, source metadata, provider credentials, or queue payload.
- Worker history records aggregate claimed/completed/retry/failed counts and safe status. Cron history in `cron.job_run_details` supplies scheduled start/end status and duration.
- Operational thresholds for production readiness are: warning when oldest pending age exceeds five minutes; critical at fifteen minutes; immediate attention for any stale processing item; warning for any retry item persisting beyond its next eligibility; immediate attention for any terminal failed item; and critical if no successful worker run occurs for three consecutive one-minute intervals.
- Recovery runbook: confirm the Cron job is active and recent run history is succeeding; read the service-only aggregate health result; inspect only authorized queue metadata for safe error codes; repair mapping/configuration without changing canonical identity; use the existing authorized retry action for eligible failed projection work; verify one eventual projection and no duplicate; escalate code or schema faults through a forward-only migration. Never reopen a confirmed identity review merely because projection failed.
- Staging monitoring is observable through the service-only health RPC plus worker/Cron history. No customer-facing dashboard or alert destination was added.

### Phase 12 decision

**PHASE 12 PASS WITH P1 PRODUCTION ALERTING REQUIREMENT.** The health contract, privacy boundary, execution history, thresholds, and recovery procedure are sufficient for this staging RC gate. Before production activation, connect the aggregate thresholds to an authenticated non-customer operations alert destination and prove delivery plus recovery. That missing active alert does not require changing the worker or canonical queue design.

## Phase 13 — Work Order Photo Storage Security

Evidence type: **implemented controls, automated validation, and hosted staging object-level acceptance**, completed 2026-09-11.

- Final protected Preview: `https://gameday-os-git-codex-production-readiness-20c-gamedayos.vercel.app`, deployment `dpl_Eq4PqZ1fyEnRYpvBhRSNjeBoxTia`, READY on exact implementation commit `a23d9a1b7d14466e54b3f2ab20828755b2bd5e0c`, targeting only staging project `oiyitfatarrhnussyxfu`.
- The `work-order-evidence` bucket remained private, limited to 8 MiB and JPEG/PNG/WebP. `work_order_photos` remained forced-RLS and service-role-only; `anon` and `authenticated` held no direct table grants and no browser-facing `storage.objects` policy existed.
- Against a known real synthetic object, anonymous public fetch, signing, upload, and listing failed closed. An ordinary authenticated Staff JWT could not fetch/sign the authorized venue object's raw Storage path, could not fetch/sign a Riverside object, could not upload or replace, and a direct remove request was proven by read-after-write to be an RLS no-op. Listings returned zero.
- The normal application path authorized the Crossroads GM and Staff through the Work Order/venue boundary. Staff could view signed photos, add evidence to an authorized Work Order, remove only their own evidence, and could not remove GM evidence. GM could add and remove authorized evidence. Riverside remained inaccessible; the one isolated temporary Riverside object was preflighted against an empty prefix, used only for denial probes, deleted exactly, and the prefix returned to empty.
- Object keys contained only venue UUID, `work-orders`, Work Order UUID, random media UUID, and extension. No name, email, title, field label, signed URL, or credential appeared in a key or audit payload.
- A GM-issued signed URL returned 200 in-browser, returned 400 after 310 seconds, and a refreshed authorized page issued a replacement URL that returned 200. The URL itself was never logged or persisted.
- `work_order.photo_added` and `work_order.photo_removed` audits contained stable media identity and bounded operational metadata without object path, signed URL, token, password, service-role marker, binary content, or user PII.

### Phase 13 decision

**PHASE 13 PASS.** The private storage boundary, application authorization, direct Storage denial, cross-venue isolation, signed-URL expiry/renewal, key privacy, and audit safety all passed with real synthetic staging objects.

## Phase 14 — Work Order Photo Lifecycle

Evidence type: **hosted staging browser workflow, direct bounded negative probes, authoritative database reconciliation, and automated regression validation**, completed 2026-09-11.

- Three clearly named synthetic Crossroads Field 4 Work Orders were used: `d6287ea3-51ef-43b9-b68a-c254f82de0c3` for the complete media lifecycle, `9970936c-37c4-4bb7-8200-07bd0ed4bbf8` for resolution without a photo and Staff ownership, and `363a82c1-beb2-4eef-88fd-12fa742e5ff6` for resolution-photo failure/retry. All three finished `resolved`.
- Initial upload, preview/read, additional upload, authorized removal, resolution with an after-repair photo, and resolution without a photo passed through the canonical UI. Staff viewed GM evidence without a removal control, added one authorized photo, removed their own photo, and received the audit-preservation confirmation.
- At four active photos, two isolated GM browser sessions submitted different valid JPEGs concurrently. The final active count was exactly five with no sixth active, pending, or failed row. A stale sixth submission also left the authoritative count at five.
- A text file rejected with the specific image-format message after bypassing only the browser `accept` hint. An 8,388,613-byte JPEG was rejected safely by the hosted request boundary with a generic retry message. Neither failure created a photo row, storage object, audit event, false success, or Work Order state change.
- The oversized resolution-photo attempt correctly left the Work Order in progress with no resolution/photo audit. It exposed one client-state defect: the visually cleared file input retained the rejected `File` in React state, so a no-photo retry required reload. Commit `a23d9a1b7d14466e54b3f2ab20828755b2bd5e0c` clears the file state and native input after every completed attempt while retaining the operator note.
- The focused fix was reaccepted on the final protected Preview: oversized photo failed safely, the note remained, the file displayed `No file chosen`, and an immediate second `Mark Resolved` without reload succeeded. No browser exception, runtime error, or HTTP 500 appeared.
- Final reconciliation: seven photo metadata rows were `REMOVED`, all seven physical objects were deleted, bucket object count was zero, and `PENDING`, `DELETE_PENDING`, `FAILED`, active-without-object, and orphan-object counts were all zero. Added and removed audit counts balanced 7:7. No unrelated staging record was changed.
- Validation after the fix: 720/720 full tests; focused photo/resolution tests 23/23; TypeScript passed; Webpack production build passed; client-readiness passed; lint had zero errors and the one unchanged warning in `src/components/auth/set-password-form.tsx`.

### Phase 14 decision

**PHASE 14 PASS.** The complete upload/read/remove/resolution lifecycle, role boundary, concurrency limit, negative-input safety, compensation behavior, retry correction, and final cleanup passed.

## Phase 15 — Photo Metadata and Retention

Evidence type: **hosted staging byte comparison, downloaded-object metadata inspection, implementation review, and policy-gap documentation**, completed 2026-09-11.

- The synthetic JPEG contained orientation `6`, description `GameDay RC synthetic photo 1`, and GPS coordinates `0°N, 0°E`. The downloaded stored object had an identical SHA-256 digest and retained the same EXIF orientation, description, and GPS values. Classification: **EXIF/GPS RETAINED**.
- Resolution does not automatically delete evidence. Canonical removal marks the metadata row `REMOVED`, records remover/time and an audit event, and physically deletes the active object. Final hosted reconciliation proved no remaining objects or incomplete cleanup states.
- Abandoned `PENDING`, `DELETE_PENDING`, `FAILED`, active-without-object, and orphan states are detectable by the service-only reconciliation/health path. The validated reserve-before-upload and delete-state transitions make failure retryable without exposing browser storage permissions.
- The repository provides privacy export/impact preview only. No destructive privacy erasure, tenant-offboarding purge, backup deletion, legal-hold workflow, or approved retention schedule exists. Supabase backup/PITR retention was not inspected or changed in this staging-only phase.
- P1 before production: approve whether operational uploads strip EXIF and precise GPS by default, plus explicit resolved/archive/offboarding/privacy-request retention and deletion periods, legal-hold exceptions, audit pseudonymization, and backup/PITR handling.

### Phase 15 decision

**PHASE 15 PASS WITH P1 PRIVACY POLICY REQUIREMENT.** Technical behavior is verified and cleanup is sound, but the current byte-preserving upload retains precise embedded metadata. Product/legal policy approval and the resulting implementation decision remain required before production.

### Acceptance security cleanup

- The two existing synthetic staging GM/Staff passwords were rotated again to distinct unknown random values after acceptance, and their remaining Auth session count was verified as zero. IDs, email addresses, app/user metadata, roles, memberships, and venue assignments were unchanged.
- No temporary password, Supabase key, Vercel token, signed URL, or authenticated browser state was printed, documented, committed, or kept in a persistent environment file. Automated browser sessions were closed, the OS clipboard was cleared, and all credential-bearing and photo-fixture temporary artifacts were deleted.
- Git remained free of environment and credential files. Production data, configuration, aliases, domains, deployments, and migrations remained untouched.

## Phase 16 — Hosted Work Order Lifecycle Acceptance

Evidence type: **protected Preview browser workflow, real staging GM/Staff sessions, direct server-action denial probes, authoritative database/audit reconciliation, deployment-log review, and focused local regression**, completed 2026-09-11.

- Environment parity passed on protected non-production deployment `dpl_2NdQvK3r8JCLxDB4m2hew9NkteMg`, built from application commit `4484c046371267db6b98a005da4fbafc44a97489` and targeting staging project `oiyitfatarrhnussyxfu`. `/dev-login` remained unavailable, Preview displayed `PILOT`, secrets remained server-only, and production was not accessed or changed.
- The existing synthetic Crossroads users authenticated normally and retained their exact assignments: GM `b5184fc5-60cc-43f8-bd38-9bdc6d6b9855` as `venue_director`, and Staff `5cc9cf92-0de8-41cc-8bcf-46b3e6a722d6` as `venue_staff`.
- One Work Order was created through the GM UI: `eaa34471-bf1a-40a8-bedf-b92f562c34d0`, `RC PHASE 16 — Hosted Work Order Lifecycle`, on Crossroads Field 4. It began `open` at `2026-09-11 14:52:10.38943+00`; creation history named the real GM actor.
- The implemented lifecycle is `open` (New) to `assigned` to `acknowledged` to `in_progress` to `resolved`, with management-only `resolved` to `open`. GM assigned Staff; Staff acknowledged, started work, added the bounded synthetic note, and resolved with a resolution note. The detail page retained the optional private-photo integration; no repeat media upload was necessary after Phases 13–15.
- Staff UI omitted Assign/Reassign, Reopen, and Escalate. Replays against the real Next server-action boundary for assignment, reopen, and escalation all returned safe permission denials and caused no state or audit change. GM performed assignment, reopen, and escalation successfully. Escalation changed priority to `urgent`, recorded the GM actor, and accurately stated that no automatic external notification was sent.
- Reopen returned the Work Order to `open` and cleared assignee, acknowledgement, start, close, due, and resolution fields while preserving venue, Field 4, creator, detail, and history. It was then re-completed through normal UI. A final short GM-owned cycle was used solely to prove End-of-Day removal after resolution.
- A current-version attempt to skip directly from `acknowledged` to `resolved` returned a conflict and did not mutate the Work Order or write history. In the stale-session test, Staff acknowledgement remained authoritative while the stale GM action refreshed to the current state with one acknowledgement audit. In the two-Staff-session race, one acknowledgement committed, both sessions converged on the authoritative state, and exactly one new acknowledgement audit existed.
- No second safe Staff fixture existed. Hosted unrelated-worker ownership was therefore not forced; focused coverage confirmed another worker receives no transition action, while management may advance work as designed.
- Field navigation returned to the correct Crossroads Field 4 sheet. At final resolution, the sheet accurately showed no unresolved issue. Work Order list, detail, and Search agreed on `Resolved`, `Urgent`, the current assignee, and Field 4. Both GM and Staff could find the canonical Work Order by title; searching the private note returned no result.
- End of Day displayed the fixture as `open · nobody assigned` while reopened and removed it from Needs Attention after resolution. No Work Order-specific in-app notification row was emitted, so no duplicate notification was present.
- Riverside Athletic Park had zero Work Order fixtures. A Riverside `venueId` query probe by both Crossroads roles exposed no Riverside content and did not widen scope; the existing Phases 9–10 object-isolation evidence remains applicable. No unrelated Work Order was updated during the entire lifecycle.
- Human-readable UI history and database audit history agreed. All created, assigned/claimed, acknowledged, started, note, resolved, reopened, and escalated events had a non-null real GM or Staff actor, Crossroads venue scope, sensible timestamps, and no service-role surrogate or duplicate row.
- Deployment review parsed 500 recent entries and found zero 5xx responses, missing-schema mentions, auth-loop mentions, or secret-like values. Staff and an independent clean GM session had zero browser errors on the canonical detail page. One older long-lived GM automation session retained a single minified React 418 after an intentional invalid 404 navigation and repeated it on reload; a second GM session with the same role/data did not reproduce it, no user-visible crash occurred, and all authoritative state remained correct. This is retained as browser-harness evidence, not treated as a lifecycle or integrity defect.
- Final fixture disposition is clearly synthetic, `resolved`, `urgent`, assigned to the synthetic GM after the End-of-Day proof, with resolution `RC Phase 16 End-of-Day integration cleanup.` Audit history remains available.
- Credential cleanup replaced both temporary passwords with distinct unrecoverable random values held only in process, deleted their exact Auth sessions and refresh tokens, and closed all five test browser sessions. Postflight returned zero sessions, zero refresh tokens, and the same two approved Crossroads assignments. No Phase 16 password entered the SQL editor, and all temporary environment, HAR, script, cache, and browser artifacts were deleted. Git remained free of environment or credential files.
- Focused lifecycle, ownership, field-context, Search, End-of-Day, and photo-integration regression passed 65/65. No application code changed, so the accepted 720/720 full suite, TypeScript, lint with zero errors and one unchanged warning, Webpack production build, client-readiness, and hosted build remain the application baseline.

### Phase 16 decision

**PHASE 16 PASS.** The hosted lifecycle, worker/manager boundary, direct denial paths, audit actors, invalid-transition guard, stale-state behavior, concurrency control, field/list/Search/End-of-Day projections, unrelated-record invariant, and credential cleanup passed without an application-code change.

The next exact gate is **Phase 17 — Field Mutation Smoke**. It was not started.

## Release boundary

- Production remains untouched.
- No production deployment or migration is authorized.
- No destructive privacy erasure or bulk legacy identity migration is authorized.
- Private provider URLs and credentials must never appear in this document.
