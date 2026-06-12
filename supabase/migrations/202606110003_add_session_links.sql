alter table public.sessions
  add column if not exists primary_link_label text,
  add column if not exists primary_link_url text,
  add column if not exists secondary_link_label text,
  add column if not exists secondary_link_url text,
  add column if not exists notes text;

update public.sessions
set
  primary_link_label = nullif(btrim(primary_link_label), ''),
  primary_link_url = nullif(btrim(primary_link_url), ''),
  secondary_link_label = nullif(btrim(secondary_link_label), ''),
  secondary_link_url = nullif(btrim(secondary_link_url), ''),
  notes = nullif(btrim(notes), '');

update public.sessions
set primary_link_label = null
where primary_link_label is not null
  and primary_link_label not in ('GameChanger', 'SidelineHD', 'YouTube', 'SportsEngine', 'TeamSnap', 'Other');

update public.sessions
set secondary_link_label = null
where secondary_link_label is not null
  and secondary_link_label not in ('GameChanger', 'SidelineHD', 'YouTube', 'SportsEngine', 'TeamSnap', 'Other');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'gamechanger_url'
  ) then
    update public.sessions
    set
      primary_link_label = coalesce(primary_link_label, 'GameChanger'),
      primary_link_url = coalesce(primary_link_url, nullif(btrim(gamechanger_url), ''))
    where primary_link_url is null
      and nullif(btrim(gamechanger_url), '') is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'youtube_url'
  ) then
    update public.sessions
    set
      secondary_link_label = coalesce(secondary_link_label, 'YouTube'),
      secondary_link_url = coalesce(secondary_link_url, nullif(btrim(youtube_url), ''))
    where secondary_link_url is null
      and nullif(btrim(youtube_url), '') is not null;
  end if;
end $$;

alter table public.sessions
  drop constraint if exists sessions_primary_link_label_check,
  drop constraint if exists sessions_secondary_link_label_check;

alter table public.sessions
  add constraint sessions_primary_link_label_check
    check (primary_link_label is null or primary_link_label in ('GameChanger', 'SidelineHD', 'YouTube', 'SportsEngine', 'TeamSnap', 'Other')),
  add constraint sessions_secondary_link_label_check
    check (secondary_link_label is null or secondary_link_label in ('GameChanger', 'SidelineHD', 'YouTube', 'SportsEngine', 'TeamSnap', 'Other'));
