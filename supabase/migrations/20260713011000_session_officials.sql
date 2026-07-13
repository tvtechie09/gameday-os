-- Umpire/official assignment (applied live 2026-07-13). Officials are
-- assigned per session and confirm via a tokenized public link — the
-- scorekeeper-link pattern, no account needed.
create table if not exists public.session_officials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  official_name text not null,
  official_email text,
  role text not null default 'umpire',
  status text not null default 'assigned' check (status in ('assigned','confirmed','declined')),
  confirm_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists session_officials_session_idx on public.session_officials(session_id);
alter table public.session_officials enable row level security;
