alter table public.sessions
  add column if not exists sport_type text default 'baseball';

alter table public.sessions
  alter column sport_type set default 'baseball';

update public.sessions
set sport_type = 'baseball'
where sport_type is null
  or sport_type not in ('baseball', 'softball', 'soccer', 'football', 'lacrosse', 'basketball', 'volleyball', 'other');

alter table public.sessions
  drop constraint if exists sessions_sport_type_check;

alter table public.sessions
  add constraint sessions_sport_type_check
  check (sport_type in ('baseball', 'softball', 'soccer', 'football', 'lacrosse', 'basketball', 'volleyball', 'other'));

alter table public.sessions
  alter column sport_type set not null;
