create table if not exists public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  event_type text not null check (event_type in ('session_created', 'score_update', 'resource_activated', 'alert_created', 'sponsor_clicked', 'game_started', 'game_final')),
  event_message text not null,
  created_at timestamptz not null default now()
);

create index if not exists session_events_session_id_idx on public.session_events(session_id);
create index if not exists session_events_created_at_idx on public.session_events(created_at);
create index if not exists session_events_event_type_idx on public.session_events(event_type);

alter table public.session_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_events'
      and policyname = 'Public can read session events'
  ) then
    create policy "Public can read session events"
      on public.session_events for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_events'
      and policyname = 'Public can create session events'
  ) then
    create policy "Public can create session events"
      on public.session_events for insert
      with check (true);
  end if;
end $$;
