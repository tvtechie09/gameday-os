-- Family 2.0A: canonical Tournament structure and parent-safe projections.
--
-- Venue sessions remain canonical games. These tables add the Tournament-owned
-- organization that was previously absent: entries, pools, official standings,
-- rounds, bracket dependencies, structured rules, documents, and multi-venue
-- associations. Family never writes these records and never calculates official
-- standings or advancement.

set search_path = public, extensions;

begin;

alter table public.tournaments
  add column if not exists status text not null default 'upcoming',
  add column if not exists sport_type text not null default 'other',
  add column if not exists published_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists external_source text,
  add column if not exists external_source_id text,
  add column if not exists source_updated_at timestamptz;

alter table public.tournaments drop constraint if exists tournaments_status_check;
alter table public.tournaments add constraint tournaments_status_check
  check (status in ('upcoming', 'active', 'weather_hold', 'delayed', 'suspended', 'completed', 'cancelled'));

create unique index if not exists tournaments_id_organization_unique
  on public.tournaments (id, organization_id);
create index if not exists tournaments_family_window_idx
  on public.tournaments (status, start_date, end_date)
  where published_at is not null;

create table if not exists public.tournament_divisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tournament_id uuid not null,
  name text not null,
  age_group text,
  competition_level text,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'completed', 'cancelled')),
  external_source text,
  external_source_id text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (tournament_id, name),
  foreign key (tournament_id, organization_id)
    references public.tournaments(id, organization_id) on delete cascade
);

create table if not exists public.tournament_pools (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tournament_id uuid not null,
  division_id uuid not null,
  name text not null,
  tie_breakers jsonb not null default '[]'::jsonb,
  external_source text,
  external_source_id text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (division_id, name),
  foreign key (tournament_id, organization_id)
    references public.tournaments(id, organization_id) on delete cascade,
  foreign key (division_id, organization_id)
    references public.tournament_divisions(id, organization_id) on delete cascade,
  check (jsonb_typeof(tie_breakers) = 'array')
);

create table if not exists public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tournament_id uuid not null,
  division_id uuid not null,
  pool_id uuid,
  team_name text not null,
  gdt_team_season_id text,
  entry_status text not null default 'active'
    check (entry_status in ('registered', 'active', 'eliminated', 'withdrawn', 'completed')),
  final_placement integer check (final_placement is null or final_placement > 0),
  external_source text,
  external_source_id text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (tournament_id, organization_id)
    references public.tournaments(id, organization_id) on delete cascade,
  foreign key (division_id, organization_id)
    references public.tournament_divisions(id, organization_id) on delete cascade,
  foreign key (pool_id, organization_id)
    references public.tournament_pools(id, organization_id) on delete restrict
);

create table if not exists public.tournament_standings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tournament_id uuid not null,
  division_id uuid not null,
  pool_id uuid not null,
  entry_id uuid not null,
  rank integer not null check (rank > 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  ties integer not null default 0 check (ties >= 0),
  games_played integer not null default 0 check (games_played >= 0),
  points numeric,
  tie_break_label text,
  tie_break_value text,
  tie_break_explanation text,
  is_official boolean not null default false,
  published_at timestamptz,
  external_source text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pool_id, entry_id),
  foreign key (tournament_id, organization_id)
    references public.tournaments(id, organization_id) on delete cascade,
  foreign key (division_id, organization_id)
    references public.tournament_divisions(id, organization_id) on delete cascade,
  foreign key (pool_id, organization_id)
    references public.tournament_pools(id, organization_id) on delete cascade,
  foreign key (entry_id, organization_id)
    references public.tournament_entries(id, organization_id) on delete cascade
);

create table if not exists public.tournament_rounds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tournament_id uuid not null,
  division_id uuid not null,
  name text not null,
  round_order integer not null check (round_order >= 0),
  round_type text not null default 'bracket'
    check (round_type in ('pool', 'play_in', 'bracket', 'consolation', 'placement')),
  starts_at timestamptz,
  external_source text,
  external_source_id text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (division_id, round_order, name),
  foreign key (tournament_id, organization_id)
    references public.tournaments(id, organization_id) on delete cascade,
  foreign key (division_id, organization_id)
    references public.tournament_divisions(id, organization_id) on delete cascade
);

create table if not exists public.tournament_game_contexts (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tournament_id uuid not null,
  division_id uuid not null,
  pool_id uuid,
  round_id uuid,
  game_number text,
  game_type text not null default 'pool'
    check (game_type in ('pool', 'play_in', 'bracket', 'consolation', 'placement', 'championship')),
  confirmation_state text not null default 'confirmed'
    check (confirmation_state in ('confirmed', 'possible', 'pending_result', 'tbd')),
  advancement_note text,
  external_source text,
  external_source_id text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tournament_id, organization_id)
    references public.tournaments(id, organization_id) on delete cascade,
  foreign key (division_id, organization_id)
    references public.tournament_divisions(id, organization_id) on delete cascade,
  foreign key (pool_id, organization_id)
    references public.tournament_pools(id, organization_id) on delete restrict,
  foreign key (round_id, organization_id)
    references public.tournament_rounds(id, organization_id) on delete restrict
);

create table if not exists public.tournament_game_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.tournament_game_contexts(session_id) on delete cascade,
  slot_position text not null check (slot_position in ('home', 'away')),
  source_type text not null
    check (source_type in ('entry', 'winner', 'loser', 'pool_rank', 'tbd')),
  entry_id uuid,
  source_session_id uuid references public.sessions(id) on delete set null,
  source_pool_id uuid,
  source_rank integer check (source_rank is null or source_rank > 0),
  display_label text not null,
  family_condition_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, slot_position),
  foreign key (entry_id, organization_id)
    references public.tournament_entries(id, organization_id) on delete restrict,
  foreign key (source_pool_id, organization_id)
    references public.tournament_pools(id, organization_id) on delete restrict,
  check (
    (source_type = 'entry' and entry_id is not null)
    or (source_type in ('winner', 'loser') and source_session_id is not null)
    or (source_type = 'pool_rank' and source_pool_id is not null and source_rank is not null)
    or source_type = 'tbd'
  )
);

create table if not exists public.tournament_venues (
  tournament_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tournament_id, venue_id),
  foreign key (tournament_id, organization_id)
    references public.tournaments(id, organization_id) on delete cascade
);

create table if not exists public.tournament_key_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tournament_id uuid not null,
  division_id uuid,
  sport_type text not null default 'other',
  rule_key text not null,
  label text not null,
  value text not null,
  details text,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (tournament_id, division_id, rule_key),
  foreign key (tournament_id, organization_id)
    references public.tournaments(id, organization_id) on delete cascade,
  foreign key (division_id, organization_id)
    references public.tournament_divisions(id, organization_id) on delete cascade
);

create table if not exists public.tournament_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tournament_id uuid not null,
  division_id uuid,
  document_type text not null
    check (document_type in ('rules', 'venue_map', 'schedule', 'check_in', 'other')),
  title text not null,
  url text not null check (length(url) <= 2048 and url ~ '^https://'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tournament_id, organization_id)
    references public.tournaments(id, organization_id) on delete cascade,
  foreign key (division_id, organization_id)
    references public.tournament_divisions(id, organization_id) on delete cascade
);

create index if not exists tournament_entries_team_idx
  on public.tournament_entries (gdt_team_season_id, tournament_id)
  where gdt_team_season_id is not null and entry_status not in ('withdrawn');
create unique index if not exists tournament_entries_team_unique
  on public.tournament_entries (tournament_id, division_id, gdt_team_season_id)
  where gdt_team_season_id is not null;
create index if not exists tournament_entries_division_pool_idx
  on public.tournament_entries (division_id, pool_id);
create index if not exists tournament_standings_pool_rank_idx
  on public.tournament_standings (pool_id, rank);
create index if not exists tournament_rounds_division_order_idx
  on public.tournament_rounds (division_id, round_order);
create index if not exists tournament_contexts_division_idx
  on public.tournament_game_contexts (tournament_id, division_id, confirmation_state);
create index if not exists tournament_slots_entry_idx
  on public.tournament_game_slots (entry_id)
  where entry_id is not null;
create index if not exists tournament_slots_source_game_idx
  on public.tournament_game_slots (source_session_id)
  where source_session_id is not null;
create index if not exists tournament_rules_scope_idx
  on public.tournament_key_rules (tournament_id, division_id, sort_order)
  where published_at is not null;
create index if not exists tournament_documents_scope_idx
  on public.tournament_documents (tournament_id, division_id)
  where published_at is not null;

alter table public.tournament_divisions enable row level security;
alter table public.tournament_pools enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_standings enable row level security;
alter table public.tournament_rounds enable row level security;
alter table public.tournament_game_contexts enable row level security;
alter table public.tournament_game_slots enable row level security;
alter table public.tournament_venues enable row level security;
alter table public.tournament_key_rules enable row level security;
alter table public.tournament_documents enable row level security;

revoke all on public.tournament_divisions, public.tournament_pools,
  public.tournament_entries, public.tournament_standings,
  public.tournament_rounds, public.tournament_game_contexts,
  public.tournament_game_slots, public.tournament_venues,
  public.tournament_key_rules, public.tournament_documents
  from public, anon, authenticated;
grant select, insert, update, delete on public.tournament_divisions,
  public.tournament_pools, public.tournament_entries,
  public.tournament_standings, public.tournament_rounds,
  public.tournament_game_contexts, public.tournament_game_slots,
  public.tournament_venues, public.tournament_key_rules,
  public.tournament_documents to service_role;

create or replace view public.tournament_family_tournaments
with (security_invoker = true)
as
select id, organization_id, name, description, start_date, end_date,
  status, sport_type, website_url, published_at, completed_at,
  external_source, external_source_id, source_updated_at, updated_at
from public.tournaments
where published_at is not null;

create or replace view public.tournament_family_entries
with (security_invoker = true)
as
select e.id, e.organization_id, e.tournament_id, e.division_id, e.pool_id,
  e.team_name, e.gdt_team_season_id, e.entry_status, e.final_placement,
  e.external_source, e.external_source_id, e.source_updated_at,
  d.name as division_name, d.age_group, d.competition_level,
  p.name as pool_name
from public.tournament_entries e
join public.tournament_divisions d on d.id = e.division_id
left join public.tournament_pools p on p.id = e.pool_id
where e.entry_status <> 'withdrawn';

create or replace view public.tournament_family_standings
with (security_invoker = true)
as
select s.id, s.organization_id, s.tournament_id, s.division_id, s.pool_id,
  s.entry_id, s.rank, e.team_name, s.wins, s.losses, s.ties,
  s.games_played, s.points, s.tie_break_label, s.tie_break_value,
  s.tie_break_explanation, s.is_official, s.published_at,
  p.name as pool_name, p.tie_breakers
from public.tournament_standings s
join public.tournament_entries e on e.id = s.entry_id
join public.tournament_pools p on p.id = s.pool_id
where s.published_at is not null;

create or replace view public.tournament_family_games
with (security_invoker = true)
as
select c.session_id, c.organization_id, c.tournament_id, c.division_id,
  c.pool_id, c.round_id, c.game_number, c.game_type,
  c.confirmation_state, c.advancement_note,
  r.name as round_name, r.round_order,
  s.title, s.start_time, s.end_time, s.arrival_time,
  s.lifecycle_status, s.game_status, s.status,
  s.field_id, s.play_surface_id, s.home_team, s.away_team,
  s.home_score, s.away_score, s.gdt_team_season_id,
  s.gdt_home_team_season_id, s.external_source,
  s.external_source_id, s.updated_at,
  f.name as field_name, f.venue_id, v.name as venue_name
from public.tournament_game_contexts c
join public.sessions s on s.id = c.session_id
left join public.tournament_rounds r on r.id = c.round_id
left join public.fields f on f.id = s.field_id
left join public.venues v on v.id = f.venue_id;

create or replace view public.tournament_family_game_slots
with (security_invoker = true)
as
select gs.id, gs.organization_id, gs.session_id, gs.slot_position,
  gs.source_type, gs.entry_id, gs.source_session_id,
  gs.source_pool_id, gs.source_rank, gs.display_label,
  gs.family_condition_text
from public.tournament_game_slots gs;

create or replace view public.tournament_family_rounds
with (security_invoker = true)
as
select id, organization_id, tournament_id, division_id, name,
  round_order, round_type, starts_at
from public.tournament_rounds;

create or replace view public.tournament_family_venues
with (security_invoker = true)
as
select tv.tournament_id, tv.organization_id, tv.venue_id,
  tv.is_primary, tv.notes, v.name as venue_name
from public.tournament_venues tv
join public.venues v on v.id = tv.venue_id;

create or replace view public.tournament_family_rules
with (security_invoker = true)
as
select id, organization_id, tournament_id, division_id, sport_type,
  rule_key, label, value, details, sort_order, published_at
from public.tournament_key_rules
where published_at is not null;

create or replace view public.tournament_family_documents
with (security_invoker = true)
as
select id, organization_id, tournament_id, division_id,
  document_type, title, url, published_at
from public.tournament_documents
where published_at is not null and url ~ '^https://';

revoke all on public.tournament_family_tournaments,
  public.tournament_family_entries, public.tournament_family_standings,
  public.tournament_family_games, public.tournament_family_game_slots,
  public.tournament_family_rounds, public.tournament_family_venues,
  public.tournament_family_rules, public.tournament_family_documents
  from public, anon, authenticated;
grant select on public.tournament_family_tournaments,
  public.tournament_family_entries, public.tournament_family_standings,
  public.tournament_family_games, public.tournament_family_game_slots,
  public.tournament_family_rounds, public.tournament_family_venues,
  public.tournament_family_rules, public.tournament_family_documents
  to service_role;

comment on view public.tournament_family_tournaments is
  'Published Tournament OS summary. Family must authorize a canonical team entry or tournament-linked Team event before display.';
comment on view public.tournament_family_entries is
  'Parent-safe Tournament entry projection. gdt_team_season_id is a server-side authorization join key and must not be sent to public routes.';
comment on view public.tournament_family_standings is
  'Published canonical Tournament OS standings. Family must not recalculate official order.';
comment on view public.tournament_family_games is
  'Published Tournament game context over canonical Venue sessions.';
comment on view public.tournament_family_game_slots is
  'Canonical Tournament bracket dependencies with parent-readable condition text.';

commit;
