-- audio_profiles: the table the app has always expected and never had.
--
-- WHY THIS IS ODD: src/lib/services/audio-profiles.ts, the /admin/audio CRUD, and
-- the field control panel were all built against this table, and it is fully typed
-- in src/lib/supabase/types.ts -- but it was never created. Reads carried an
-- explicit isMissingAudioProfilesTableError guard that swallowed the failure and
-- returned [], so /admin/audio rendered an empty list forever and the field panel
-- permanently offered "Create Audio Profile". createAudioProfile has no such
-- guard, so actually clicking through that button threw. A feature that looks
-- present and cannot work.
--
-- WHAT IT ANSWERS: "when a game is played on this field, where does the sound come
-- from?" Per field, optionally overridden for a single session. This is POLICY, not
-- inventory -- venue_assets records that a speaker exists and whether it is
-- healthy; this records that Field 3 runs through the venue PA for tournaments but
-- a parent's bluetooth speaker on 8U weeknights. audio_mode is the built-in vs
-- bring-your-own choice we promise on every module.
--
-- Scope note: this documents speaker/PA readiness. GameDay OS does not play,
-- stream, or manage audio files.
--
-- Columns mirror types.ts exactly; the CHECK values mirror audioModes /
-- audioProfileStatuses in the service.
--
-- Idempotent.

create table if not exists audio_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete cascade,
  venue_id uuid not null references venues (id) on delete cascade,
  field_id uuid not null references fields (id) on delete cascade,
  -- null = this is the field's DEFAULT profile. Set = an override for one game.
  session_id uuid references sessions (id) on delete cascade,
  audio_mode text not null default 'none'
    check (audio_mode in ('none', 'parent_speaker', 'venue_pa', 'bluetooth_speaker', 'obs_audio', 'future_integration')),
  speaker_type text,
  provider text,
  status text not null default 'not_configured'
    check (status in ('not_configured', 'configured', 'testing', 'active', 'offline')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- getAudioProfileForField resolves session-specific first, then the field default.
-- It uses .find(), so duplicates would make it pick one arbitrarily and the venue's
-- audio would depend on row order. Make that unrepresentable instead.
create unique index if not exists audio_profiles_field_default_uniq
  on audio_profiles (field_id) where session_id is null;
create unique index if not exists audio_profiles_field_session_uniq
  on audio_profiles (field_id, session_id) where session_id is not null;

create index if not exists audio_profiles_venue_idx on audio_profiles (venue_id);
create index if not exists audio_profiles_org_idx on audio_profiles (organization_id);

-- Same posture as the rest of the schema (see docs/security-audit-2026-07.md).
-- Supabase grants ALL to anon/authenticated on new public tables by default; RLS is
-- the gate, but the grants are removed too. The app reads this through the service
-- role, and nothing public needs it.
alter table audio_profiles enable row level security;

revoke all on audio_profiles from anon;
revoke all on audio_profiles from authenticated;
