-- Schema drift fix: sessions.is_demo existed in code paths but not live.
-- Applied 2026-07-12.
alter table public.sessions add column if not exists is_demo boolean not null default false;
