-- Coach self-serve field reservations (Phase 1: the engine).
--
-- Replaces "coaches email the head of the league to reserve the field." Two levels:
--
--   field_block_grants  — the venue grants a league a field + recurring window
--                         (Illinois Celtics, Field 3, weeknights 6-9pm, spring).
--   field_slot_claims   — a coach claims a concrete slot inside that block
--                         (Celtics 12U, Field 3, Tue 6:00-7:30).
--
-- This is separate from field_bookings on purpose: that is a flat one-off permit
-- with a text org name; a grant carries a real org link, a recurrence, and a
-- claim mode. Leaving field_bookings untouched.
--
-- THE POINT OF THE WHOLE FEATURE is the exclusion constraint below. First come
-- first served is a promise of ATOMIC claiming: two coaches hitting submit for the
-- same slot in the same instant must not both win. An app-level conflict check
-- races and loses (see the existing createBooking, which warns then inserts
-- anyway). Postgres refusing the second write does not.

create extension if not exists btree_gist;

-- Venue -> league. The grantee league may or may not be a tenant of ours yet
-- (a travelling org renting fields elsewhere might have no account), so we carry
-- both a nullable FK and a display name, like field_bookings + league requests do.
create table if not exists field_block_grants (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references fields (id) on delete cascade,
  -- the grantee league (nullable: external org without an account)
  grantee_organization_id uuid references organizations (id) on delete set null,
  grantee_name text not null,
  claim_mode text not null default 'first_come'
    check (claim_mode in ('first_come', 'approval')),
  -- Recurrence, stored as venue-local minutes-from-midnight to sidestep time-type
  -- and DST parsing. days_of_week: 0=Sunday .. 6=Saturday.
  days_of_week smallint[] not null default '{}',
  window_start_minute smallint not null check (window_start_minute between 0 and 1439),
  window_end_minute smallint not null check (window_end_minute between 1 and 1440),
  slot_minutes smallint not null default 90 check (slot_minutes between 15 and 720),
  season_start_date date not null,
  season_end_date date not null,
  status text not null default 'active'
    check (status in ('active', 'ended', 'cancelled')),
  notes text,
  is_demo boolean not null default false,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (window_end_minute > window_start_minute),
  check (season_end_date >= season_start_date)
);

create index if not exists field_block_grants_field_idx on field_block_grants (field_id);
create index if not exists field_block_grants_org_idx on field_block_grants (grantee_organization_id);

-- Coach -> slot. field_id is denormalised from the grant because the exclusion
-- constraint has to compare a column on THIS row.
create table if not exists field_slot_claims (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references field_block_grants (id) on delete cascade,
  field_id uuid not null references fields (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  claimed_by_name text not null,          -- the team, e.g. "Celtics 12U"
  claimed_by_user_id uuid references users (id) on delete set null, -- filled in Phase 3
  claimed_by_email text,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'requested', 'denied', 'cancelled')),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists field_slot_claims_grant_idx on field_slot_claims (grant_id);
create index if not exists field_slot_claims_field_time_idx on field_slot_claims (field_id, starts_at);

-- THE constraint. No two CONFIRMED claims may overlap on the same field.
--
-- Scoped to 'confirmed' only, deliberately: in approval mode several coaches may
-- REQUEST the same slot (that's the point -- the head chooses one). The moment one
-- is confirmed, this constraint blocks any second confirmation on that slot. In
-- first-come mode claims are born 'confirmed', so the race is settled by the DB.
alter table field_slot_claims
  add constraint field_slot_claims_no_overlap
  exclude using gist (
    field_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed');

-- Same posture as the rest of the schema: RLS on, no anon/authenticated grants.
-- Reads/writes go through the service role; the coach-facing surface (Phase 3)
-- will authenticate and write server-side.
alter table field_block_grants enable row level security;
alter table field_slot_claims enable row level security;
revoke all on field_block_grants from anon;
revoke all on field_block_grants from authenticated;
revoke all on field_slot_claims from anon;
revoke all on field_slot_claims from authenticated;
