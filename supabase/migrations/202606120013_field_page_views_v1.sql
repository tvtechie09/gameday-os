create table if not exists public.field_page_views (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  viewed_at timestamptz not null default now(),
  page_type text not null default 'field_page',
  user_agent text
);

create index if not exists field_page_views_venue_id_idx on public.field_page_views(venue_id);
create index if not exists field_page_views_field_id_idx on public.field_page_views(field_id);
create index if not exists field_page_views_session_id_idx on public.field_page_views(session_id);
create index if not exists field_page_views_viewed_at_idx on public.field_page_views(viewed_at);

alter table public.field_page_views enable row level security;

drop policy if exists "Public can insert field page views" on public.field_page_views;
create policy "Public can insert field page views"
  on public.field_page_views for insert
  with check (true);

drop policy if exists "Public can read field page views" on public.field_page_views;
create policy "Public can read field page views"
  on public.field_page_views for select
  using (true);
