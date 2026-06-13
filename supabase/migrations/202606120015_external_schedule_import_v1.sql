alter table public.sessions
  add column if not exists external_source text,
  add column if not exists external_source_id text,
  add column if not exists external_source_url text;

create unique index if not exists sessions_external_source_unique_idx
  on public.sessions(external_source, external_source_id)
  where external_source is not null and external_source_id is not null;
