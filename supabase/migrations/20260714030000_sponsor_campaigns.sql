-- Revenue Engine — sponsor wedge: campaign records that turn ad-hoc sponsor
-- placements into sold packages with CONTRACTED inventory, so the platform can
-- prove delivery (Proof-of-Performance) against what was sold.
--
-- Additive only. Fulfillment + proof are computed on-read from the games the
-- campaign covers and the Connected Game Engine's game_events ledger (the
-- game.started / game.final timestamps are the delivery proof) plus the existing
-- sponsor_impressions/clicks — so no delivery table is needed here.
create table if not exists public.sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  name text not null,
  package_name text,
  starts_on date not null,
  ends_on date not null,
  -- Contracted quantities per sponsor asset type, e.g.
  -- {"scoreboard_logo": 144, "pregame_announcement": 72, "final_score_graphic": 72}.
  contracted jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft','active','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sponsor_campaigns_sponsor_id_idx on public.sponsor_campaigns(sponsor_id);
create index if not exists sponsor_campaigns_venue_id_idx on public.sponsor_campaigns(venue_id);
create index if not exists sponsor_campaigns_organization_id_idx on public.sponsor_campaigns(organization_id);

-- Internal revenue data: RLS on, no public policy — reachable only via the
-- service-role admin client the admin pages use (mirrors game_events).
alter table public.sponsor_campaigns enable row level security;
