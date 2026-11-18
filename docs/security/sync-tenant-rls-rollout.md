# Sync tenant ownership and RLS rollout

## Status and prerequisites

This change has not been applied to a local, staging, shared, or production
database. The authoring environment did not provide Supabase CLI, `psql`,
Docker, or Podman, so SQL execution remains a release prerequisite.
The schema and row state of every deployment target are therefore unresolved;
passing repository tests is not evidence that a target is migration-ready.

Before any deployment:

1. Confirm the target is a disposable local database first, then a dedicated
   staging database with no real customer data.
2. Confirm all migrations through
   `202607080004_integration_framework_v1.sql` and
   `20260717100000_org_scope_role_assignments.sql` are present.
3. Confirm `users.auth_user_id`, active `user_role_assignments`,
   `role_permissions`, and the `integrations.view` permission are populated.
4. Snapshot schema and row counts for `sync_jobs`, `sync_queue`, fields,
   venues, and external sources. Do not export sensitive `source_data`.
5. Verify the application continues to use the service role for sync writes.

## Why ownership is modeled this way

A CSV job may legitimately contain fields from multiple venues when the actor
has permission for all of them. A single `sync_jobs.venue_id` would either
discard ownership or force a behavior regression. The migration therefore:

- adds canonical `sync_queue.venue_id`;
- adds `sync_job_venues` for one-to-many durable ownership;
- derives queue ownership only from the referenced canonical field;
- derives source-job ownership only from the canonical external source;
- requires access to every job venue before exposing aggregate job data.

Legacy records that cannot be attributed are not guessed. They remain NULL or
unowned and are denied by both RLS and the application service.

Ownership foreign keys use `ON DELETE RESTRICT` for venues so deleting a venue
cannot silently erase the tenant attribution of historical sync data. A future
venue-retention/deletion workflow must archive or explicitly re-home that data;
operators should expect a venue deletion to fail while ownership rows remain.

## Disposable local verification

Apply all migrations to a fresh local Supabase database, then run:

```sh
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/sync_tenant_rls_role_tests.sql
```

The test transaction must report no errors and rolls back all fixtures. It
checks platform, owning-organization, exact-venue, foreign-venue, expired,
anonymous, authenticated-write, and service-role behavior.

Also verify:

```sql
select issue_type, count(*)
from public.sync_tenant_backfill_issues
group by issue_type
order by issue_type;
```

Expected on a fresh database: zero rows.

## Staging sequence

1. Deploy the migration alone during a controlled staging window. The existing
   service-role application remains compatible while public policies close.
   Stop if the target schema differs from the prerequisite migrations or if any
   sync table/policy/grant is not represented in the reviewed schema snapshot.
2. Query `sync_tenant_backfill_issues`. Classify every result:
   - `queue_missing_canonical_venue`: field id missing, invalid, or deleted;
   - `job_missing_owner`: no canonical queue field and no source venue;
   - `source_queue_venue_mismatch`: source and queued field disagree.
3. Repair only with authoritative source/field evidence. Leave unresolved rows
   hidden. Never assign a venue from names, timestamps, or operator guesses.
4. Run the role-test SQL against staging using synthetic fixtures only.
5. Deploy the application commit that writes queue `venue_id` and reads
   `sync_job_venues`.
6. Exercise synthetic same-venue and authorized multi-venue imports, review,
   rejection, duplicate skip, and final import.
7. Verify a venue-scoped account cannot read another venue or any mixed-owner
   job through Data API or application routes.
8. Monitor trigger/RLS errors and the issue view before production approval.

Production migration and deployment require separate explicit authorization.

## Rollback

First roll application code back to the PR #38 boundary. Then, if necessary,
run the reviewed script:

`supabase/rollback/20261118000100_sync_tenant_ownership_rls.rollback.sql`

The rollback removes new triggers and authenticated read policies but preserves
ownership columns and derived data. It intentionally keeps anonymous and
authenticated access denied and retains service-role-only policies. It does not
recreate the insecure legacy public policies or drop ownership data.

After rollback, verify:

- service-role sync reads and writes still work;
- anon/authenticated direct access remains denied;
- ownership row counts remain intact for forward repair;
- no production or customer data was altered outside the intended sync tables.
