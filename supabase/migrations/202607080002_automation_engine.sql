-- GameDay OS Automation Engine v1
-- Admin-only, scoped, event-driven automation foundation.
-- RLS is enabled without broad public policies. Service-role API routes enforce
-- GameDay Identity permissions and write audit logs for sensitive mutations.

create extension if not exists pgcrypto;

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  name text not null,
  description text,
  rule_status text not null default 'active' check (rule_status in ('active', 'paused', 'archived')),
  trigger_event text not null,
  trigger_conditions jsonb not null default '{}'::jsonb,
  scope_type text not null check (scope_type in ('platform', 'organization', 'venue', 'field', 'play_surface', 'tournament', 'league', 'team', 'player', 'family', 'game', 'session', 'device', 'integration')),
  scope_id uuid not null,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_triggers (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  trigger_type text not null,
  event_type text not null,
  conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_actions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  action_type text not null,
  action_config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  run_status text not null default 'pending' check (run_status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  run_type text not null default 'manual' check (run_type in ('manual', 'event', 'test')),
  triggered_by uuid references public.users(id),
  trigger_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

create table if not exists public.automation_run_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.automation_runs(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  log_level text not null default 'info' check (log_level in ('debug', 'info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists automation_rules_organization_id_idx on public.automation_rules(organization_id);
create index if not exists automation_rules_venue_id_idx on public.automation_rules(venue_id);
create index if not exists automation_rules_tournament_id_idx on public.automation_rules(tournament_id);
create index if not exists automation_rules_scope_idx on public.automation_rules(scope_type, scope_id);
create index if not exists automation_rules_status_idx on public.automation_rules(rule_status);
create index if not exists automation_triggers_rule_id_idx on public.automation_triggers(rule_id);
create index if not exists automation_actions_rule_id_idx on public.automation_actions(rule_id);
create index if not exists automation_runs_rule_id_idx on public.automation_runs(rule_id);
create index if not exists automation_runs_status_idx on public.automation_runs(run_status);
create index if not exists automation_run_logs_run_id_idx on public.automation_run_logs(run_id);
create index if not exists automation_run_logs_rule_id_idx on public.automation_run_logs(rule_id);
create index if not exists automation_run_logs_created_at_idx on public.automation_run_logs(created_at desc);

alter table public.automation_rules enable row level security;
alter table public.automation_triggers enable row level security;
alter table public.automation_actions enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_run_logs enable row level security;

-- Keep policies narrow until Supabase Auth is introduced. Service-role API routes
-- are the enforcement layer for v1.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_rules' and policyname = 'automation_rules_service_role_all') then
    create policy automation_rules_service_role_all on public.automation_rules for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_triggers' and policyname = 'automation_triggers_service_role_all') then
    create policy automation_triggers_service_role_all on public.automation_triggers for all to service_role using (true) with check (true);
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
  ('automation.rules.view', 'View Automation Rules', 'View automation rules inside an approved scope.'),
  ('automation.rules.create', 'Create Automation Rules', 'Create automation rules inside an approved scope.'),
  ('automation.rules.edit', 'Edit Automation Rules', 'Edit automation rules inside an approved scope.'),
  ('automation.rules.delete', 'Delete Automation Rules', 'Delete automation rules inside an approved scope.'),
  ('automation.rules.pause', 'Pause Automation Rules', 'Pause or resume automation rules inside an approved scope.'),
  ('automation.rules.run_manual', 'Run Automation Rules Manually', 'Manually test or run approved automation rules.'),
  ('automation.rules.view_logs', 'View Automation Logs', 'View automation run logs inside an approved scope.'),
  ('automation.templates.use', 'Use Automation Templates', 'Create automation rules from approved templates.')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

with automation_permission_map(role_key, permission_key) as (
  values
    ('platform_admin', 'automation.rules.view'),
    ('platform_admin', 'automation.rules.create'),
    ('platform_admin', 'automation.rules.edit'),
    ('platform_admin', 'automation.rules.delete'),
    ('platform_admin', 'automation.rules.pause'),
    ('platform_admin', 'automation.rules.run_manual'),
    ('platform_admin', 'automation.rules.view_logs'),
    ('platform_admin', 'automation.templates.use'),
    ('organization_admin', 'automation.rules.view'),
    ('organization_admin', 'automation.rules.create'),
    ('organization_admin', 'automation.rules.edit'),
    ('organization_admin', 'automation.rules.delete'),
    ('organization_admin', 'automation.rules.pause'),
    ('organization_admin', 'automation.rules.run_manual'),
    ('organization_admin', 'automation.rules.view_logs'),
    ('organization_admin', 'automation.templates.use'),
    ('venue_director', 'automation.rules.view'),
    ('venue_director', 'automation.rules.create'),
    ('venue_director', 'automation.rules.edit'),
    ('venue_director', 'automation.rules.delete'),
    ('venue_director', 'automation.rules.pause'),
    ('venue_director', 'automation.rules.run_manual'),
    ('venue_director', 'automation.rules.view_logs'),
    ('venue_director', 'automation.templates.use'),
    ('tournament_director', 'automation.rules.view'),
    ('tournament_director', 'automation.rules.create'),
    ('tournament_director', 'automation.rules.edit'),
    ('tournament_director', 'automation.rules.delete'),
    ('tournament_director', 'automation.rules.pause'),
    ('tournament_director', 'automation.rules.run_manual'),
    ('tournament_director', 'automation.rules.view_logs'),
    ('tournament_director', 'automation.templates.use'),
    ('league_director', 'automation.rules.view'),
    ('league_director', 'automation.rules.create'),
    ('league_director', 'automation.rules.edit'),
    ('league_director', 'automation.rules.delete'),
    ('league_director', 'automation.rules.pause'),
    ('league_director', 'automation.rules.run_manual'),
    ('league_director', 'automation.rules.view_logs'),
    ('league_director', 'automation.templates.use')
)
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from automation_permission_map
join public.roles on roles.key = automation_permission_map.role_key
join public.permissions on permissions.key = automation_permission_map.permission_key
on conflict do nothing;
