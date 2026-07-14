-- Billing visibility (NOT payment processing). GameDay staff record what a
-- venue's organization is charged and mark invoices paid; the venue's GM sees
-- their plan, annual/monthly amount, and paid/outstanding status. Billed by
-- invoice / PO — no cards, no processor. Same "track the money, never move it"
-- posture as league registration fees. See docs/pricing-and-packaging.md.
--
-- Additive only.
create table if not exists public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_label text not null default 'Custom',
  amount_cents integer not null default 0,
  billing_interval text not null default 'month' check (billing_interval in ('month','year')),
  status text not null default 'active' check (status in ('active','paused')),
  po_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  description text not null,
  amount_cents integer not null default 0,
  status text not null default 'open' check (status in ('open','paid','void')),
  issued_on date not null default (now() at time zone 'utc')::date,
  due_on date,
  paid_on date,
  po_number text,
  created_at timestamptz not null default now()
);

create index if not exists billing_accounts_organization_id_idx on public.billing_accounts(organization_id);
create index if not exists billing_invoices_organization_id_idx on public.billing_invoices(organization_id);
create index if not exists billing_invoices_status_idx on public.billing_invoices(status);

-- Internal financial data: RLS on, no public policy — reached only via the
-- service-role admin client the admin pages use (mirrors sponsor_campaigns).
alter table public.billing_accounts enable row level security;
alter table public.billing_invoices enable row level security;
