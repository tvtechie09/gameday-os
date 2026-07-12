-- Field allocation & permit bookings (applied live 2026-07-12).
-- Outside groups (travel orgs, rec programs, permits) reserve field time;
-- the admin tool flags conflicts against sessions and other bookings.
create table if not exists public.field_bookings (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  organization_name text not null,
  purpose text not null default 'permit',
  contact_name text,
  contact_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_bookings_time_valid check (ends_at > starts_at)
);
create index if not exists field_bookings_field_time_idx on public.field_bookings (field_id, starts_at);
alter table public.field_bookings enable row level security;
