-- Preserve the canonical administrative roles even in environments whose
-- historical identity seed predates organization and super administration.
insert into public.roles (key, name, description)
values
  ('super_admin', 'Super Admin', 'Platform-wide support and administrative access.'),
  ('organization_admin', 'Organization Admin', 'Manages one organization and its approved identity review work.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

with allowed_role(role_key) as (
  values ('super_admin'), ('platform_admin'), ('organization_admin')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from allowed_role a
join public.roles r on r.key = a.role_key
join public.permissions p on p.key = 'identity.review'
on conflict (role_id, permission_id) do nothing;
