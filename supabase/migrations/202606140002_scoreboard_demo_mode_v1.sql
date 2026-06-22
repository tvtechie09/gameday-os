alter table public.sessions
  add column if not exists is_demo boolean not null default false;

create index if not exists sessions_is_demo_idx
  on public.sessions(is_demo);
