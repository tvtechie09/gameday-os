-- GameDay OS Automation Engine Phase 1
-- Admin-only workflow layer for Weather Delay, Field Closed, Game Final,
-- and Schedule Changed operations. Existing weather implementation is not
-- duplicated; workflows consume weather/status events when emitted by app code.

create extension if not exists pgcrypto;

create table if not exists public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  name text not null,
  description text,
  workflow_type text not null check (workflow_type in ('weather_delay', 'field_closed', 'game_final', 'schedule_changed')),
  workflow_status text not null default 'active' check (workflow_status in ('active', 'paused', 'disabled', 'archived')),
  event_type text not null,
  scope_type text not null check (scope_type in ('platform', 'organization', 'venue', 'field', 'play_surface', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration')),
  scope_id uuid not null,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  event_type text not null,
  event_source text not null check (event_source in ('weather', 'field', 'session', 'schedule', 'admin')),
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_conditions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  condition_type text not null,
  condition_config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.automation_workflows(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete cascade,
  action_type text not null,
  action_config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint automation_actions_parent_check check (workflow_id is not null or rule_id is not null)
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.automation_workflows(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete cascade,
  run_status text not null default 'pending' check (run_status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  run_type text not null default 'manual' check (run_type in ('manual', 'event', 'test')),
  triggered_by uuid references public.users(id),
  trigger_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  constraint automation_runs_parent_check check (workflow_id is not null or rule_id is not null)
);

create table if not exists public.automation_run_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.automation_runs(id) on delete cascade,
  workflow_id uuid references public.automation_workflows(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete cascade,
  log_level text not null default 'info' check (log_level in ('debug', 'info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint automation_run_logs_parent_check check (workflow_id is not null or rule_id is not null)
);

alter table public.automation_actions add column if not exists workflow_id uuid references public.automation_workflows(id) on delete cascade;
alter table public.automation_runs add column if not exists workflow_id uuid references public.automation_workflows(id) on delete cascade;
alter table public.automation_run_logs add column if not exists workflow_id uuid references public.automation_workflows(id) on delete cascade;
alter table public.automation_actions alter column rule_id drop not null;
alter table public.automation_runs alter column rule_id drop not null;
alter table public.automation_run_logs alter column rule_id drop not null;

create index if not exists automation_workflows_organization_id_idx on public.automation_workflows(organization_id);
create index if not exists automation_workflows_venue_id_idx on public.automation_workflows(venue_id);
create index if not exists automation_workflows_field_id_idx on public.automation_workflows(field_id);
create index if not exists automation_workflows_tournament_id_idx on public.automation_workflows(tournament_id);
create index if not exists automation_workflows_scope_idx on public.automation_workflows(scope_type, scope_id);
create index if not exists automation_workflows_status_idx on public.automation_workflows(workflow_status);
create index if not exists automation_events_workflow_id_idx on public.automation_events(workflow_id);
create index if not exists automation_conditions_workflow_id_idx on public.automation_conditions(workflow_id);
create index if not exists automation_actions_workflow_id_idx on public.automation_actions(workflow_id);
create index if not exists automation_runs_workflow_id_idx on public.automation_runs(workflow_id);
create index if not exists automation_run_logs_workflow_id_idx on public.automation_run_logs(workflow_id);

alter table public.automation_workflows enable row level security;
alter table public.automation_events enable row level security;
alter table public.automation_conditions enable row level security;
alter table public.automation_actions enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_run_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_workflows' and policyname = 'automation_workflows_service_role_all') then
    create policy automation_workflows_service_role_all on public.automation_workflows for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_events' and policyname = 'automation_events_service_role_all') then
    create policy automation_events_service_role_all on public.automation_events for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_conditions' and policyname = 'automation_conditions_service_role_all') then
    create policy automation_conditions_service_role_all on public.automation_conditions for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_actions' and policyname = 'automation_actions_service_role_all') then
    create policy automation_actions_service_role_all on public.automation_actions for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_runs' and policyname = 'automation_runs_service_role_all') then
    create policy automation_runs_service_role_all on public.automation_runs for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_run_logs' and policyname = 'automation_run_logs_service_role_all') then
    create policy automation_run_logs_service_role_all on public.automation_run_logs for all to service_role using (true) with check (true);
  end if;
end $$;

insert into public.permissions (key, name, description)
values
  ('automation.workflows.view', 'View Automation Workflows', 'View automation workflows inside an approved scope.'),
  ('automation.workflows.manage', 'Manage Automation Workflows', 'Create, edit, enable, disable, or archive automation workflows inside an approved scope.'),
  ('automation.workflows.test', 'Test Automation Workflows', 'Run manual workflow tests inside an approved scope.'),
  ('automation.workflows.pause', 'Pause Automation Workflows', 'Pause and resume automation workflows inside an approved scope.'),
  ('automation.logs.view', 'View Automation Logs', 'View automation run logs inside an approved scope.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

with automation_permission_map(role_key, permission_key) as (
  values
    ('platform_admin', 'automation.workflows.view'), ('platform_admin', 'automation.workflows.manage'), ('platform_admin', 'automation.workflows.test'), ('platform_admin', 'automation.workflows.pause'), ('platform_admin', 'automation.logs.view'),
    ('organization_admin', 'automation.workflows.view'), ('organization_admin', 'automation.workflows.manage'), ('organization_admin', 'automation.workflows.test'), ('organization_admin', 'automation.workflows.pause'), ('organization_admin', 'automation.logs.view'),
    ('organization_owner', 'automation.workflows.view'), ('organization_owner', 'automation.workflows.manage'), ('organization_owner', 'automation.workflows.test'), ('organization_owner', 'automation.workflows.pause'), ('organization_owner', 'automation.logs.view'),
    ('venue_director', 'automation.workflows.view'), ('venue_director', 'automation.workflows.manage'), ('venue_director', 'automation.workflows.test'), ('venue_director', 'automation.workflows.pause'), ('venue_director', 'automation.logs.view'),
    ('tournament_director', 'automation.workflows.view'), ('tournament_director', 'automation.workflows.manage'), ('tournament_director', 'automation.workflows.test'), ('tournament_director', 'automation.workflows.pause'), ('tournament_director', 'automation.logs.view'),
    ('league_director', 'automation.workflows.view'), ('league_director', 'automation.workflows.manage'), ('league_director', 'automation.workflows.test'), ('league_director', 'automation.workflows.pause'), ('league_director', 'automation.logs.view')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from automation_permission_map
join public.roles on roles.key = automation_permission_map.role_key
join public.permissions on permissions.key = automation_permission_map.permission_key
on conflict do nothing;
