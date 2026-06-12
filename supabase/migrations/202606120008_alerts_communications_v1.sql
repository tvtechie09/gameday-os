create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  alert_type text not null check (alert_type in ('info', 'weather', 'delay', 'emergency', 'parking', 'concession', 'field_closure')),
  venue_id uuid not null references public.venues(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alerts_venue_id_idx on public.alerts(venue_id);
create index if not exists alerts_tournament_id_idx on public.alerts(tournament_id);
create index if not exists alerts_field_id_idx on public.alerts(field_id);
create index if not exists alerts_active_window_idx on public.alerts(is_active, start_time, end_time);

alter table public.alerts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'alerts'
      and policyname = 'Public can read alerts'
  ) then
    create policy "Public can read alerts"
      on public.alerts for select
      using (true);
  end if;
end $$;
