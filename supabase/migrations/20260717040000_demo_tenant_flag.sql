-- Disposable demo tenants.
--
-- WHY: onboarding provisions real organizations. Every demo we spin up for a
-- prospect is therefore permanent, indistinguishable from a paying customer, and
-- accumulates in production forever with no cleanup path. is_demo previously
-- existed only on sessions and tournaments -- enough to re-time a demo day, not
-- enough to tear a demo tenant down.
--
-- Mirrors the team app's is_sandbox / is_seed convention (gdt_organizations,
-- gdt_team_seasons, etc.) so both apps mark non-production data the same way.
--
-- Defaults to false: every existing row stays real. Only the onboarding tool
-- sets this true, and only teardown reads it.
--
-- Idempotent.

alter table organizations add column if not exists is_demo boolean not null default false;
alter table venues        add column if not exists is_demo boolean not null default false;
alter table fields        add column if not exists is_demo boolean not null default false;

-- Teardown lists demo tenants by organization; billing and reporting exclude them.
create index if not exists organizations_is_demo_idx on organizations (is_demo) where is_demo;
create index if not exists venues_is_demo_idx on venues (is_demo) where is_demo;
