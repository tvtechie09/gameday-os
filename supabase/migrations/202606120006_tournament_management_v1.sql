create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sessions
  add column if not exists tournament_id uuid references public.tournaments(id) on delete set null;

create index if not exists sessions_tournament_id_idx on public.sessions(tournament_id);

alter table public.tournaments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tournaments'
      and policyname = 'Public can read tournaments'
  ) then
    create policy "Public can read tournaments"
      on public.tournaments for select
      using (true);
  end if;
end $$;
