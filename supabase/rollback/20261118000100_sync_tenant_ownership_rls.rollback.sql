-- Emergency rollback for 20261118000100_sync_tenant_ownership_rls.sql.
--
-- This intentionally preserves derived ownership columns/data and DOES NOT
-- restore the former public policies. Run only after rolling application code
-- back to the PR #38 boundary. The service role remains functional while
-- anon/authenticated access stays deny-by-default.

begin;

drop view if exists public.sync_tenant_backfill_issues;

drop trigger if exists sync_queue_set_canonical_venue_trigger on public.sync_queue;
drop trigger if exists sync_queue_register_job_venue_trigger on public.sync_queue;
drop trigger if exists sync_job_register_source_venue_trigger on public.sync_jobs;

drop function if exists public.sync_queue_set_canonical_venue();
drop function if exists public.sync_queue_register_job_venue();
drop function if exists public.sync_job_register_source_venue();

drop policy if exists sync_jobs_authenticated_select on public.sync_jobs;
drop policy if exists sync_queue_authenticated_select on public.sync_queue;
drop policy if exists sync_job_venues_authenticated_select on public.sync_job_venues;

drop function if exists public.can_access_sync_job(uuid, text);
drop function if exists public.can_access_sync_venue(uuid, text);

-- Keep service-role-only access explicit. Never recreate the legacy
-- "Public can ..." policies as part of rollback.
drop policy if exists sync_jobs_service_role_all on public.sync_jobs;
create policy sync_jobs_service_role_all
on public.sync_jobs for all to service_role
using (true) with check (true);

drop policy if exists sync_queue_service_role_all on public.sync_queue;
create policy sync_queue_service_role_all
on public.sync_queue for all to service_role
using (true) with check (true);

drop policy if exists sync_job_venues_service_role_all on public.sync_job_venues;
create policy sync_job_venues_service_role_all
on public.sync_job_venues for all to service_role
using (true) with check (true);

revoke all on public.sync_jobs from public, anon, authenticated;
revoke all on public.sync_queue from public, anon, authenticated;
revoke all on public.sync_job_venues from public, anon, authenticated;

commit;
