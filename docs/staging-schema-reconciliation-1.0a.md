# GameDay Venue staging schema reconciliation 1.0A

Date: 2026-09-02

Authorized Supabase project: `oiyitfatarrhnussyxfu`

Protected preview inspected: commit `f1fcd6d80d38c003728178c30b93f5021d778ed2`

Production access or promotion: **not performed**

## Result

The four approved forward-only migrations were applied individually to staging. The current identity-invite, shared-session, Work Order, and logical asset-health schema contracts now exist without replaying or repairing the 91 unrecorded historical repository migrations.

The schema repair itself passed. The complete release acceptance gate did not pass because staging has no `venue_staff` role or permission mapping, so a real hosted Venue Staff identity cannot be provisioned without entering the explicitly deferred role/permission reconciliation scope. The disposable Work Order lifecycle was therefore not started. Recommendation: **NOT READY**.

## New migrations

| Migration | Historical reference | Statement classification |
|---|---|---|
| `20260902211810_reconcile_identity_provisioning_1_0a.sql` | `202606230001_gameday_identity_v1.sql`, `202606240001_identity_phase2_access_workflows.sql` | Additive schema, FK, index |
| `20260902211812_reconcile_shared_session_compatibility_1_0a.sql` | `202606300003_connected_game_platform_v1.sql` | Additive schema, defaults for existing rows, FKs, constraint, indexes |
| `20260902211814_reconcile_work_order_operations_1_0a.sql` | `20260831021258_operational_issue_command_center.sql` | Additive schema, guarded venue backfill, nullability changes, constraints, indexes, RLS enablement, revoke/grant |
| `20260902211817_reconcile_logical_asset_health_1_0a.sql` | `20260831023105_logical_asset_health.sql` | Additive schema, default for existing row, indexes, RLS enablement, revoke/grant |

None of the four migrations drops a table or column, truncates a table, broadly deletes data, disables RLS, or grants browser-role access. The Work Order migration contains a guarded backfill from the canonical field venue and fails if any row cannot be reconciled. Staging had zero Work Orders, so no Work Order row was updated.

## Why historical replay was rejected

Staging is not the result of replaying the repository migration directory. Before reconciliation it recorded 26 hosted migrations while 91 repository migrations were unrecorded, and many unrecorded effects were already present. Replaying history would risk duplicate data changes, incompatible constraints, and grant regression after the later `harden_pilot_public_base_tables` migration. The four migrations therefore contain only the verified current-contract deltas.

No historical migration record was marked applied, repaired, renamed, or removed. Staging migration history now contains 30 entries: the original 26 plus these four hosted versions:

- `20260902212022_reconcile_identity_provisioning_1_0a`
- `20260902212029_reconcile_shared_session_compatibility_1_0a`
- `20260902212036_reconcile_work_order_operations_1_0a`
- `20260902212042_reconcile_logical_asset_health_1_0a`

## Pre- and post-migration state

| Table | Before | After | Preservation result |
|---|---:|---:|---|
| `sessions` | 5 | 5 | Preserved; the new required JSON/status fields received their documented neutral defaults |
| `field_work_orders` | 0 | 0 | Preserved; no backfill row existed and no fixture was created |
| `venue_assets` | 1 | 1 | Preserved; existing logical status/connection data was not recalculated or fabricated |
| `identity_invites` | 0 | 0 | Preserved; no invitation fixture was created |

No broad data backfill was performed. The five existing sessions received `operations_status = 'normal'`, empty object defaults for streaming, walk-up, and sponsor profiles, and empty array defaults for media and officials. The existing asset received only the neutral `diagnostic_summary = {}` column default; `health_message` remains null. No health state, last-seen timestamp, device identifier, or diagnostic claim was invented.

## Applied schema contract

### Identity

Added nullable `identity_invites.organization_id`, its cascade FK to `organizations`, and `identity_invites_organization_id_idx`. Existing `tenant_id`, status constraints, and the broader accepted scope-type constraint were left unchanged. No obsolete organization-membership model was recreated.

### Shared sessions

Added the nine fields selected by the current shared session service:

- `home_organization_id`
- `away_organization_id`
- `operations_status`
- `scoreboard_profile_id`
- `streaming_profile`
- `walkup_music_profile`
- `sponsor_package`
- `media_links`
- `officials`

The operations-status constraint and four supporting indexes were added. The retired Command Center UI and its session-event expansion were not restored.

### Work Orders

Added `venue_id`, `issue_type`, `system_key`, `detected_at`, `assigned_at`, `started_at`, and `metadata`; made `venue_id` required and `field_id` optional; added the current lifecycle/issue constraints and four operational indexes. Browser roles remain revoked and `service_role` retains CRUD.

### Logical asset health

Added `health_message`, `diagnostic_summary`, `venue_assets_connection_health_idx`, and `venue_assets_edge_device_unique`. Existing connection-health fields and constraint were verified rather than replaced. Asset-health history remains deferred.

## Security verification

RLS remains enabled on `sessions`, `alerts`, `venues`, `fields`, `field_work_orders`, `venue_assets`, and `identity_invites`.

- `anon` and `authenticated` have no SELECT/INSERT/UPDATE/DELETE privileges on `sessions`, `alerts`, `venues`, `fields`, `field_work_orders`, or `venue_assets`.
- `service_role` retains the required CRUD privileges.
- `field_work_orders`, `venue_assets`, and `identity_invites` have no RLS policies, which is an intentional effective deny for browser clients under the current server/service-role architecture.
- Pre-existing drift remains on `identity_invites`: `anon` and `authenticated` still hold legacy table grants, but RLS with zero policies denies row access. The current identity service uses only the admin client. Revoking those legacy grants should be included in the separately reviewed identity/role reconciliation rather than hidden after these four already-recorded migrations.

The post-DDL Supabase security advisor reported no new error-level finding. Relevant informational findings are the expected no-policy posture on the three server-only tables. Existing unrelated advisor debt remains, including `btree_gist` in `public` and leaked-password protection not enabled. See the [Supabase database linter guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Hosted Auth and role acceptance

Real hosted Auth acceptance is **blocked**, not passed:

- Staging contains one Auth-linked Venue Director assignment.
- Staging contains only `platform_admin` and `venue_director` role rows.
- There is no `venue_staff` role row or Venue Staff permission mapping.
- No credential was available for the existing Auth-linked GM, and no existing user was altered.
- Creating a new role/permission catalog would enter the explicitly deferred permission-reconciliation scope and was not done.

For non-final runtime smoke only, the established staging dev identities were used without mutating their records. Venue GM could load Home, Fields, Work Orders, and Asset Registry; Billing, Identity, and Organizations redirected to the venue home. Venue Staff could load Today, Fields, Work Orders, and Announcements; Schedule, venue setup, Identity, Billing, and Organizations redirected to Today. These checks demonstrate current route/capability behavior but are not claimed as real hosted-auth acceptance.

Cross-venue denial, worker-only mutation ownership, assignment, escalation, reassignment, and reopen remain unaccepted because the real Staff prerequisite failed.

## Work Order lifecycle and audit

No disposable Work Order was created. The brief requires hosted GM and hosted Staff acceptance to pass before fixture creation. Since real Staff provisioning is blocked, creation, assignment/claim, acknowledgement, start, resolution, history, actor attribution, and disposition were not exercised. `field_work_orders` remains at zero rows, and no audit row was added for a synthetic lifecycle.

## Runtime and public projection results

The protected preview was already deployed from `f1fcd6d80d38c003728178c30b93f5021d778ed2`, whose application code contains the repaired schema consumers.

- Field Operations loads without `field_work_orders.venue_id` errors.
- Work Orders loads without schema-cache or missing-column errors.
- Asset Registry loads with the existing asset and no `venue_assets.health_message` error.
- The shared-session columns were verified directly in staging; no current UI import of the compatibility service exists, so there is no honest browser route for that service-specific runtime check.
- Public venue and public field pages render canonical Crossroads data.
- Public pages expose no Work Order table names/details, asset diagnostics, health-message column names, or identity table data.
- Existing current/next and moved-game semantics remain covered by the passing projection regression suite.
- Browser console checks returned no errors.
- Vercel preview logs returned zero `field_work_orders.venue_id` errors, zero `venue_assets.health_message` errors, and zero 5xx responses during acceptance.
- The known deferred weather-coordinate message appeared on 200 responses and remains out of scope.

Responsive checks covered public venue, public field, Home/Today, Fields, Work Orders, and Asset Registry at 320, 390, 430, 768, and 1440 CSS pixels where applicable. No tested page had document-level horizontal overflow. Work Order detail could not be tested because fixture creation was correctly blocked.

## Automated and build validation

- Automated tests: **552 passed, 0 failed**
- TypeScript: passed
- Lint: 0 errors; one unchanged `set-password-form.tsx` warning
- Production build: passed
- Static client-readiness: passed
- Live HTTP/static public and protected route smoke: passed for the paths listed above

## Remaining drift and explicit deferrals

- Missing `venue_staff` role and permission mapping: blocking real hosted Staff acceptance
- Identity base-table legacy grants: effective access is denied by RLS, but grants should be reconciled explicitly
- Real hosted Venue GM credentialed acceptance
- Real hosted Venue Staff acceptance and cross-venue denial
- Disposable Work Order lifecycle and actor-attributed audit acceptance
- Work Order detail responsive acceptance
- Asset-health history migration
- Weather operations and venue coordinates
- Pilot-launch operations
- Durable public rate limits
- Follower preferences
- Super-admin permission reconciliation
- Broad Supabase advisor debt and duplicate historical session indexes
- Historical migration-record cosmetic repair
- Protected dangling `.test` assignment and unrelated provider outbox rows

## Release recommendation

**NOT READY**

The pilot-critical schema repair is successful and should be retained. Do not push the branch or create a new preview until a separately authorized, minimal role-catalog reconciliation establishes `venue_staff`, legacy identity grants are reviewed, real hosted GM/Staff acceptance passes, and the canonical disposable Work Order lifecycle/audit gate is completed. Do not promote production.
