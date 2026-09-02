# GameDay Venue staging access reconciliation 1.0B

Date: 2026-09-02

Authorized Supabase project: `oiyitfatarrhnussyxfu`

Application baseline: `89421dbbf891f39b77eb0f2d117d319c817b8fd1`

Protected preview inspected: `https://gameday-hx69qgluf-gamedayos.vercel.app` (existing pre-1.0B preview)

Production access or promotion: **not performed**

## Result

The minimum Venue Staff catalog and `identity_invites` grant hardening were applied successfully to staging. Real Supabase Auth-linked Venue GM and Venue Staff identities both authenticated normally and resolved to approved Crossroads venue assignments.

The complete acceptance gate did **not** pass. The existing protected preview allowed a real Venue Staff user to open `/admin/venues`, `/admin/roles`, and `/admin/executive` directly. The Reports response visibly included Riverside Athletic Park even though the user is scoped only to Crossroads. The product's normal hosted invitation flow is also not operational: the current application exposes read-only identity surfaces, and runtime logs show those surfaces querying missing legacy tables and columns.

The brief requires hosted GM/Staff authorization and cross-venue isolation to pass before creating a disposable Work Order. No Work Order or audit fixture was created. The branch was not pushed and no updated preview was created.

Recommendation: **NOT READY**.

## New migrations

| Repository migration | Hosted staging version | Purpose |
|---|---|---|
| `20260902214644_reconcile_staging_access_roles_1_0b.sql` | `20260902214748_reconcile_staging_access_roles_1_0b` | Add the canonical `venue_staff` role and only its existing four application permissions |
| `20260902214646_harden_identity_invites_access_1_0b.sql` | `20260902214759_harden_identity_invites_access_1_0b` | Remove direct browser-role table privileges and retain trusted server CRUD |

Only these two migrations were applied. Historical migrations were not replayed or repaired. No environment-specific user UUID is present in either migration.

## Role catalog before and after

Before 1.0B, staging contained `platform_admin` and `venue_director` but no `venue_staff` role. The application already supported the `venue_staff` identifier and expected a four-permission frontline contract, so no alternate semantic role was created.

After 1.0B, staging contains `venue_staff` with exactly:

- `venue.field.manage`
- `venue.alert.send`
- `device.control`
- `game.status.update`

No identity, billing, organization, platform, audit, staff-management, or schedule-management permission was added. The migration is additive and does not reference `user_role_assignments` or `auth.users`. The existing hosted `venue_director` mapping was not changed; its staging rows remain `integrations.edit`, `integrations.view`, and `venue.field.manage`.

## identity_invites privileges before and after

The 1.0A evidence recorded legacy direct table grants for `anon` and `authenticated`, while RLS with zero policies still denied effective browser row access. The exact pre-migration per-operation grant list was not preserved, so this report does not invent it.

After 1.0B, `has_table_privilege` verifies:

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|---:|
| `anon` | no | no | no | no |
| `authenticated` | no | no | no | no |
| `service_role` | yes | yes | yes | yes |

The current service implementation accesses `identity_invites` through `getSupabaseAdminClient()`. No permissive RLS policy was added.

## RLS and advisor state

`identity_invites` has RLS enabled and zero policies. Combined with revoked browser-role grants, it is deny-by-default for browser clients while remaining available to the trusted service role.

The post-migration Supabase security advisor reported no new error-level finding. Existing unrelated INFO/WARN debt remains, including no-policy notices on server-only tables, `btree_gist` in `public`, and leaked-password protection being disabled.

## Hosted identity fixtures

Two clearly synthetic staging-only Auth users were created after explicit approval:

- one hosted Venue GM linked to an active profile and approved `venue_director` assignment
- one hosted Venue Staff user linked to an active profile and approved `venue_staff` assignment

Both assignments use `scope_type = 'venue'` and Crossroads scope `11111111-1111-4111-8111-111111111101`. Passwords and Auth UUIDs are intentionally omitted. No production identity or existing synthetic `.test` record was modified.

The product did not provide an operational invitation/provisioning action. The users and approved assignments therefore had to be established through the staging administrative control plane for acceptance diagnosis. That is not counted as a passing normal product invitation flow.

## Hosted GM authorization

Normal hosted authentication passed without dev-login or impersonation.

Allowed and rendered:

- Home
- Today
- Fields
- Schedule
- Work Orders
- Venue Status
- Announcements

Direct Billing, Identity, and Organizations URLs redirected to the venue home. `/admin/roles` unexpectedly rendered the read-only Roles and Permissions catalog; this is recorded as an administrative-surface concern, although no role mutation was attempted.

The existing preview was not built from the 1.0B branch, so these browser results are acceptance evidence for the currently hosted application behavior, not proof of a new 1.0B deployment.

## Hosted Staff authorization and cross-venue results

Normal hosted authentication passed, and the UI identified the user as Venue Staff.

Allowed and rendered:

- Today
- Fields
- Work Orders
- Venue Status
- Announcements

Direct Schedule, Billing, Identity, Organizations, Pilot Launch, and the admin home were redirected to Today.

The required denial gate failed:

- `/admin/venues` rendered the Crossroads Venue Settings roster.
- `/admin/roles` rendered the Roles and Permissions catalog.
- `/admin/executive` rendered Reports and included Riverside Athletic Park, a distinct staging venue outside the Staff user's Crossroads assignment.

Riverside is `22222222-2222-4222-8222-222222222241`; the Staff assignment is only Crossroads `11111111-1111-4111-8111-111111111101`. This is a confirmed cross-venue disclosure through a direct hosted route. Because the read boundary failed, direct cross-venue mutations were not attempted.

Repository inspection identifies the authorization gap: `src/proxy.ts` calls `guardForAdminPath()` only inside the `devPayload` branch. A normally authenticated Supabase user satisfies `authedUser` but does not pass through the admin-route capability guard. Individual pages and service loaders therefore become the only remaining boundary. `/admin/executive` has no page-level access check and loads venue-wide data, which matches the hosted Riverside disclosure. The current navigation/guard unit tests exercise constructed role contexts directly and do not cover this real-auth middleware branch.

## Work Order lifecycle, audit, and Field Operations

No disposable Work Order was created. The acceptance brief authorizes fixture creation only after GM and Staff authorization passes. Staff administrative denial and cross-venue isolation failed first, so creation, assignment/claim, acknowledgement, start, resolution, reopen, actor-attributed history, and detail-responsive checks were not exercised.

No Work Order or audit row was inserted or deleted. The existing Field Operations and Work Orders pages rendered under both hosted actors, and the automated suite continued to pass its field-context, lifecycle, ownership, management-only, and audit-presentation contracts. Those tests do not replace hosted lifecycle acceptance.

## Identity provisioning result

**Failed.** Grant hardening matches the current server/service-role architecture, and normal hosted login works, but the product has no usable invitation action to exercise. The hosted Identity surface is read-only and current preview logs show queries for missing legacy `families`, `organization_memberships`, `team_session_links`, `people`, `team_members`, `family_members`, and `role_assignments` relations plus `teams.organization_id`.

Administrative creation of synthetic Auth/profile/assignment fixtures proved authentication linkage, not the normal product provisioning workflow required by the definition of done.

## Runtime logs

During the two hosted sessions, Vercel preview runtime status counts showed 1,228 responses with status 200 and 30 redirects with status 307 in the inspected two-hour window; no 5xx group appeared. Supabase Auth/API logs showed successful user and role-assignment lookups for the real Staff actor.

Runtime error aggregation did expose the missing Identity/Role schema errors listed above. The known weather-coordinate warning also remained. No credential value was logged or recorded in this document.

## Responsive checks

The requested 320, 390, 430, 768, and 1440 CSS-pixel matrix was started against the hosted Staff surfaces, but the preview repeatedly returned `ERR_NETWORK_CHANGED` while navigating to Fields. The viewport override was reset immediately. Because the security gate had already failed and the responsive run did not complete, no responsive pass is claimed.

## Automated and build validation

- Automated tests: **555 passed, 0 failed**
- Authorization/security regression tests added: **3 passed**
- TypeScript: passed
- Lint: 0 errors; one unchanged `set-password-form.tsx` warning
- Production build: passed
- Static client-readiness: passed
- Hosted GM login: passed
- Hosted Staff login: passed
- Hosted Staff administrative denial: failed
- Hosted cross-venue isolation: failed
- Hosted Work Order lifecycle/audit: not started by prerequisite rule
- Hosted identity provisioning: failed
- Complete responsive matrix: incomplete due preview network interruption

## Credential and environment safety

The Vercel-linked local metadata initially produced a local environment file pointing at a prohibited non-staging project. Its project URL was validated before any application use, so no Auth or database request was sent there. The file was deleted immediately.

A temporary authorized preview environment file pointed to `oiyitfatarrhnussyxfu`; it and all credential-bearing temporary artifacts were deleted after inspection. No credential value was printed, documented, or committed. Git ignored status contains only normal `.vercel/` linkage metadata, not an environment file.

## Remaining blockers

1. Enforce server-side Staff denial for Venue Settings, Roles/Permissions, Reports, and every other management-only direct route.
2. Apply the admin route guard to normal Supabase-authenticated users, not only dev-login payloads, and add real-auth middleware regression coverage.
3. Scope Reports and all underlying loaders to the authenticated venue; the current Riverside disclosure is release-blocking.
4. Provide and accept a normal server-mediated staging invitation/provisioning workflow, or explicitly redefine the supported administrative provisioning architecture.
5. Reconcile the Identity/Role runtime schema contract responsible for missing-table and missing-column errors.
6. Re-run direct-object and mutation cross-venue denial for both GM and Staff on a preview built from the reconciled branch.
7. Only after authorization passes, run the disposable Work Order lifecycle with real actors and verify audit attribution.
8. Complete the 320/390/430/768/1440 responsive matrix, including Work Order detail.

## Release recommendation

**NOT READY**

Retain the narrow role and grant migrations, but do not push this branch or create/promote a pilot preview until the server-side route/data-scope defects and normal identity provisioning path are resolved and the blocked lifecycle acceptance is completed. Production remains untouched.
