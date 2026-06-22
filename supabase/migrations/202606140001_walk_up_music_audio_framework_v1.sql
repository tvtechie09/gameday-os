create table if not exists public.audio_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  audio_mode text not null default 'none',
  speaker_type text,
  provider text,
  status text not null default 'not_configured',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audio_profiles_audio_mode_check'
  ) then
    alter table public.audio_profiles
      add constraint audio_profiles_audio_mode_check
      check (audio_mode in ('none', 'parent_speaker', 'venue_pa', 'bluetooth_speaker', 'obs_audio', 'future_integration'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'audio_profiles_status_check'
  ) then
    alter table public.audio_profiles
      add constraint audio_profiles_status_check
      check (status in ('not_configured', 'configured', 'testing', 'active', 'offline'));
  end if;
end $$;

create index if not exists audio_profiles_organization_id_idx on public.audio_profiles(organization_id);
create index if not exists audio_profiles_venue_id_idx on public.audio_profiles(venue_id);
create index if not exists audio_profiles_field_id_idx on public.audio_profiles(field_id);
create index if not exists audio_profiles_session_id_idx on public.audio_profiles(session_id);
create index if not exists audio_profiles_status_idx on public.audio_profiles(status);

alter table public.audio_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audio_profiles'
      and policyname = 'Public can read audio profiles'
  ) then
    create policy "Public can read audio profiles"
      on public.audio_profiles for select
      using (true);
  end if;
end $$;
