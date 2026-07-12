-- Rung 1: per-session scorekeeper links (token + PIN) with idempotent sync sequence.
-- Applied to the shared GameDay OS Supabase project on 2026-07-12.
alter table public.sessions add column if not exists scorekeeper_token text;
alter table public.sessions add column if not exists scorekeeper_pin text;
alter table public.sessions add column if not exists scorekeeper_seq bigint not null default 0;
create unique index if not exists sessions_scorekeeper_token_idx on public.sessions(scorekeeper_token) where scorekeeper_token is not null;
