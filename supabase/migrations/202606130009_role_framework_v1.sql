create table if not exists public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  role_type text not null check (role_type in ('super_admin', 'organization_admin', 'field_operator', 'volunteer', 'read_only')),
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists role_assignments_organization_id_idx on public.role_assignments(organization_id);
create index if not exists role_assignments_role_type_idx on public.role_assignments(role_type);
create index if not exists role_assignments_email_idx on public.role_assignments(email);

alter table public.role_assignments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'role_assignments'
      and policyname = 'Public can read role assignments'
  ) then
    create policy "Public can read role assignments"
      on public.role_assignments for select
      using (true);
  end if;
end $$;
