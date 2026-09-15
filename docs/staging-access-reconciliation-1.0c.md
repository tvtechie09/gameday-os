# GameDay Venue — Staging Access Reconciliation 1.0C

## Release state

This sprint reconciles normal Supabase Auth with the signed dev-login path and closes the hosted route-guard and Reports isolation failures found during 1.0B. Production promotion is explicitly out of scope. The real hosted GM and Staff acceptance matrix passed against the staging preview and staging Supabase project.

## Authorization path audit

### Before 1.0C

1. `src/proxy.ts` verified a normal Supabase user with `auth.getUser()`, but applied `guardForAdminPath()` only when a dev-login cookie existed. Any normal hosted user therefore passed every `/admin/*` route at the proxy layer once authenticated.
2. `src/lib/access/session.ts` separately rebuilt a hosted context. It did not check `users.user_status`, ignored query errors in assignment reads, merged permissions from every assignment regardless of scope, accepted unknown role keys, did not verify venue assignments referenced a real venue, and fell back to catalog capabilities when live capability lookup failed.
3. Roles, Venue Settings, and Reports relied on the proxy instead of enforcing their own page capability before loading data.
4. Reports loaded platform-wide venue, field, session, alert, resource, sponsor, asset, volunteer, integration, and activity collections. The page did not derive a projection from the authenticated actor, which exposed Riverside data to a Crossroads-only Staff user.
5. Schedule list rendering grouped rows through scoped fields, but first loaded every session; a matching foreign session could affect the search-result count. Several schedule actions validated form data but did not independently require a schedule-capable actor.
6. Announcement reads were venue/org filtered, and existing alert mutations checked object scope, but the actions did not independently require the announcement capability.
7. Field status mutations and disruption moves already checked capability plus field scope. Work Order reads and mutations already checked worker/manager capability, venue/field scope, ownership, and lifecycle transition. Those protections were preserved.
8. `identity_invites` remained service-role-only. No browser grant or RLS policy was relaxed.

### Canonical model after 1.0C

Both authentication mechanisms now resolve to `AccessContext` before route authorization:

Authentication → canonical actor → active assignment → known role → live capability mapping → authorized venue IDs → route/page/action/object decision.

The context contains only authorization metadata: profile ID, optional auth-user ID, active state, primary role, scope, authorized venue IDs, and capability keys. It contains no session token or credential.

- Dev-login: a verified signed cookie is converted by `actorFromDevSession()`. Unknown roles, empty scope, and incomplete venue scope fail closed.
- Supabase Auth: `auth.getUser()` verifies the identity; `resolveHostedActor()` then resolves an active `public.users` row, active approved assignments, known roles, non-empty live capability mappings, and existing venue rows. Every query error returns no access.
- Multiple assignments do not union unrelated role powers. The highest-priority valid role is selected; only assignments for that role contribute permissions and venue IDs.
- Platform Admin and Super Admin preserve their intentional platform behavior. Application-only `platform.*` guard aliases are added only for those two platform roles after a non-empty live mapping is proven.
- Venue roles receive their live database capabilities and only their explicitly assigned venue IDs.

## Enforcement matrix

| Surface | Required capability | Object/scope enforcement | 1.0C result |
| --- | --- | --- | --- |
| Proxy `/admin/*` | Shared `guardForAdminPath()` | Canonical actor must resolve | Hosted and dev-login parity |
| Roles | `platform.permissions.manage` | Page guards before loaders | GM and Staff denied |
| Venue Settings | `venue.manage` | Page and mutation recheck target venue | GM allowed in assigned venue; Staff denied |
| Reports | `venue.manage` | Server projection from actor-authorized venues | Staff denied; GM venue-scoped |
| Fields list/status | `venue.field.manage` / command-center access | Field must belong to scoped venue | Existing protection retained |
| Field setup/control | `venue.manage` or device-management capability | Field/venue scope | Staff denied setup |
| Schedule | schedule-management capability | Source and destination fields plus sessions in scope | Staff denied; GM scoped |
| Game/session detail | schedule-management capability | Session field must be in actor venue | Guard occurs before scorekeeper data load |
| Disruption move | field-management capability | Original field, target field, and session verified | Existing canonical move retained |
| Work Orders | worker or manager capability | Venue, field, owner, and transition checks | Existing protection retained |
| Announcements | `venue.alert.send` | Existing and target alert venue/org scope | Capability added to every server action |
| Venue Status | command-center/field-management capability | Scoped venue data | Existing protection retained |

## Reports isolation

`scopeReportData()` is a pure server projection. It accepts the already resolved authorized venue list and removes every row that cannot be proven to belong to that set:

- venues by venue ID;
- fields by venue ID;
- sessions and session events by authorized field/session;
- alerts, resources, activations, volunteer roles, external sources, and assets by venue ID;
- sync jobs and queue rows through an authorized external source;
- sponsors only when both the sponsor organization and a venue/field/session assignment are in scope.

District-wide aggregate data is unavailable to a venue-scoped GM. Query-string or form-supplied venue IDs are not inputs to this projection. Platform Admin retains the unrestricted projection intentionally.

## Mutation audit

- Field state: capability check, actor ID, and field-in-scope check are present.
- Disruption/game move: actor capability, original/target field scope, same-venue rule, session ownership, conflict review, and canonical mutation are present.
- Work Order claim/acknowledge/start/resolve: worker access, object scope, assignment ownership, and sequential transition checks are present.
- Work Order assignment/escalation/reopen: manager-only capability plus object scope is present.
- Announcements: all create, clear, expire, hide, bulk-clear, and edit actions now require `venue.alert.send` before object-scope checks.
- Venue Settings: create, update, public family-status, place creation, and visibility changes now recheck `venue.manage`, scope, and actor identity. Venue creation is platform-wide only.
- Schedule create/import/generate/bulk/official actions now call one server-only schedule authorization helper and validate every supplied field/session against the actor scope.
- Session live-state action now checks the score capability, verifies the supplied field matches the session, validates field scope, and passes the actor into the audited service mutation.
- Roles is currently an informational legacy page with no role-management mutation. Its page and loader are platform-permission guarded. Future role writes must use the same independent capability/action pattern.

## Automated regression coverage

Permanent tests cover:

- dev-login and hosted GM route parity;
- dev-login and hosted Staff route parity;
- GM/Staff allow and deny matrices;
- no assignment, disabled user, inactive assignment, unknown role, empty live capability mapping, and dangling venue denial;
- unknown/incomplete dev-login actor denial;
- explicit multi-venue GM assignments without implicit third-venue access;
- Crossroads-only Reports removal of Riverside rows across every report collection;
- Riverside query substitution remaining unable to widen the server projection.

## Local acceptance

- Full tests: 563 passed, 0 failed (555 baseline plus 8 permanent 1.0C cases)
- TypeScript: passed
- Lint: 0 errors; one unchanged `set-password-form.tsx` navigation warning
- Production build: passed with Webpack after the local Turbopack worker/port sandbox restriction; the Vercel preview Turbopack build also passed
- Static client-readiness: passed

## Hosted staging acceptance

Staging project: `oiyitfatarrhnussyxfu` (identifier only; no credential values are recorded).

Preview deployment: `https://gameday-apz81ovom-gamedayos.vercel.app` (`dpl_zbJyHzGTWCCZrevQ4gycefrTTjBY`), status READY. Its Preview environment was verified against the authorized staging project and the temporary environment file was deleted immediately.

Hosted acceptance used the real staging actors `acceptance.venue.gm.1-0b@gamedayos.test` and `acceptance.venue.staff.1-0b@gamedayos.test`, both actively assigned to Crossroads Sports Complex. Temporary passwords were generated and entered only through an authorized human handoff; no credential value was printed, recorded, committed, or exposed to browser automation.

The first GM sign-in exposed staging data drift: the live `venue_director` role had only three permission rows, so the correctly fail-closed application denied normal GM routes. The additive migration `20260903000219_reconcile_venue_director_permissions_1_0c.sql` restores all 14 canonical Venue GM capabilities without removing the two legacy integration permissions. Staging verification returned 16 total permission rows and all 14 canonical rows.

After reconciliation, the hosted matrix passed:

- GM could access Home, Today, Fields, Schedule, Work Orders, Venue Status, Announcements, Venue Settings, and Reports.
- GM was denied Roles, Identity, Organizations, Billing, and Developer/platform tools.
- A direct Riverside venue edit resolved to `Venue not found` and exposed no Riverside data.
- A forged Riverside Reports query still rendered the server-projected Crossroads-only report with one authorized venue and no Riverside content.
- Staff could access Today, Fields, Work Orders, Venue Status, and Announcements, including the Crossroads Field 4 operational detail.
- Staff was denied Home, Schedule, Venue Settings, Roles, Reports, Identity, Organizations, Billing, Developer/platform tools, field setup, and the unrelated Riverside venue.
- The Work Orders surface exposed worker-safe reporting and queue views. Staging contained zero work orders, so an existing-record worker-versus-manager button comparison could not be performed without creating test data; no staging business record was mutated for this gate.

After acceptance, both temporary actor passwords were replaced with unknown random values using a no-output staging-only query. Supabase confirmed `Success. No rows returned`. No production environment, production data, production deployment, or unrelated staging record was touched.

## Remaining limitations

1. The proxy performs DB-backed actor resolution for protected hosted requests. This favors security correctness over request cost. Any future cache must be short-lived, assignment-aware, and fail closed on invalidation failure.
2. Dev-login is a signed non-production break-glass path. It validates the configured role/scope shape but cannot prove a fixture venue exists without a hosted database; definitive hosted acceptance uses normal Supabase Auth.
3. Legacy role display data and the canonical identity catalog still coexist. 1.0C secures the legacy page but does not redesign or migrate it.
4. Staging contained no Work Order record for a hosted detail/action comparison. Permanent authorization tests cover worker and manager action separation, but a future seeded staging acceptance fixture would make that browser gate repeatable without touching customer-like records.
5. The additive permission SQL was executed in the staging SQL editor. Because it was not applied through the linked CLI migration command, normal deployment tooling may execute the idempotent migration again when migration history catches up.
6. No production promotion is included in 1.0C.
