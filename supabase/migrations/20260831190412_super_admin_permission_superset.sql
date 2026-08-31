-- Restore the super_admin ⊇ platform_admin invariant in role_permissions.
--
-- src/lib/access/catalog.ts documents super_admin as "the HIGHEST authorization:
-- a strict superset of platform_admin" and implements it that way
-- (super_admin: [...platformAdminPermissions]). The live role_permissions rows
-- had drifted from that contract: platform_admin held all 47 seeded permissions
-- while super_admin held only 36.
--
-- Two causes, and neither was a one-off:
--
--   1. NO migration in this repo has ever granted super_admin a single
--      role_permissions row. 202606230001_gameday_identity_v1.sql seeds
--      platform_admin and the venue/team/family roles by name and skips
--      super_admin entirely. The 36 rows that exist in production were created
--      out of band and are therefore invisible to anyone reading the repo.
--   2. Because super_admin is absent from every permission_map, later migrations
--      that add permissions grant them role-by-role and silently miss it.
--      202607080004_integration_framework_v1.sql is the clearest case: it gave
--      all nine integrations.* keys to platform_admin, organization_admin,
--      venue_director, tournament_director and league_director -- but not to
--      super_admin. league.schedule.manage and league.team.manage drifted the
--      same way.
--
-- The app did not visibly break because session.ts unions the seeded catalog
-- permissions with the live role_permissions rows, and the catalog supplies the
-- full set. So this drift only bites a consumer that reads role_permissions
-- directly -- which would under-grant every super admin.
--
-- The fix is written as a derivation rather than a list of the 11 missing keys:
-- it re-asserts the invariant against whatever platform_admin currently holds,
-- so re-running it after a future migration adds a permission repairs the drift
-- again instead of silently reintroducing it.
--
-- Additive and idempotent: grants only, no revokes, no deletes. It cannot lower
-- anyone's authorization.

insert into public.role_permissions (role_id, permission_id)
select super_admin.id, platform_admin_permissions.permission_id
from public.roles as super_admin
cross join (
  select rp.permission_id
  from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.key = 'platform_admin'
) as platform_admin_permissions
where super_admin.key = 'super_admin'
on conflict do nothing;

-- Fail loudly if the invariant still does not hold, rather than reporting a
-- successful migration that quietly left super_admin under-privileged.
do $$
declare
  missing_count integer;
begin
  select count(*)
  into missing_count
  from public.role_permissions rp
  join public.roles r on r.id = rp.role_id and r.key = 'platform_admin'
  where not exists (
    select 1
    from public.role_permissions rp2
    join public.roles r2 on r2.id = rp2.role_id and r2.key = 'super_admin'
    where rp2.permission_id = rp.permission_id
  );

  if missing_count > 0 then
    raise exception
      'super_admin is still missing % permission(s) held by platform_admin', missing_count;
  end if;
end $$;
