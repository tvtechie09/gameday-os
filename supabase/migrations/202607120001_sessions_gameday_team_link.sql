-- Team Season <-> Venue Session link (integration blueprint core mapping).
-- Applied to the shared GameDay OS Supabase project on 2026-07-12.
alter table public.sessions add column if not exists gdt_team_season_id text;
alter table public.sessions add column if not exists gdt_home_team_season_id text;
alter table public.sessions add column if not exists gdt_away_team_season_id text;
alter table public.sessions add column if not exists gdt_sync_status text not null default 'unlinked';
alter table public.sessions add column if not exists gdt_last_synced_at timestamptz;

do $$
begin
  alter table public.sessions add constraint sessions_gdt_sync_status_check check (gdt_sync_status in ('unlinked', 'linked', 'synced'));
exception
  when duplicate_object then null;
end $$;

create index if not exists sessions_gdt_team_season_id_idx on public.sessions(gdt_team_season_id);
