# GameDay Improvement 2.0C — Production Readiness Audit and Release Plan

Audit date: 2026-09-10  
Scope: GameDay Venue production candidate, shared Platform Identity dependencies, and Team/Family compatibility  
Hosted activity: metadata-only, read-only  
Production mutation: none

## Executive decision

**READY WITH REQUIRED PRE-MIGRATION WORK**

The current Venue candidate is locally healthy and materially ahead of the deployed production artifact. It is ready for a controlled production review, but it is not ready to be promoted or migrated today.

The blocking issue is database truth, not application compilation. The currently connected Supabase account exposes neither the authorized staging project nor the historically documented production project. Production migration history, schema signatures, privileges, row counts, backup/PITR availability, and queue state therefore could not be read directly. The repository also has known migration-history drift: staging was assembled through reconciliation and contains schema effects that are not represented by matching repository history rows. Running every repository migration, or even every migration after the deployed Git commit, would be unsafe.

The correct release path is a forward-only production reconciliation: fingerprint the live production contract, compare it to the current application contract, generate narrowly scoped reconciliation migrations where necessary, rehearse them against a production-shaped disposable database or Supabase branch, and only then request approval for a controlled production window.

## 1. Release-candidate baseline

| Surface | Current candidate | Hosted preview | Hosted production | Release observation |
|---|---|---|---|---|
| Venue | `5f62de4046f54e9e683c1a010b4004c646cada4a`, branch `security/audit-remediation-2026-08-28` / audit worktree branch `codex/production-readiness-2.0c` | READY deployment `dpl_57uhpq8x5V4AVLFEMgebpNS7AFDW`, commit `02b1f301655954be72da85cfe215a3465af5cc61`, preview URL `https://gameday-37st643uc-gamedayos.vercel.app` | READY deployment `dpl_Bqgx1YdVRgvRZL8ib2HQuKoLyz3R`, commit `149dcd0872eb6862ab8e9688fa493095865e1d48`; aliases include `venue.getgamedayos.com` | Candidate is 8 commits ahead of the locally cached remote feature branch and substantially ahead of production. It has not been pushed or deployed by this sprint. |
| Team/Family | `13924e51706715dc4b79a40ea75a8a2f003e6058`, branch `security/audit-remediation-2026-08-28` | READY deployment `dpl_DW2WwjHfwsWJrUVd3jjpYFDSv1Vw`, commit `17be3db3ed4f510fce4148890f4a5f1fb01ac64d` | READY deployment `dpl_F9UaarB2CBe6gviAni4CLjVMbQCv`, commit `505d1addd6613216f0b67d930081932e68afc804`; aliases include `app.getgamedayos.com` | Candidate is 18 commits ahead of the locally cached remote feature branch. SportsEngine calendar code is locally validated but hosted acceptance is explicitly deferred. Do not co-promote it implicitly with Venue. |
| Supabase staging | Authorized ref `oiyitfatarrhnussyxfu` (`gameday-os-staging`, historically verified in `us-east-2`) | Prior evidence shows pilot reconciliation and Platform Identity 1.0–1.3 acceptance | Current connector does not expose this project | Treat prior evidence as historical, not a current catalog read. |
| Supabase production | Historical repository evidence identifies `ekkmflksqerdhutqxeii` as `GameDayOS` | Not applicable | Current connector does not expose this project | Do not treat the historical ref as confirmed-current until the owner verifies it in the production control plane. |

### Current local validation

| Gate | Venue | Team/Family |
|---|---|---|
| Tests | 653/653 passing, 24 suites | 674/674 passing, 10 suites |
| TypeScript | Passed with `--incremental false` | Passed |
| Lint | 0 errors; one existing internal-navigation warning in `set-password-form.tsx` | 0 errors; one existing `<img>` performance warning in `mfa-panel.tsx` |
| Production build | Passed with Webpack; Proxy registered | Passed |
| Client readiness | Static contracts passed; hosted HTTP checks not run | Existing build/test gates passed; hosted SportsEngine acceptance deferred |

### Known release limitations

1. The current Venue preview runs commit `02b1f30`, not candidate `5f62de4`.
2. The current Team preview runs commit `17be3db`, not candidate `13924e5`.
3. Production Supabase schema and migration history are not currently inspectable through the connected account.
4. Staging migration history is historically divergent from repository history; object existence does not prove policy, grant, constraint, or function equivalence.
5. Platform Identity projection is processed after administrator resolution/retry actions. No independent scheduled production worker is configured in `vercel.json`; stalled work therefore needs an explicit operating procedure before launch.
6. The Team SportsEngine calendar migration and real-feed behavior are not hosted-accepted and are outside this Venue release.
7. Hosted environment-variable names and scopes were not available through the metadata connector. No variable values were downloaded.
8. Vercel returned no runtime error clusters in the prior seven days, but also returned no grouped request counts. This is not proof of exercised production traffic or complete observability.

## 2. Read-only hosted inventory

### Vercel

- Team: `GameDay OS` (`team_fCdDlzA0VcaeJ9r9ZcJVwk1g`), Hobby plan.
- Venue project: `gameday-os` (`prj_fQmKMpCszNFolQAxEqzycx5ZYAo7`), Next.js, Node 24.x.
- Venue domains: `venue.getgamedayos.com`, `gameday-os.vercel.app`, and `gameday-os-gamedayos.vercel.app`.
- Team project: `game-day-team` (`prj_npnRcoVRFlnnK6DcspfcD5N3w73a`), Next.js, Node 24.x.
- Team domains: `app.getgamedayos.com`, `game-day-team.vercel.app`, `game-day-team-gamedayos.vercel.app`, and `game-day-team-git-main-gamedayos.vercel.app`.
- Both production deployments are marked rollback candidates. Application rollback is therefore available by alias rollback/promotion to a previously verified artifact.
- Venue has one configured Vercel cron: `/api/weather/auto-check` at `0 12 * * *`.
- Team has one configured Vercel cron: `/api/cron/family-reminders` at `0 14 * * *`.
- No production deployment or alias change was made.

### Supabase

The connected Supabase account exposes only an unrelated `Expenses` project. Consequently, the following current-state checks are blocked:

- production and staging migration histories;
- table, column, constraint, index, view, and function signatures;
- RLS enablement and policy definitions;
- `public`, `anon`, `authenticated`, and `service_role` privileges;
- role/capability catalog rows;
- production row counts and nullability/backfill risk;
- projection queue counts, leases, retries, and failed items;
- Auth configuration and leaked-password protection;
- backup/PITR status and recovery-point guarantees;
- security and performance advisors.

No production or staging SQL was executed.

## 3. Schema-delta assessment

### Current classification

| Contract area | Staging | Production | Classification |
|---|---|---|---|
| Pilot base-table grants and RLS | Historically reconciled and accepted | Not inspected | Production unknown |
| `identity_invites` provisioning/access | Historically reconciled | Not inspected | Production unknown |
| `sessions` Team/Venue compatibility | Historically reconciled | Not inspected | Production unknown |
| `field_work_orders` lifecycle columns/indexes | Historically reconciled | Not inspected | Production unknown |
| `venue_assets` logical health | Historically reconciled | Not inspected | Production unknown |
| Venue Staff / Venue Director capability catalog | Historically reconciled and hosted-role accepted | Not inspected | Production unknown |
| Platform Identity 1.0 foundation | Applied and synthetically accepted in staging | Not inspected | Production unknown |
| Platform Identity 1.1 resolver/runtime | Applied and synthetically accepted in staging | Not inspected | Production unknown |
| Platform Identity 1.2 review/projection | Applied and synthetically accepted in staging | Not inspected | Production unknown |
| Platform Identity 1.3 GameDay Truth | Applied and synthetically accepted in staging | Not inspected | Production unknown |
| Team/Family domain migrations after production commit | Present in candidate code and partly accepted in staging | Not inspected | Excluded from Venue-only wave; separate release required |

The September 2 staging audit found only 26 recorded hosted migrations against 101 repository migrations, with many historical effects present despite missing history rows. Later Platform Identity work was applied and verified separately. This makes migration-history comparison necessary but insufficient: release approval requires object-level schema and privilege fingerprints.

## 4. Forward-only production migration manifest

The following is the exact **candidate review order** derived from the Venue Git delta after production commit `149dcd0`. It is not yet an executable instruction. Each item must first be classified `already equivalent`, `missing`, `partial`, or `conflicting` against production. If an item is not wholly missing with compatible prerequisites, create a new production reconciliation migration instead of replaying it.

| Order | Repository migration | Purpose | Data/lock risk | Security impact | Recovery and verification |
|---:|---|---|---|---|---|
| 1 | `20260902170000_harden_pilot_public_base_tables.sql` | Revoke browser access to private Venue base tables and browser writes to Fields; retain service access | Brief privilege locks; no row rewrite | Critical tightening | Verify grants plus server-mediated GM/Staff/public reads and writes. Forward-fix only; never broadly regrant as rollback. |
| 2 | `20260902211810_reconcile_identity_provisioning_1_0a.sql` | Add `identity_invites` provisioning columns and FK index | Short table lock; no intended row rewrite | Supports safe invite lifecycle | Verify columns, null counts, FK/index signature, invitation creation and consumption. |
| 3 | `20260902211812_reconcile_shared_session_compatibility_1_0a.sql` | Add shared Team/Venue session compatibility columns and indexes | Table metadata locks plus index builds proportional to session count | No broad grants | Verify columns/indexes and existing sessions unchanged by row-count/checksum fingerprints. |
| 4 | `20260902211814_reconcile_work_order_operations_1_0a.sql` | Add Work Order lifecycle, actor, linkage, concurrency, and system-key support | Table lock and index builds; unique partial index may fail on existing duplicates | Forces server-only table access | Preflight duplicate system keys and null/invalid states; verify GM/Staff lifecycle and cross-venue denial. |
| 5 | `20260902211817_reconcile_logical_asset_health_1_0a.sql` | Add asset connection/health fields and indexes | Table lock and unique-index validation; inspect duplicate Edge device IDs first | Forces server-only asset access | Verify no asset loss, duplicate check, RLS/grants, and health projection. |
| 6 | `20260902214644_reconcile_staging_access_roles_1_0b.sql` | Add canonical `venue_staff` role and least-privilege capability mappings | Small catalog inserts | Authorization-critical | Diff role keys and capability rows before insert; verify exact Staff allow/deny matrix. Rename to production reconciliation if semantics already differ. |
| 7 | `20260902214646_harden_identity_invites_access_1_0b.sql` | Remove direct browser access to identity invites | Brief privilege locks | Critical tightening | Verify service-only invite operations and browser denial. Forward-fix only. |
| 8 | `20260903000219_reconcile_venue_director_permissions_1_0c.sql` | Add the canonical Venue GM permission superset without deleting existing provider permissions | Small catalog inserts | Authorization-critical | Compare exact role-permission set, add only missing rows, and exercise all GM direct routes plus cross-venue denial. |
| 9 | `20260903195110_platform_identity_1_0.sql` | Create/evolve 12 canonical identity tables, indexes, legacy backfill, RLS, and service-only grants | Highest data risk in the wave: backfill, FKs, indexes, and table locks depend on live people/account volume | Critical identity isolation boundary | Never replay until legacy-table shape, duplicate identifiers, orphan FKs, row counts, and grants are fingerprinted. Rehearse with a production-shaped copy; verify exact counts and no cross-org visibility. |
| 10 | `20260903201234_platform_identity_1_0_fk_indexes.sql` | Add 22 FK covering indexes | Index-build load proportional to identity volume | Performance/supporting integrity | Use production-appropriate concurrent index strategy if tables are populated; verify definitions and advisor output. |
| 11 | `20260903204221_platform_identity_1_1_runtime.sql` | Add tenant-scoped resolver, linking, unlinking, account-claim, authority, and review RPCs | Function replacement locks are short; behavior risk is high | Service-only privileged code | Verify `search_path`, execute grants, same-org enforcement, ambiguity, keep-separate, account/person separation, and idempotence. |
| 12 | `20260904004035_platform_identity_1_2_review_projection.sql` | Add review versioning, projection queue/domain projections, leases, retry state, and RPCs | Additive tables/indexes plus function changes | Critical queue and identity-decision boundary | Verify no browser execution, canonical decision atomicity, queue dedupe/lease behavior, failure visibility, and cross-org denial. |
| 13 | `20260904005857_platform_identity_1_2_admin_role_compatibility.sql` | Add identity-review capability compatibility to intended admin roles | Small catalog inserts | Authorization-sensitive | Diff exact production role catalog; do not grant organization-wide review by name inference. Verify direct-route denials. |
| 14 | `20260904010007_platform_identity_1_2_projection_fk_indexes.sql` | Add projection FK indexes | Index-build load proportional to queue/projection volume | Performance/supporting integrity | Verify definitions and advisor output; use production-safe index creation if populated. |
| 15 | `20260904121709_platform_identity_1_2_projection_safety_boundary.sql` | Separate authoritative identity decision transaction from retryable downstream projection | Function replacement; no intended broad row rewrite | Critical data-integrity correction | Verify canonical link/review/audit stay committed when projection fails, failed item is visible, authorized retry completes, and decision is not reopened. |
| 16 | `20260904123639_platform_identity_1_3_gameday_truth.sql` | Add Truth history index and service-only explanation RPCs | Index build plus function replacement | Protects provenance/identity explanations | Verify supported fields only, deterministic conflict semantics, bounded history, organization scope, and browser denial. |
| 17 | `20260904124708_platform_identity_1_3_truth_empty_state_fix.sql` | Preserve array-shaped empty Truth fields and final RPC grants | Short function replacement | Maintains service-only access | Verify empty state, RPC signatures, grants, and no permission regression. |

### Required preflight data queries

Before approving the manifest, collect for every affected table:

- exact row count and estimated/live size;
- duplicate candidates for every new unique index;
- orphan counts for every new FK;
- null and invalid-enum counts for every constrained/backfilled column;
- current index definitions and invalid-index state;
- table and function owner;
- RLS enabled/forced state;
- policy definitions and role grants;
- function volatility, security mode, `search_path`, and execute grants;
- migration-history name/version plus a normalized object fingerprint.

No row-count estimate is supplied where production could not be queried. Inventing zero or extrapolating staging counts would be unsafe.

### Team/Family exclusion

Do not include the Team candidate in the Venue production window. Relative to Team production commit `505d1ad`, the current branch adds 16 domain migrations, including Family, Coach, sharing, logistics, daily brief, and the unaccepted SportsEngine calendar table. If Team/Family is to be released, create a separate production reconciliation and rehearsal. The SportsEngine migration must remain excluded until its deferred staging acceptance closes.

## 5. Data-preservation gate

For each approved production reconciliation migration:

1. Capture migration history and normalized schema fingerprints.
2. Capture row counts and primary-key min/max or stable sampled hashes for affected tables.
3. Detect duplicate source identities, open Work Order system keys, Edge device keys, identifiers, and projection dedupe keys before adding uniqueness.
4. Detect orphan users, people, organizations, sources, sessions, Work Orders, assets, and projections before adding FKs.
5. Avoid `NOT NULL` until backfill is deterministic, bounded, verified, and reversible.
6. Use production-safe index creation for populated tables; do not assume ordinary `CREATE INDEX` has acceptable locking behavior.
7. Preserve audit/provenance rows. Never repair identity by deleting conflicting people or provider sources.
8. Record before/after counts and stop on any unexplained delta.

## 6. Security release gate

Production review must prove all of the following:

- `anon` and `authenticated` have no direct access to private Venue, Work Order, Identity, audit, projection, or provider tables.
- Public projections expose only public venue/field/session information and never Work Order notes, internal field data, private contacts, provider credentials, or identity provenance.
- Every exposed table has RLS; server-only tables are additionally protected by revoked browser grants.
- UPDATE policies have both `USING` and `WITH CHECK`, and required SELECT policies are understood.
- Every privileged function has a fixed safe `search_path`, explicit authentication/organization checks, and no execute grant to `public`, `anon`, or general `authenticated` unless deliberately public-safe.
- `service_role` is used only server-side and never appears in `NEXT_PUBLIC_*`, HTML, JavaScript bundles, browser storage, or logs.
- Venue GM and Venue Staff capabilities match the exact intended catalog; role names alone never grant access.
- Platform admin, organization admin, Venue GM, Venue Staff, Team/Family actors, and anonymous users are exercised through navigation and direct URLs.
- Cross-venue and cross-organization ID substitution returns no foreign data for Reports, Fields, Schedule, Work Orders, Identity Review, Truth, and projection actions.
- Audit actor, organization, venue, object, previous state, resulting state, and timestamp are correct for every consequential smoke mutation.
- Supabase security advisors are reviewed after the reconciled schema is applied in rehearsal and again after production migration.

## 7. Environment and secret contract

Only names and scopes should be compared; values must never be printed or committed.

### Venue contract

Core production requirements include `NEXT_PUBLIC_SUPABASE_URL`, a browser-safe `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_COOKIE_SECRET`, `NEXT_PUBLIC_APP_URL`, and correctly scoped cron/provider credentials. Optional capability variables include weather, Resend/email, Twilio, SportsEngine, Daktronics, and schedule-push credentials.

Production must enforce:

- `NEXT_PUBLIC_ENABLE_DEV_LOGIN` absent/false;
- `PILOT_PREVIEW` absent/false;
- no staging Supabase URL or staging service endpoints;
- no secret/service key in any `NEXT_PUBLIC_*` variable;
- production-only cron/provider credentials scoped only to Production;
- `NEXT_PUBLIC_APP_URL` resolves to the approved production domain;
- preview uses only `oiyitfatarrhnussyxfu`, never the production project.

### Team contract

If Team compatibility is exercised, verify its public Supabase URL/key, server-only service key, state table/state ID, site URL, cron secret, storage buckets, and Family reminder delivery configuration. Keep `SPORTSENGINE_KELLY_GREEN_WEBCAL_URL` preview-only and absent from Production until its acceptance gate passes.

Hosted name/scope status is currently **unknown** because environment metadata was unavailable through the connector. This is a release blocker. Do not pull values merely to produce the inventory; use Vercel dashboard metadata or a names-only API/CLI listing with redaction.

## 8. Integration readiness

| Integration | Current maturity | Production-release treatment |
|---|---|---|
| GameDay Native | Implemented | Core operational source; smoke canonical reads/writes and audit. |
| CSV/manual schedule | Implemented | Keep available; preview/apply remains authorized and tenant-scoped. |
| Public iCal feeds | Implemented where credential-free | Verify safe-fetch rules and source attribution; no private feed activation in this release. |
| SportsEngine direct Venue sync | Credential workflow implemented, customer contract unverified | Do not activate as part of release. Registration/payment remain provider-owned link-outs. |
| SportsEngine Team calendar | Locally implemented, hosted acceptance deferred | Exclude migration and credential from production. |
| Studio Director Team import | Implemented domain import with canonical projection attempt | Compatibility smoke only if configured; do not activate or broaden. |
| GameChanger | Link-out/framework | Do not promise synchronization. |
| TeamSnap, LeagueApps, PlayMetrics | Partner-access/link-out scaffolds | Keep disabled unless a separately verified customer integration exists. |
| Daktronics | Read-only adapter implemented, deployment-specific and unverified | Do not claim physical control. Verify token scope and onsite adapter separately. |
| Nevco | Future | No release dependency. |
| Weather | Implemented with daily Venue cron | Verify provider choice, coordinates/fallback, cron authorization, and last successful run. |
| Email/notifications | Implemented delivery framework; configuration unknown | Verify sender, provider, failure logging, and non-duplication before enabling. |
| Analytics/feedback | Pilot instrumentation implemented | Verify coarse metadata only, no raw query/PII, and failures remain non-blocking. |
| Scoreboard/audio/camera/signage | Mixed demo/framework/deployment-specific | Do not market general hardware control without Edge/customer-site acceptance. |

## 9. Projection and queue readiness

Platform Identity correctly separates the canonical decision transaction from downstream projection. Queue rows have stable dedupe, attempts, leases, `PENDING`/`PROCESSING`/`RETRY`/`FAILED`/`COMPLETED` states, and authorized retry paths.

The production operating gap is worker availability. Current Venue code invokes a bounded queue worker after an administrator resolves or retries a review. No Vercel cron independently drains identity projections. Before production review, choose and document one of these honest operating modes:

1. **Pilot/manual mode:** identity administrators monitor the queue and use the authorized retry action; alert on age/backlog. This is acceptable only for low pilot volume.
2. **Scheduled worker mode:** add a separately reviewed, authenticated, idempotent queue worker with bounded batches and monitoring. This is new implementation and is not part of 2.0C.

Required launch queries: counts and oldest age by status/organization, expired leases, items at max attempts, duplicate dedupe keys, missing target mappings, and recent failure codes. Stop if the queue cannot claim, fail visibly, retry, and complete without reversing canonical identity.

The older schedule `sync_queue` is a separate integration review queue and must not be confused with `platform_identity_projection_queue`.

## 10. Backup and rollback

### Database

- Confirm the production Supabase plan and whether PITR is enabled; do not infer this from project existence.
- Record the latest restorable point and have the operator demonstrate the restore path before the window.
- Export migration history, schema-only dump/fingerprint, RLS/policies/grants, function signatures, role catalog counts, and critical row-count fingerprints.
- Take an approved pre-release backup/snapshot immediately before migration.
- Prefer forward fixes for additive identity schema and privilege tightening. SQL down-migrations that drop identity/provenance/audit data are prohibited.
- If a migration partially succeeds, stop application promotion, retain evidence, and apply a reviewed forward correction. Do not delete or rebuild production.

### Application

- Record the active production deployment and alias mapping.
- Preserve `dpl_Bqgx1YdVRgvRZL8ib2HQuKoLyz3R` as the current Venue rollback candidate until the new release passes its monitoring window.
- Promote the exact preview artifact that passed acceptance rather than rebuilding different source during the window.
- Application rollback cannot reverse a database migration. The previous app must remain compatible with additive schema or the migration must include an explicit compatibility phase.

## 11. Proposed release sequence

1. Freeze the Venue candidate SHA and exclude Team/SportsEngine changes from the Venue wave.
2. Verify the production Supabase project identifier through the owner/control plane.
3. Obtain read-only staging and production migration histories, schema fingerprints, policies, grants, row counts, advisor results, and backup/PITR status.
4. Classify each of the 17 candidate migrations against production objects.
5. Generate new forward-only production reconciliation migrations for every partial/conflicting item.
6. Rehearse the exact reconciled migration set on a production-shaped disposable database/branch, including preflight failures and postflight queries.
7. Apply the same manifest to staging if not already equivalent; rerun GM, Staff, cross-venue, public, Identity, projection, and responsive acceptance.
8. Build and deploy the frozen candidate to a protected preview. Verify the SHA, staging marker, project ref, environment names/scopes, and no secret exposure.
9. Run all automated gates and the complete hosted smoke plan against that exact preview artifact.
10. Schedule a production change window, identify migration/application operators, backup owner, smoke testers, and rollback decision owner.
11. Capture the production backup and all pre-release fingerprints; stop if recovery cannot be demonstrated.
12. Apply only the approved forward reconciliation migrations in dependency order.
13. Run post-migration schema, grant, RLS, function, role, row-count, and queue verification before deploying the app.
14. Promote the exact accepted preview artifact to production.
15. Run anonymous/public smoke first, then GM, Staff, Work Orders, Schedule, Search/onboarding, Identity Review/Truth, and projection tests.
16. Reverse every disposable operational smoke mutation through the canonical workflow and verify audit history.
17. Monitor for at least one staffed operating window; retain the prior deployment alias as rollback candidate until the exit criteria pass.

## 12. Production smoke plan

Use dedicated synthetic production-smoke identities and a clearly named disposable venue/object set only after separate mutation approval. If production fixtures do not exist, restrict the first pass to read-only behavior and do not improvise with customer records.

| Persona/surface | Smoke case | Mutation and reversal |
|---|---|---|
| Anonymous | Load public venue and field routes; verify status/current-next projections and no private Work Order/Identity data | Read-only |
| Venue GM | Normal sign-in; Home, Today, Fields, Schedule, Venue Status, Work Orders, Announcements, Search, onboarding | Direct-route denial for Platform Admin/Billing/Organizations and unrelated venue |
| Venue Staff | Normal sign-in; Today, Fields, permitted field controls, Work Orders, Venue Status, Announcements | Deny Schedule, Settings, Roles, Reports, admin routes, manager Work Order controls, unrelated venue |
| Fields | Change one synthetic field state with expected revision; verify Today/public/audit | Restore original state through canonical field action and verify audit |
| Schedule/disruption | Review impact and move one reversible synthetic game | Restore original field/time through canonical move workflow; verify old/new projections and audit |
| Work Orders | Create, acknowledge/start, resolve, reopen if supported | Close or return disposable record to documented terminal state; never delete audit |
| Announcements | Create/publish a clearly synthetic limited-audience notice | Unpublish/remove through canonical action and verify public/internal projection |
| Search | Find authorized Field, Game, Work Order, and Team; try foreign IDs | Read-only; raw query must not be logged |
| Onboarding | Verify role-aware first-run content and direct-route authority | Device-local preference only; no capability mutation |
| Identity Review | Resolve a synthetic proposed candidate only | Confirm link/review/audit commit atomically; do not use customer identity |
| Projection queue | Force a synthetic retryable projection failure | Canonical decision remains; failed item visible; authorized retry completes |
| GameDay Truth | Inspect supported name fields, provenance, conflict and empty states | Read-only; service-only RPC and cross-org denial |

Responsive smoke: 320, 390, 430, 768 portrait, 1024 landscape, and 1440 desktop. Verify no document-level overflow, usable dialogs/sheets, keyboard focus, and no console hydration/auth-loop errors.

## 13. Stop conditions

Stop production promotion immediately for:

- wrong Supabase project or environment scope;
- missing/unknown backup or failed restore-path verification;
- migration-history/object-fingerprint mismatch not covered by the approved manifest;
- unexplained row-count, orphan, duplicate, or constraint finding;
- cross-venue or cross-organization exposure;
- Venue Staff or organization users gaining manager/platform capability;
- browser access to private tables, RPCs, Work Orders, identifiers, provenance, or queue data;
- secret/service credentials in browser bundles, logs, screenshots, or committed files;
- critical 5xx, auth redirect loop, hydration failure, missing-column error, or schema-cache error;
- incorrect audit actor/scope or a consequential mutation without audit;
- projection worker unable to claim/fail/retry/complete safely;
- public/private projection leakage;
- inability to restore a reversible smoke mutation;
- unresolved destructive or irreversible migration behavior.

## 14. Monitoring and launch ownership

During migration and the first staffed operating window, monitor:

- Vercel build/deployment state and grouped 5xx by route;
- auth failures, callback loops, and session expiry;
- Supabase Postgres/API errors, RLS denials, function errors, locks, and connection pressure;
- field, game-move, Work Order, and announcement mutation failures;
- public venue/field response errors and latency;
- Identity Review/Truth RPC failures;
- projection backlog count, oldest age, retries, failed items, and expired leases;
- search failures/no-result rate without raw query text;
- notification/weather cron invocation and delivery failures;
- client-side exception and hydration-error rate.

Assign a named release owner, database operator, application operator, GM smoke tester, Staff smoke tester, and rollback decision owner. Keep a timestamped release log containing only safe identifiers, counts, checks, and decisions.

Vercel currently reports no runtime error clusters for Venue or Team in the prior seven days, but grouped request logs were empty. Configure or verify an actionable log/alert path before relying on this signal.

## 15. Approval checklist

- [ ] Production Supabase ref confirmed by owner
- [ ] Production and staging read-only access available
- [ ] Migration histories exported
- [ ] Schema/RLS/grant/function fingerprints compared
- [ ] Exact reconciliation SQL generated and reviewed
- [ ] Production row-count/duplicate/orphan preflight complete
- [ ] Backup/PITR and restore path verified
- [ ] Environment names/scopes compared without values
- [ ] SportsEngine migration excluded
- [ ] Identity queue operating mode and alert owner documented
- [ ] Protected preview built from frozen SHA
- [ ] Hosted GM/Staff/public/cross-venue acceptance passed
- [ ] Responsive/browser/runtime acceptance passed
- [ ] Rollback candidate and decision authority confirmed
- [ ] Production mutation approval granted separately

## Final recommendation

**READY WITH REQUIRED PRE-MIGRATION WORK**

Do not deploy or migrate production yet. The next authorized release-engineering action should be a read-only production/staging schema-and-history capture using the correct Supabase account. That evidence should produce reviewed reconciliation SQL and a rehearsal report. Only then should GameDay schedule a controlled production review window.
