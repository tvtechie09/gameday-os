-- GameDay OS Platform Identity 1.0
-- Additive canonical-person, source-identity, provenance, and resolution foundation.
-- Provider adapters supply assertions; they do not decide canonical identity.
-- Existing public.gdt_* Family/Team records remain untouched until their text
-- state_id/person_id values can be mapped through an explicit compatibility job.

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  display_name text not null,
  email text,
  phone text,
  person_type text not null default 'other',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.people
  add column if not exists preferred_name text,
  add column if not exists status text not null default 'active';

do $$
begin
  alter table public.people add constraint people_platform_status_check
    check (status in ('active', 'inactive', 'archived'));
exception when duplicate_object then null;
end $$;

create table if not exists public.person_organization_links (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (person_id, organization_id)
);

create table if not exists public.account_people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  user_id uuid references public.users(id) on delete set null,
  person_id uuid not null unique references public.people(id) on delete restrict,
  claimed_at timestamptz not null default now(),
  claim_method text not null check (claim_method in ('legacy_link', 'verified_identifier', 'user_confirmation', 'admin_confirmation')),
  verification_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.person_source_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  connection_id uuid references public.integration_connections(id) on delete set null,
  provider text not null,
  provider_connection_key text not null,
  external_person_id text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'disconnected', 'stale', 'deleted_at_source')),
  source_metadata jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_connection_key, external_person_id)
);

create table if not exists public.person_identifiers (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_identity_id uuid references public.person_source_identities(id) on delete set null,
  identifier_type text not null check (identifier_type in ('email', 'phone')),
  normalized_value text not null,
  display_value text not null,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'provider_verified', 'gameday_verified')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.person_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject_person_id uuid not null references public.people(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('guardian_of', 'coach_of', 'member_of', 'volunteer_for')),
  related_person_id uuid references public.people(id) on delete cascade,
  related_entity_type text not null check (related_entity_type in ('person', 'team', 'organization', 'event')),
  related_entity_id text not null,
  source_identity_id uuid references public.person_source_identities(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive', 'deleted_at_source')),
  source_updated_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((related_entity_type = 'person' and related_person_id is not null) or related_entity_type <> 'person')
);

create table if not exists public.person_provenance_assertions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  source_identity_id uuid not null references public.person_source_identities(id) on delete cascade,
  fact_domain text not null,
  fact_key text not null,
  asserted_value jsonb not null,
  value_hash text not null,
  external_record_ref text,
  source_timestamp timestamptz,
  ingested_at timestamptz not null default now(),
  status text not null default 'current' check (status in ('current', 'stale', 'deleted_at_source')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_identity_id, fact_domain, fact_key, value_hash)
);

create table if not exists public.identity_resolution_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_identity_id uuid not null references public.person_source_identities(id) on delete cascade,
  candidate_person_id uuid references public.people(id) on delete cascade,
  outcome text not null check (outcome in ('LINKED', 'POSSIBLE_MATCH', 'DISTINCT')),
  review_status text not null default 'open' check (review_status in ('open', 'confirmed', 'rejected', 'superseded')),
  reason_codes text[] not null default '{}'::text[],
  evidence jsonb not null default '{}'::jsonb,
  confidence text not null check (confidence in ('deterministic', 'candidate', 'none')),
  reviewed_by_user_id uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.identity_separation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_identity_id uuid not null references public.person_source_identities(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  reason_code text not null default 'EXPLICITLY_MARKED_DISTINCT',
  decided_by_user_id uuid references public.users(id) on delete set null,
  decided_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_identity_id, person_id)
);

create table if not exists public.identity_resolution_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null check (event_type in ('IDENTITY_LINKED', 'IDENTITY_UNLINKED', 'POSSIBLE_MATCH_CREATED', 'MATCH_REJECTED', 'ACCOUNT_CLAIMED', 'IDENTIFIER_ADDED', 'IDENTIFIER_VERIFIED', 'SOURCE_IDENTITY_ATTACHED')),
  person_id uuid references public.people(id) on delete set null,
  source_identity_id uuid references public.person_source_identities(id) on delete set null,
  previous_person_id uuid references public.people(id) on delete set null,
  actor_type text not null check (actor_type in ('system', 'authenticated_user', 'administrator')),
  actor_user_id uuid references public.users(id) on delete set null,
  reason_codes text[] not null default '{}'::text[],
  supporting_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.identity_authority_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  fact_domain text not null,
  fact_key text not null,
  provider text not null,
  priority integer not null default 0,
  active boolean not null default true,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.person_legacy_links (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  legacy_system text not null,
  legacy_tenant_key text not null,
  legacy_person_id text not null,
  created_at timestamptz not null default now(),
  unique (legacy_system, legacy_tenant_key, legacy_person_id)
);

create index if not exists person_organization_links_org_idx on public.person_organization_links (organization_id, status, person_id);
create index if not exists account_people_person_idx on public.account_people (person_id);
create index if not exists person_source_identities_person_idx on public.person_source_identities (person_id, status);
create index if not exists person_source_identities_org_idx on public.person_source_identities (organization_id, status, last_seen_at desc);
create index if not exists person_identifiers_lookup_idx on public.person_identifiers (organization_id, identifier_type, normalized_value) where verification_status <> 'unverified';
create unique index if not exists person_identifiers_source_unique_idx on public.person_identifiers (person_id, identifier_type, normalized_value, coalesce(source_identity_id, '00000000-0000-0000-0000-000000000000'::uuid));
create unique index if not exists person_relationships_active_unique_idx on public.person_relationships (organization_id, subject_person_id, relationship_type, related_entity_type, related_entity_id, coalesce(source_identity_id, '00000000-0000-0000-0000-000000000000'::uuid)) where status = 'active';
create index if not exists person_relationships_related_person_idx on public.person_relationships (organization_id, related_person_id) where related_person_id is not null and status = 'active';
create index if not exists person_provenance_person_fact_idx on public.person_provenance_assertions (person_id, fact_domain, fact_key, status);
create index if not exists identity_resolution_cases_open_idx on public.identity_resolution_cases (organization_id, created_at desc) where review_status = 'open';
create index if not exists identity_resolution_events_person_idx on public.identity_resolution_events (organization_id, person_id, created_at desc);
create unique index if not exists identity_authority_rules_unique_idx on public.identity_authority_rules (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), fact_domain, fact_key, provider) where active;

-- Preserve the legacy Venue identity associations without rewriting a person.
insert into public.person_organization_links (person_id, organization_id, status)
select id, organization_id, 'active'
from public.people
where organization_id is not null
on conflict (person_id, organization_id) do nothing;

insert into public.account_people (auth_user_id, user_id, person_id, claim_method, verification_metadata)
select users.auth_user_id, people.user_id, people.id, 'legacy_link', jsonb_build_object('source', 'people.user_id')
from public.people
join public.users on users.id = people.user_id
where people.user_id is not null and users.auth_user_id is not null
on conflict do nothing;

insert into public.person_source_identities (
  organization_id, person_id, provider, provider_connection_key,
  external_person_id, status, source_metadata
)
select organization_id, id, 'gameday_legacy', 'venue_people', id::text, 'active', jsonb_build_object('legacy_table', 'people')
from public.people
where organization_id is not null
on conflict (provider, provider_connection_key, external_person_id) do update
set person_id = coalesce(public.person_source_identities.person_id, excluded.person_id),
    last_seen_at = now(), updated_at = now();

insert into public.person_identifiers (
  person_id, organization_id, source_identity_id, identifier_type,
  normalized_value, display_value, verification_status
)
select people.id, people.organization_id, source.id, 'email', lower(btrim(people.email)), btrim(people.email), 'unverified'
from public.people
join public.person_source_identities source
  on source.provider = 'gameday_legacy'
 and source.provider_connection_key = 'venue_people'
 and source.external_person_id = people.id::text
where people.organization_id is not null and nullif(btrim(people.email), '') is not null
on conflict do nothing;

insert into public.person_identifiers (
  person_id, organization_id, source_identity_id, identifier_type,
  normalized_value, display_value, verification_status
)
select people.id, people.organization_id, source.id, 'phone', regexp_replace(people.phone, '\D', '', 'g'), btrim(people.phone), 'unverified'
from public.people
join public.person_source_identities source
  on source.provider = 'gameday_legacy'
 and source.provider_connection_key = 'venue_people'
 and source.external_person_id = people.id::text
where people.organization_id is not null and nullif(regexp_replace(people.phone, '\D', '', 'g'), '') is not null
on conflict do nothing;

alter table public.people enable row level security;
alter table public.person_organization_links enable row level security;
alter table public.account_people enable row level security;
alter table public.person_source_identities enable row level security;
alter table public.person_identifiers enable row level security;
alter table public.person_relationships enable row level security;
alter table public.person_provenance_assertions enable row level security;
alter table public.identity_resolution_cases enable row level security;
alter table public.identity_separation_rules enable row level security;
alter table public.identity_resolution_events enable row level security;
alter table public.identity_authority_rules enable row level security;
alter table public.person_legacy_links enable row level security;

revoke all on table public.people from public, anon, authenticated;
revoke all on table public.person_organization_links from public, anon, authenticated;
revoke all on table public.account_people from public, anon, authenticated;
revoke all on table public.person_source_identities from public, anon, authenticated;
revoke all on table public.person_identifiers from public, anon, authenticated;
revoke all on table public.person_relationships from public, anon, authenticated;
revoke all on table public.person_provenance_assertions from public, anon, authenticated;
revoke all on table public.identity_resolution_cases from public, anon, authenticated;
revoke all on table public.identity_separation_rules from public, anon, authenticated;
revoke all on table public.identity_resolution_events from public, anon, authenticated;
revoke all on table public.identity_authority_rules from public, anon, authenticated;
revoke all on table public.person_legacy_links from public, anon, authenticated;

grant select, insert, update, delete on table public.people to service_role;
grant select, insert, update, delete on table public.person_organization_links to service_role;
grant select, insert, update, delete on table public.account_people to service_role;
grant select, insert, update, delete on table public.person_source_identities to service_role;
grant select, insert, update, delete on table public.person_identifiers to service_role;
grant select, insert, update, delete on table public.person_relationships to service_role;
grant select, insert, update, delete on table public.person_provenance_assertions to service_role;
grant select, insert, update, delete on table public.identity_resolution_cases to service_role;
grant select, insert, update, delete on table public.identity_separation_rules to service_role;
grant select, insert, update, delete on table public.identity_resolution_events to service_role;
grant select, insert, update, delete on table public.identity_authority_rules to service_role;
grant select, insert, update, delete on table public.person_legacy_links to service_role;

do $$
declare identity_table text;
begin
  foreach identity_table in array array[
    'people', 'person_organization_links', 'account_people',
    'person_source_identities', 'person_identifiers', 'person_relationships',
    'person_provenance_assertions', 'identity_resolution_cases',
    'identity_separation_rules', 'identity_resolution_events',
    'identity_authority_rules', 'person_legacy_links'
  ] loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = identity_table
        and policyname = identity_table || '_service_role_all'
    ) then
      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true)',
        identity_table || '_service_role_all', identity_table
      );
    end if;
  end loop;
end $$;

comment on table public.people is 'Global canonical humans. Authentication and organization visibility are linked separately.';
comment on table public.person_source_identities is 'Durable provider-specific identities; may remain unresolved with person_id NULL.';
comment on table public.person_provenance_assertions is 'Source-specific fact assertions retained without cross-provider last-write-wins.';
comment on table public.identity_resolution_cases is 'Explainable deterministic and candidate outcomes for later identity review.';
comment on table public.identity_separation_rules is 'Explicit keep-separate decisions retained across future provider syncs.';
comment on table public.identity_authority_rules is 'Foundation for field/domain-specific GameDay Truth selection; not a global provider ranking.';
