create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  recommendation_type text not null check (
    recommendation_type in (
      'operations',
      'scheduling',
      'weather',
      'field_status',
      'scoreboard',
      'sponsor',
      'system_health'
    )
  ),
  title text not null,
  message text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'urgent')),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'resolved')),
  source text not null default 'rules_engine',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_recommendations_organization_id_idx on public.ai_recommendations(organization_id);
create index if not exists ai_recommendations_venue_id_idx on public.ai_recommendations(venue_id);
create index if not exists ai_recommendations_status_idx on public.ai_recommendations(status);
create index if not exists ai_recommendations_type_idx on public.ai_recommendations(recommendation_type);
create index if not exists ai_recommendations_created_at_idx on public.ai_recommendations(created_at desc);

alter table public.ai_recommendations enable row level security;
