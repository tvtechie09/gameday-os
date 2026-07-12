-- Field maintenance work orders (applied live 2026-07-12).
create table if not exists public.field_work_orders (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  title text not null,
  detail text,
  priority text not null default 'normal',
  status text not null default 'open',
  reported_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists field_work_orders_status_idx on public.field_work_orders (status, created_at desc);
alter table public.field_work_orders enable row level security;
