alter table public.sponsors
  add column if not exists logo_url text,
  add column if not exists website_url text,
  add column if not exists description text;

update public.sponsors
set
  logo_url = nullif(btrim(logo_url), ''),
  website_url = nullif(btrim(website_url), ''),
  description = nullif(btrim(description), '');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sponsors'
      and column_name = 'placement'
  ) then
    alter table public.sponsors alter column placement drop not null;
  end if;
end $$;

alter table public.sponsor_assignments
  add column if not exists assignment_type text,
  add column if not exists venue_id uuid references public.venues(id) on delete cascade,
  add column if not exists placement_label text;

update public.sponsor_assignments
set assignment_type = case
  when assignment_type in ('venue', 'field', 'session') then assignment_type
  when session_id is not null then 'session'
  when field_id is not null then 'field'
  when venue_id is not null then 'venue'
  else assignment_type
end;

update public.sponsor_assignments
set placement_label = coalesce(nullif(btrim(placement_label), ''), 'Featured Sponsor');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sponsor_assignments'
      and column_name = 'placement'
  ) then
    update public.sponsor_assignments
    set placement_label = case
      when placement in ('Presented By', 'Field Sponsor', 'Game Sponsor', 'Featured Sponsor') then placement
      else placement_label
    end;

    alter table public.sponsor_assignments alter column placement drop not null;
  end if;
end $$;

update public.sponsor_assignments
set placement_label = 'Featured Sponsor'
where placement_label is not null
  and placement_label not in ('Presented By', 'Field Sponsor', 'Game Sponsor', 'Featured Sponsor');

alter table public.sponsor_assignments
  drop constraint if exists sponsor_assignments_assignment_type_check,
  drop constraint if exists sponsor_assignments_placement_label_check,
  drop constraint if exists sponsor_assignments_target_check;

alter table public.sponsor_assignments
  add constraint sponsor_assignments_assignment_type_check
    check (assignment_type is null or assignment_type in ('venue', 'field', 'session')) not valid,
  add constraint sponsor_assignments_placement_label_check
    check (placement_label is null or placement_label in ('Presented By', 'Field Sponsor', 'Game Sponsor', 'Featured Sponsor')) not valid,
  add constraint sponsor_assignments_target_check check (
    assignment_type is null
    or (assignment_type = 'venue' and venue_id is not null and field_id is null and session_id is null)
    or (assignment_type = 'field' and venue_id is null and field_id is not null and session_id is null)
    or (assignment_type = 'session' and venue_id is null and field_id is null and session_id is not null)
  ) not valid;

create index if not exists sponsor_assignments_venue_id_idx on public.sponsor_assignments(venue_id);
