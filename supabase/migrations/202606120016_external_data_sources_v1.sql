create table if not exists public.external_sources (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  source_type text not null check (source_type in ('sportsengine', 'hometeamsonline', 'teamsnap', 'gamechanger', 'csv', 'ical', 'other')),
  source_name text not null,
  source_url text,
  source_status text not null default 'draft' check (source_status in ('draft', 'active', 'paused', 'error')),
  last_sync_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists external_sources_venue_id_idx on public.external_sources(venue_id);
create index if not exists external_sources_source_type_idx on public.external_sources(source_type);
create index if not exists external_sources_source_status_idx on public.external_sources(source_status);

alter table public.external_sources enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'external_sources'
      and policyname = 'Public can read external sources'
  ) then
    create policy "Public can read external sources"
      on public.external_sources for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'external_sources'
      and policyname = 'Public can create external sources'
  ) then
    create policy "Public can create external sources"
      on public.external_sources for insert
      with check (true);
  end if;
end $$;
