create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'Public can read organizations'
  ) then
    create policy "Public can read organizations"
      on public.organizations for select
      using (true);
  end if;
end $$;

insert into public.organizations (name, slug)
values ('Default Organization', 'default')
on conflict (slug) do nothing;

alter table public.venues
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.fields
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.sessions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.tournaments
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.sponsors
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.resources
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.alerts
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.external_sources
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

with default_org as (
  select id from public.organizations where slug = 'default' limit 1
)
update public.venues
set organization_id = default_org.id
from default_org
where public.venues.organization_id is null;

update public.fields
set organization_id = venues.organization_id
from public.venues
where public.fields.venue_id = venues.id
  and public.fields.organization_id is null;

update public.sessions
set organization_id = fields.organization_id
from public.fields
where public.sessions.field_id = fields.id
  and public.sessions.organization_id is null;

with default_org as (
  select id from public.organizations where slug = 'default' limit 1
)
update public.tournaments
set organization_id = default_org.id
from default_org
where public.tournaments.organization_id is null;

with default_org as (
  select id from public.organizations where slug = 'default' limit 1
)
update public.sponsors
set organization_id = default_org.id
from default_org
where public.sponsors.organization_id is null;

update public.resources
set organization_id = venues.organization_id
from public.venues
where public.resources.venue_id = venues.id
  and public.resources.organization_id is null;

update public.alerts
set organization_id = venues.organization_id
from public.venues
where public.alerts.venue_id = venues.id
  and public.alerts.organization_id is null;

update public.external_sources
set organization_id = venues.organization_id
from public.venues
where public.external_sources.venue_id = venues.id
  and public.external_sources.organization_id is null;

create index if not exists venues_organization_id_idx on public.venues(organization_id);
create index if not exists fields_organization_id_idx on public.fields(organization_id);
create index if not exists sessions_organization_id_idx on public.sessions(organization_id);
create index if not exists tournaments_organization_id_idx on public.tournaments(organization_id);
create index if not exists sponsors_organization_id_idx on public.sponsors(organization_id);
create index if not exists resources_organization_id_idx on public.resources(organization_id);
create index if not exists alerts_organization_id_idx on public.alerts(organization_id);
create index if not exists external_sources_organization_id_idx on public.external_sources(organization_id);
