create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  resource_name text not null,
  resource_type text not null check (resource_type in ('camera', 'audio', 'scoreboard', 'display', 'network', 'streaming', 'other')),
  manufacturer text,
  model text,
  serial_number text,
  status text not null default 'unknown' check (status in ('active', 'inactive', 'maintenance', 'unknown')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resources_venue_id_idx on public.resources(venue_id);
create index if not exists resources_field_id_idx on public.resources(field_id);
create index if not exists resources_status_idx on public.resources(status);

alter table public.resources enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'resources'
      and policyname = 'Public can read resources'
  ) then
    create policy "Public can read resources"
      on public.resources for select
      using (true);
  end if;
end $$;
