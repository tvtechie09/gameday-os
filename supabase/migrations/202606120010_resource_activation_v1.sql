create table if not exists public.resource_activations (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references public.resources(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  activation_type text not null check (activation_type in ('parent_camera', 'livestream_link', 'bluetooth_speaker', 'scoreboard_operator', 'announcer', 'other')),
  display_name text not null,
  contact_name text,
  contact_email text,
  resource_url text,
  status text not null default 'requested' check (status in ('requested', 'active', 'ended', 'rejected')),
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resource_activations_venue_id_idx on public.resource_activations(venue_id);
create index if not exists resource_activations_field_id_idx on public.resource_activations(field_id);
create index if not exists resource_activations_session_id_idx on public.resource_activations(session_id);
create index if not exists resource_activations_status_idx on public.resource_activations(status);

alter table public.resource_activations enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'resource_activations'
      and policyname = 'Public can read resource activations'
  ) then
    create policy "Public can read resource activations"
      on public.resource_activations for select
      using (true);
  end if;
end $$;
