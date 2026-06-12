create table if not exists public.sponsor_impressions (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  viewed_at timestamptz not null default now(),
  page_type text not null default 'field_page'
);

create table if not exists public.sponsor_clicks (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  clicked_at timestamptz not null default now(),
  page_type text not null default 'field_page'
);

create index if not exists sponsor_impressions_sponsor_id_idx on public.sponsor_impressions(sponsor_id);
create index if not exists sponsor_impressions_viewed_at_idx on public.sponsor_impressions(viewed_at);
create index if not exists sponsor_clicks_sponsor_id_idx on public.sponsor_clicks(sponsor_id);
create index if not exists sponsor_clicks_clicked_at_idx on public.sponsor_clicks(clicked_at);

alter table public.sponsor_impressions enable row level security;
alter table public.sponsor_clicks enable row level security;
