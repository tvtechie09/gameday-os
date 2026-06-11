-- Fix existing sessions tables to match the GameDay OS app.
-- Safe to run on an existing Supabase project. It does not drop existing data.

alter table public.sessions
  add column if not exists home_team text,
  add column if not exists away_team text;

-- Preserve old opponent text, if that legacy column exists, by splitting on " vs. ".
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'opponent'
  ) then
    update public.sessions
    set
      home_team = coalesce(
        nullif(home_team, ''),
        nullif(trim(split_part(opponent, ' vs. ', 1)), ''),
        'Home team'
      ),
      away_team = coalesce(
        nullif(away_team, ''),
        nullif(trim(split_part(opponent, ' vs. ', 2)), ''),
        'Away team'
      );
  else
    update public.sessions
    set
      home_team = coalesce(nullif(home_team, ''), 'Home team'),
      away_team = coalesce(nullif(away_team, ''), 'Away team');
  end if;
end $$;

update public.sessions
set status = case
  when status in ('active', 'In progress') then 'active'
  when status in ('final', 'Complete') then 'final'
  else 'scheduled'
end;

alter table public.sessions
  alter column home_team set not null,
  alter column away_team set not null,
  alter column status set default 'scheduled';

alter table public.sessions
  drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('scheduled', 'active', 'final'));

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sessions'
      and policyname = 'Public can create sessions'
  ) then
    create policy "Public can create sessions"
      on public.sessions for insert
      with check (true);
  end if;
end $$;
