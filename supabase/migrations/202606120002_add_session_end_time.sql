alter table public.sessions
  add column if not exists end_time timestamptz;
