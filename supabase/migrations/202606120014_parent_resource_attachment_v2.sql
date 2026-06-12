alter table public.resource_activations
  add column if not exists assigned_to_session boolean not null default false;

alter table public.resource_activations
  add column if not exists approved_by text;

alter table public.resource_activations
  add column if not exists approved_at timestamptz;
