create table if not exists public.scoreboard_adapters (
  id uuid primary key default gen_random_uuid(),
  scoreboard_id uuid not null references public.scoreboard_profiles(id) on delete cascade,
  adapter_type text not null default 'manual',
  adapter_status text not null default 'inactive',
  last_sync_at timestamptz,
  notes text
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'scoreboard_adapters_adapter_type_check'
  ) then
    alter table public.scoreboard_adapters
      add constraint scoreboard_adapters_adapter_type_check
      check (adapter_type in ('manual', 'daktronics', 'nevco', 'fairplay', 'musco', 'custom'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'scoreboard_adapters_adapter_status_check'
  ) then
    alter table public.scoreboard_adapters
      add constraint scoreboard_adapters_adapter_status_check
      check (adapter_status in ('inactive', 'configured', 'testing', 'active', 'error'));
  end if;
end $$;

create index if not exists scoreboard_adapters_scoreboard_id_idx on public.scoreboard_adapters(scoreboard_id);
create index if not exists scoreboard_adapters_type_idx on public.scoreboard_adapters(adapter_type);
create index if not exists scoreboard_adapters_status_idx on public.scoreboard_adapters(adapter_status);

alter table public.scoreboard_adapters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'scoreboard_adapters'
      and policyname = 'Public can read scoreboard adapters'
  ) then
    create policy "Public can read scoreboard adapters"
      on public.scoreboard_adapters for select
      using (true);
  end if;
end $$;
