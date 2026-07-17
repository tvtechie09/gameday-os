-- League onboarding: recorded intent, not a forged identity.
--
-- WHY THIS TABLE EXISTS: teams live in the team app (gdt_*), and an org there is
-- keyed to a real owner -- gdt_org_registry.owner_auth_user_id and owner_email are
-- both NOT NULL. A salesperson filling out a form at a kitchen table does not have
-- the customer's auth user id, and inventing one would mean creating fake auth
-- accounts: exactly the abuse surface our sales-led motion exists to avoid.
--
-- So onboarding provisions the VENUE side fully and records the league side here.
-- The gdt organization is created when the owner accepts the invite and their auth
-- user actually exists. This row is the durable record of what sales promised, so
-- nothing is lost between "yes" and "accepted".
--
-- Idempotent.

create table if not exists league_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  venue_id uuid references venues (id) on delete set null,
  league_name text not null,
  team_count integer not null check (team_count > 0 and team_count <= 500),
  owner_email text not null,
  -- pending  : recorded, invite not sent yet
  -- invited  : invite sent to owner_email
  -- accepted : owner signed up; the gdt org exists and gdt_state_id is set
  -- cancelled: sales withdrew it
  request_status text not null default 'pending'
    check (request_status in ('pending', 'invited', 'accepted', 'cancelled')),
  -- Set once the team app org exists. Null until the owner accepts.
  gdt_state_id text,
  requested_by uuid references users (id) on delete set null,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists league_onboarding_requests_org_idx on league_onboarding_requests (organization_id);
create index if not exists league_onboarding_requests_status_idx on league_onboarding_requests (request_status);

-- Same posture as the rest of the schema: RLS on, no anon grants. This holds a
-- customer's owner email -- staff-only, served through the service role.
alter table league_onboarding_requests enable row level security;

revoke all on league_onboarding_requests from anon;
revoke all on league_onboarding_requests from authenticated;
