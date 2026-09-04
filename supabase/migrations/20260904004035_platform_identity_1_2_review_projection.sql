-- GameDay Platform Identity 1.2
-- Administrator review workflow plus a narrow, durable compatibility queue.

alter table public.identity_resolution_cases
  add column if not exists review_version integer not null default 1,
  add column if not exists deferred_at timestamptz,
  add column if not exists deferred_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists resolution_action text,
  add column if not exists resolution_note text;

alter table public.identity_resolution_cases
  drop constraint if exists identity_resolution_cases_review_version_check;
alter table public.identity_resolution_cases
  add constraint identity_resolution_cases_review_version_check check (review_version > 0);
alter table public.identity_resolution_cases
  drop constraint if exists identity_resolution_cases_resolution_action_check;
alter table public.identity_resolution_cases
  add constraint identity_resolution_cases_resolution_action_check
  check (resolution_action is null or resolution_action in ('LINKED', 'KEEP_SEPARATE', 'DEFERRED'));

create index if not exists identity_resolution_cases_deferred_idx
  on public.identity_resolution_cases (organization_id, deferred_at desc)
  where review_status = 'open' and deferred_at is not null;
create index if not exists identity_resolution_cases_deferred_by_idx
  on public.identity_resolution_cases (deferred_by_user_id)
  where deferred_by_user_id is not null;

alter table public.person_legacy_links
  add column if not exists source_identity_id uuid references public.person_source_identities(id) on delete set null;
create index if not exists person_legacy_links_source_identity_idx
  on public.person_legacy_links (source_identity_id)
  where source_identity_id is not null;

alter table public.identity_resolution_events
  drop constraint if exists identity_resolution_events_event_type_check;
alter table public.identity_resolution_events
  add constraint identity_resolution_events_event_type_check check (event_type in (
    'IDENTITY_LINKED', 'IDENTITY_UNLINKED', 'POSSIBLE_MATCH_CREATED', 'MATCH_REJECTED',
    'ACCOUNT_CLAIMED', 'IDENTIFIER_ADDED', 'IDENTIFIER_VERIFIED', 'SOURCE_IDENTITY_ATTACHED',
    'REVIEW_DEFERRED', 'PROJECTION_REQUESTED', 'PROJECTION_RETRY_REQUESTED',
    'PROJECTION_COMPLETED', 'PROJECTION_FAILED'
  ));

create table if not exists public.platform_identity_projection_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  canonical_person_id uuid references public.people(id) on delete set null,
  source_identity_id uuid references public.person_source_identities(id) on delete set null,
  identity_event_id uuid references public.identity_resolution_events(id) on delete set null,
  operation_type text not null check (operation_type in (
    'ENSURE_PERSON_MAPPING', 'SYNC_RELATIONSHIPS', 'CLEANUP_SOURCE_MAPPING'
  )),
  target_domain text not null check (target_domain in ('team_family')),
  dedupe_key text not null unique,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'RETRY', 'COMPLETED', 'FAILED')),
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 5),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  lease_expires_at timestamptz,
  last_attempted_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists platform_identity_projection_claim_idx
  on public.platform_identity_projection_queue (available_at, created_at)
  where status in ('PENDING', 'RETRY');
create index if not exists platform_identity_projection_org_status_idx
  on public.platform_identity_projection_queue (organization_id, status, updated_at desc);
create index if not exists platform_identity_projection_source_idx
  on public.platform_identity_projection_queue (source_identity_id, updated_at desc)
  where source_identity_id is not null;
create index if not exists platform_identity_projection_person_idx
  on public.platform_identity_projection_queue (canonical_person_id)
  where canonical_person_id is not null;
create index if not exists platform_identity_projection_event_idx
  on public.platform_identity_projection_queue (identity_event_id)
  where identity_event_id is not null;

create table if not exists public.platform_domain_person_projections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  canonical_person_id uuid not null references public.people(id) on delete cascade,
  source_identity_id uuid not null references public.person_source_identities(id) on delete cascade,
  target_domain text not null check (target_domain in ('team_family')),
  legacy_system text not null,
  legacy_tenant_key text not null,
  legacy_person_id text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  projection_queue_id uuid references public.platform_identity_projection_queue(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_domain, legacy_system, legacy_tenant_key, legacy_person_id)
);

create index if not exists platform_domain_person_projection_person_idx
  on public.platform_domain_person_projections (organization_id, canonical_person_id, status);
create index if not exists platform_domain_person_projection_source_idx
  on public.platform_domain_person_projections (source_identity_id, status);
create index if not exists platform_domain_person_projection_queue_idx
  on public.platform_domain_person_projections (projection_queue_id)
  where projection_queue_id is not null;

create table if not exists public.platform_domain_relationship_projections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  relationship_id uuid not null references public.person_relationships(id) on delete cascade,
  subject_person_id uuid not null references public.people(id) on delete cascade,
  related_person_id uuid references public.people(id) on delete cascade,
  source_identity_id uuid references public.person_source_identities(id) on delete set null,
  target_domain text not null check (target_domain in ('team_family')),
  relationship_type text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  projection_queue_id uuid references public.platform_identity_projection_queue(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_domain, relationship_id)
);

create index if not exists platform_domain_relationship_projection_people_idx
  on public.platform_domain_relationship_projections (organization_id, subject_person_id, related_person_id, status);
create index if not exists platform_domain_relationship_projection_relationship_idx
  on public.platform_domain_relationship_projections (relationship_id);
create index if not exists platform_domain_relationship_projection_related_person_idx
  on public.platform_domain_relationship_projections (related_person_id)
  where related_person_id is not null;
create index if not exists platform_domain_relationship_projection_source_idx
  on public.platform_domain_relationship_projections (source_identity_id)
  where source_identity_id is not null;
create index if not exists platform_domain_relationship_projection_queue_idx
  on public.platform_domain_relationship_projections (projection_queue_id)
  where projection_queue_id is not null;

alter table public.platform_identity_projection_queue enable row level security;
alter table public.platform_domain_person_projections enable row level security;
alter table public.platform_domain_relationship_projections enable row level security;

revoke all on table public.platform_identity_projection_queue from public, anon, authenticated;
revoke all on table public.platform_domain_person_projections from public, anon, authenticated;
revoke all on table public.platform_domain_relationship_projections from public, anon, authenticated;
grant select, insert, update, delete on table public.platform_identity_projection_queue to service_role;
grant select, insert, update, delete on table public.platform_domain_person_projections to service_role;
grant select, insert, update, delete on table public.platform_domain_relationship_projections to service_role;

create policy platform_identity_projection_queue_service_role_all
  on public.platform_identity_projection_queue for all to service_role using (true) with check (true);
create policy platform_domain_person_projections_service_role_all
  on public.platform_domain_person_projections for all to service_role using (true) with check (true);
create policy platform_domain_relationship_projections_service_role_all
  on public.platform_domain_relationship_projections for all to service_role using (true) with check (true);

insert into public.permissions (key, name, description)
values ('identity.review', 'Review Identity Matches', 'Resolve ambiguous canonical identity cases inside an approved organization scope.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

with allowed_role(role_key) as (
  values ('super_admin'), ('platform_admin'), ('organization_admin')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from allowed_role a
join public.roles r on r.key = a.role_key
join public.permissions p on p.key = 'identity.review'
on conflict (role_id, permission_id) do nothing;

create or replace function public.version_platform_identity_review_case()
returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.review_version = old.review_version and (
    new.case_key is distinct from old.case_key
    or new.candidate_person_id is distinct from old.candidate_person_id
    or new.reason_codes is distinct from old.reason_codes
    or new.evidence is distinct from old.evidence
  ) then
    new.review_version := old.review_version + 1;
    if new.case_key is distinct from old.case_key then
      new.deferred_at := null;
      new.deferred_by_user_id := null;
      new.resolution_action := null;
      new.resolution_note := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists platform_identity_review_case_version_trigger on public.identity_resolution_cases;
create trigger platform_identity_review_case_version_trigger
before update on public.identity_resolution_cases
for each row execute function public.version_platform_identity_review_case();

create or replace function public.enqueue_platform_identity_projection(
  p_organization_id uuid,
  p_canonical_person_id uuid,
  p_source_identity_id uuid,
  p_identity_event_id uuid,
  p_operation_type text,
  p_target_domain text,
  p_dedupe_key text,
  p_context jsonb default '{}'::jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  if p_operation_type not in ('ENSURE_PERSON_MAPPING', 'SYNC_RELATIONSHIPS', 'CLEANUP_SOURCE_MAPPING')
     or p_target_domain <> 'team_family'
     or nullif(btrim(p_dedupe_key), '') is null then
    raise exception using errcode = '22023', message = 'INVALID_PROJECTION_REQUEST';
  end if;
  if not exists (select 1 from public.organizations where id = p_organization_id)
     or (p_source_identity_id is not null and not exists (
       select 1 from public.person_source_identities
       where id = p_source_identity_id and organization_id = p_organization_id
     ))
     or (p_canonical_person_id is not null and not exists (
       select 1 from public.person_organization_links
       where person_id = p_canonical_person_id and organization_id = p_organization_id
     )) then
    raise exception using errcode = '42501', message = 'PROJECTION_SCOPE_DENIED';
  end if;

  insert into public.platform_identity_projection_queue (
    organization_id, canonical_person_id, source_identity_id, identity_event_id,
    operation_type, target_domain, dedupe_key, context
  ) values (
    p_organization_id, p_canonical_person_id, p_source_identity_id, p_identity_event_id,
    p_operation_type, p_target_domain, btrim(p_dedupe_key), coalesce(p_context, '{}'::jsonb)
  )
  on conflict (dedupe_key) do update set updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.register_platform_domain_identity(
  p_organization_id uuid,
  p_canonical_person_id uuid,
  p_source_identity_id uuid,
  p_legacy_system text,
  p_legacy_tenant_key text,
  p_legacy_person_id text
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_event uuid; v_queue uuid;
begin
  if not exists (
    select 1 from public.person_source_identities s
    join public.person_organization_links pol
      on pol.person_id = p_canonical_person_id
     and pol.organization_id = p_organization_id
     and pol.status = 'active'
    where s.id = p_source_identity_id
      and s.organization_id = p_organization_id
      and s.person_id = p_canonical_person_id
  ) then
    raise exception using errcode = '42501', message = 'DOMAIN_IDENTITY_SCOPE_DENIED';
  end if;

  insert into public.person_legacy_links (
    person_id, legacy_system, legacy_tenant_key, legacy_person_id, source_identity_id
  ) values (
    p_canonical_person_id, lower(btrim(p_legacy_system)), btrim(p_legacy_tenant_key),
    btrim(p_legacy_person_id), p_source_identity_id
  )
  on conflict (legacy_system, legacy_tenant_key, legacy_person_id)
  do update set person_id = excluded.person_id, source_identity_id = excluded.source_identity_id;

  insert into public.identity_resolution_events (
    organization_id, event_type, person_id, source_identity_id, actor_type,
    reason_codes, supporting_metadata
  ) values (
    p_organization_id, 'PROJECTION_REQUESTED', p_canonical_person_id, p_source_identity_id,
    'system', array['DOMAIN_MAPPING_REGISTERED'],
    jsonb_build_object('target_domain', 'team_family', 'legacy_system', lower(btrim(p_legacy_system)))
  ) returning id into v_event;

  v_queue := public.enqueue_platform_identity_projection(
    p_organization_id, p_canonical_person_id, p_source_identity_id, v_event,
    'ENSURE_PERSON_MAPPING', 'team_family',
    p_source_identity_id::text || ':team_family:ENSURE_PERSON_MAPPING:' || p_canonical_person_id::text,
    jsonb_build_object('legacy_system', lower(btrim(p_legacy_system)))
  );
  return v_queue;
end;
$$;

create or replace function public.list_platform_identity_review_queue(
  p_organization_id uuid,
  p_filter text default 'needs_review'
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'caseId', c.id,
    'organizationId', c.organization_id,
    'sourceIdentityId', c.source_identity_id,
    'provider', s.provider,
    'incomingDisplayName', coalesce(nullif(s.source_metadata->>'reviewDisplayName', ''), 'Incoming provider record'),
    'candidateCount', jsonb_array_length(coalesce(c.evidence->'candidate_person_ids', '[]'::jsonb)),
    'reasonCodes', to_jsonb(c.reason_codes),
    'reviewStatus', c.review_status,
    'deferred', c.deferred_at is not null and c.review_status = 'open',
    'reviewVersion', c.review_version,
    'resolutionAction', c.resolution_action,
    'updatedAt', c.updated_at
  ) order by c.updated_at desc), '[]'::jsonb)
  from public.identity_resolution_cases c
  join public.person_source_identities s on s.id = c.source_identity_id
  where c.organization_id = p_organization_id
    and (
      (p_filter = 'needs_review' and c.review_status = 'open' and c.deferred_at is null)
      or (p_filter = 'deferred' and c.review_status = 'open' and c.deferred_at is not null)
      or (p_filter = 'resolved' and c.review_status <> 'open')
    );
$$;

create or replace function public.get_platform_identity_review_case(
  p_organization_id uuid,
  p_case_id uuid
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with selected as (
    select c.*, s.provider, s.source_metadata
    from public.identity_resolution_cases c
    join public.person_source_identities s on s.id = c.source_identity_id
    where c.id = p_case_id and c.organization_id = p_organization_id
  ), candidate_ids as (
    select distinct value::uuid as person_id
    from selected s, jsonb_array_elements_text(coalesce(s.evidence->'candidate_person_ids', '[]'::jsonb))
    union
    select candidate_person_id from selected where candidate_person_id is not null
  ), candidates as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'personId', p.id,
      'displayName', p.display_name,
      'identifiers', coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', pi.identifier_type,
          'maskedValue', case
            when pi.identifier_type = 'email' then
              left(split_part(pi.display_value, '@', 1), 1) || '***@' || split_part(pi.display_value, '@', 2)
            else '***-***-' || right(regexp_replace(pi.display_value, '\\D', '', 'g'), 4)
          end,
          'verificationStatus', pi.verification_status
        ) order by pi.identifier_type)
        from public.person_identifiers pi
        where pi.person_id = p.id and pi.organization_id = p_organization_id
      ), '[]'::jsonb),
      'provenanceProviders', coalesce((
        select jsonb_agg(distinct psi.provider)
        from public.person_provenance_assertions pa
        join public.person_source_identities psi on psi.id = pa.source_identity_id
        where pa.person_id = p.id and pa.organization_id = p_organization_id and pa.status = 'current'
      ), '[]'::jsonb),
      'keepSeparate', exists (
        select 1 from selected s2
        join public.identity_separation_rules sr
          on sr.source_identity_id = s2.source_identity_id
         and sr.person_id = p.id
         and sr.organization_id = p_organization_id
         and sr.active
      )
    ) order by p.display_name, p.id), '[]'::jsonb) as value
    from candidate_ids ci
    join public.people p on p.id = ci.person_id
    join public.person_organization_links pol
      on pol.person_id = p.id and pol.organization_id = p_organization_id and pol.status = 'active'
  )
  select case when not exists (select 1 from selected) then null else jsonb_build_object(
    'caseId', s.id,
    'organizationId', s.organization_id,
    'sourceIdentityId', s.source_identity_id,
    'provider', s.provider,
    'incomingDisplayName', coalesce(nullif(s.source_metadata->>'reviewDisplayName', ''), 'Incoming provider record'),
    'incomingIdentifiers', coalesce(s.source_metadata->'reviewIdentifiers', '[]'::jsonb),
    'relationshipContext', coalesce(s.source_metadata->'reviewRelationships', '[]'::jsonb),
    'candidatePeople', candidates.value,
    'reasonCodes', to_jsonb(s.reason_codes),
    'confidence', s.confidence,
    'reviewStatus', s.review_status,
    'deferredAt', s.deferred_at,
    'reviewVersion', s.review_version,
    'resolutionAction', s.resolution_action,
    'updatedAt', s.updated_at,
    'projectionItems', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'status', q.status, 'operationType', q.operation_type,
        'attemptCount', q.attempt_count, 'lastErrorCode', q.last_error_code
      ) order by q.created_at desc)
      from public.platform_identity_projection_queue q
      where q.organization_id = s.organization_id and q.source_identity_id = s.source_identity_id
    ), '[]'::jsonb)
  ) end
  from selected s cross join candidates;
$$;

create or replace function public.review_platform_identity_case(
  p_organization_id uuid,
  p_case_id uuid,
  p_action text,
  p_candidate_person_id uuid,
  p_expected_version integer,
  p_actor_user_id uuid,
  p_note text default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_case public.identity_resolution_cases%rowtype;
  v_candidates uuid[] := '{}'::uuid[];
  v_candidate uuid;
  v_event uuid;
  v_queue uuid;
  v_previous uuid;
begin
  select * into v_case
  from public.identity_resolution_cases
  where id = p_case_id and organization_id = p_organization_id
  for update;
  if not found then raise exception using errcode = '42501', message = 'IDENTITY_REVIEW_SCOPE_DENIED'; end if;
  if v_case.review_status <> 'open' then
    raise exception using errcode = '40001', message = 'IDENTITY_REVIEW_ALREADY_RESOLVED';
  end if;
  if v_case.review_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'IDENTITY_REVIEW_STALE';
  end if;

  select coalesce(array_agg(distinct candidate_id order by candidate_id), '{}'::uuid[])
  into v_candidates
  from (
    select value::uuid candidate_id
    from jsonb_array_elements_text(coalesce(v_case.evidence->'candidate_person_ids', '[]'::jsonb))
    union all select v_case.candidate_person_id where v_case.candidate_person_id is not null
  ) proposed;

  if p_action = 'LINK' then
    if p_candidate_person_id is null or not (p_candidate_person_id = any(v_candidates)) then
      raise exception using errcode = '42501', message = 'IDENTITY_CANDIDATE_REQUIRED';
    end if;
    if exists (
      select 1 from public.identity_separation_rules
      where organization_id = p_organization_id
        and source_identity_id = v_case.source_identity_id
        and person_id = p_candidate_person_id and active
    ) then
      raise exception using errcode = '42501', message = 'IDENTITY_SEPARATION_RULE_ACTIVE';
    end if;
    perform public.confirm_platform_identity_match(
      p_organization_id, v_case.source_identity_id, p_candidate_person_id, 'administrator', p_actor_user_id
    );
    update public.identity_resolution_cases
    set review_version = review_version + 1,
        deferred_at = null, deferred_by_user_id = null,
        resolution_action = 'LINKED',
        resolution_note = nullif(left(btrim(coalesce(p_note, '')), 500), ''),
        updated_at = now()
    where id = p_case_id;
    select id into v_event from public.identity_resolution_events
    where organization_id = p_organization_id
      and source_identity_id = v_case.source_identity_id
      and event_type = 'IDENTITY_LINKED'
    order by created_at desc, id desc limit 1;
    insert into public.person_legacy_links (
      person_id, legacy_system, legacy_tenant_key, legacy_person_id, source_identity_id
    )
    select p_candidate_person_id,
           lower(btrim(s.source_metadata->>'reviewLegacySystem')),
           btrim(s.source_metadata->>'reviewLegacyTenantKey'),
           btrim(s.source_metadata->>'reviewLegacyPersonId'),
           s.id
    from public.person_source_identities s
    where s.id = v_case.source_identity_id
      and nullif(btrim(s.source_metadata->>'reviewLegacySystem'), '') is not null
      and nullif(btrim(s.source_metadata->>'reviewLegacyTenantKey'), '') is not null
      and nullif(btrim(s.source_metadata->>'reviewLegacyPersonId'), '') is not null
    on conflict (legacy_system, legacy_tenant_key, legacy_person_id)
    do update set person_id = excluded.person_id, source_identity_id = excluded.source_identity_id;
    if exists (
      select 1 from public.person_legacy_links
      where source_identity_id = v_case.source_identity_id and person_id = p_candidate_person_id
    ) then
      v_queue := public.enqueue_platform_identity_projection(
        p_organization_id, p_candidate_person_id, v_case.source_identity_id, v_event,
        'ENSURE_PERSON_MAPPING', 'team_family',
        v_case.source_identity_id::text || ':team_family:ENSURE_PERSON_MAPPING:' || p_candidate_person_id::text,
        jsonb_build_object('review_case_id', p_case_id)
      );
    end if;
    return jsonb_build_object('status', 'confirmed', 'reviewVersion', p_expected_version + 1, 'projectionQueueId', v_queue);
  elsif p_action = 'KEEP_SEPARATE' then
    foreach v_candidate in array v_candidates loop
      perform public.keep_platform_identities_separate(
        p_organization_id, v_case.source_identity_id, v_candidate, p_actor_user_id
      );
    end loop;
    select person_id into v_previous from public.person_source_identities where id = v_case.source_identity_id;
    update public.identity_resolution_cases
    set review_status = 'rejected', reviewed_by_user_id = p_actor_user_id, reviewed_at = now(),
        review_version = review_version + 1, deferred_at = null, deferred_by_user_id = null,
        resolution_action = 'KEEP_SEPARATE',
        resolution_note = nullif(left(btrim(coalesce(p_note, '')), 500), ''),
        updated_at = now()
    where id = p_case_id;
    if v_previous is not null then
      select id into v_event from public.identity_resolution_events
      where organization_id = p_organization_id
        and source_identity_id = v_case.source_identity_id
        and event_type = 'MATCH_REJECTED'
      order by created_at desc, id desc limit 1;
      v_queue := public.enqueue_platform_identity_projection(
        p_organization_id, v_previous, v_case.source_identity_id, v_event,
        'CLEANUP_SOURCE_MAPPING', 'team_family',
        v_case.source_identity_id::text || ':team_family:CLEANUP_SOURCE_MAPPING:' || v_previous::text,
        jsonb_build_object('review_case_id', p_case_id)
      );
    end if;
    return jsonb_build_object('status', 'rejected', 'reviewVersion', p_expected_version + 1, 'projectionQueueId', v_queue);
  elsif p_action = 'DEFER' then
    update public.identity_resolution_cases
    set deferred_at = now(), deferred_by_user_id = p_actor_user_id,
        review_version = review_version + 1, resolution_action = 'DEFERRED',
        resolution_note = nullif(left(btrim(coalesce(p_note, '')), 500), ''),
        updated_at = now()
    where id = p_case_id;
    insert into public.identity_resolution_events (
      organization_id, event_type, source_identity_id, actor_type, actor_user_id,
      reason_codes, supporting_metadata
    ) values (
      p_organization_id, 'REVIEW_DEFERRED', v_case.source_identity_id, 'administrator',
      p_actor_user_id, array['ADMIN_DEFERRED_REVIEW'], jsonb_build_object('review_case_id', p_case_id)
    );
    return jsonb_build_object('status', 'deferred', 'reviewVersion', p_expected_version + 1, 'projectionQueueId', null);
  end if;
  raise exception using errcode = '22023', message = 'INVALID_IDENTITY_REVIEW_ACTION';
end;
$$;

create or replace function public.claim_platform_identity_projection(
  p_worker_id text,
  p_lease_seconds integer default 120
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_item public.platform_identity_projection_queue%rowtype;
begin
  if nullif(btrim(p_worker_id), '') is null or p_lease_seconds not between 30 and 600 then
    raise exception using errcode = '22023', message = 'INVALID_PROJECTION_WORKER';
  end if;

  update public.platform_identity_projection_queue
  set status = 'RETRY', locked_at = null, locked_by = null, lease_expires_at = null,
      available_at = now(), updated_at = now(), last_error_code = 'LEASE_EXPIRED'
  where status = 'PROCESSING' and lease_expires_at < now() and attempt_count < 5;
  update public.platform_identity_projection_queue
  set status = 'FAILED', locked_at = null, locked_by = null, lease_expires_at = null,
      updated_at = now(), last_error_code = 'RETRY_LIMIT_EXCEEDED'
  where status = 'PROCESSING' and lease_expires_at < now() and attempt_count >= 5;

  select * into v_item
  from public.platform_identity_projection_queue
  where status in ('PENDING', 'RETRY') and available_at <= now() and attempt_count < 5
  order by available_at, created_at
  for update skip locked
  limit 1;
  if not found then return null; end if;

  update public.platform_identity_projection_queue
  set status = 'PROCESSING', attempt_count = attempt_count + 1,
      locked_at = now(), locked_by = btrim(p_worker_id),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      last_attempted_at = now(), updated_at = now()
  where id = v_item.id
  returning * into v_item;

  return jsonb_build_object(
    'id', v_item.id, 'organizationId', v_item.organization_id,
    'canonicalPersonId', v_item.canonical_person_id,
    'sourceIdentityId', v_item.source_identity_id,
    'identityEventId', v_item.identity_event_id,
    'operationType', v_item.operation_type, 'targetDomain', v_item.target_domain,
    'attemptCount', v_item.attempt_count, 'leaseExpiresAt', v_item.lease_expires_at
  );
end;
$$;

create or replace function public.apply_platform_identity_projection(
  p_queue_id uuid,
  p_worker_id text
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_item public.platform_identity_projection_queue%rowtype;
  v_count integer := 0;
begin
  select * into v_item from public.platform_identity_projection_queue
  where id = p_queue_id and status = 'PROCESSING' and locked_by = btrim(p_worker_id)
  for update;
  if not found then raise exception using errcode = '40001', message = 'PROJECTION_LEASE_NOT_OWNED'; end if;
  if v_item.lease_expires_at < now() then raise exception using errcode = '40001', message = 'PROJECTION_LEASE_EXPIRED'; end if;
  if not exists (
    select 1 from public.person_source_identities
    where id = v_item.source_identity_id and organization_id = v_item.organization_id
  ) then raise exception using errcode = '42501', message = 'PROJECTION_SOURCE_SCOPE_DENIED'; end if;

  if v_item.operation_type in ('ENSURE_PERSON_MAPPING', 'SYNC_RELATIONSHIPS') then
    if not exists (
      select 1 from public.person_source_identities s
      join public.person_organization_links pol
        on pol.person_id = s.person_id and pol.organization_id = s.organization_id and pol.status = 'active'
      where s.id = v_item.source_identity_id
        and s.organization_id = v_item.organization_id
        and s.person_id = v_item.canonical_person_id
    ) then raise exception using errcode = '23514', message = 'CANONICAL_STATE_CHANGED'; end if;

    insert into public.platform_domain_person_projections (
      organization_id, canonical_person_id, source_identity_id, target_domain,
      legacy_system, legacy_tenant_key, legacy_person_id, status, projection_queue_id
    )
    select v_item.organization_id, l.person_id, v_item.source_identity_id, v_item.target_domain,
           l.legacy_system, l.legacy_tenant_key, l.legacy_person_id, 'active', v_item.id
    from public.person_legacy_links l
    where l.person_id = v_item.canonical_person_id and l.source_identity_id = v_item.source_identity_id
    on conflict (target_domain, legacy_system, legacy_tenant_key, legacy_person_id)
    do update set organization_id = excluded.organization_id,
                  canonical_person_id = excluded.canonical_person_id,
                  source_identity_id = excluded.source_identity_id,
                  status = 'active', projection_queue_id = excluded.projection_queue_id,
                  updated_at = now();
    get diagnostics v_count = row_count;
    if v_count = 0 then raise exception using errcode = '23514', message = 'LEGACY_MAPPING_REQUIRED'; end if;

    if v_item.operation_type = 'SYNC_RELATIONSHIPS' then
      insert into public.platform_domain_relationship_projections (
        organization_id, relationship_id, subject_person_id, related_person_id,
        source_identity_id, target_domain, relationship_type, status, projection_queue_id
      )
      select r.organization_id, r.id, r.subject_person_id, r.related_person_id,
             r.source_identity_id, v_item.target_domain, r.relationship_type,
             case when r.status = 'active' then 'active' else 'inactive' end, v_item.id
      from public.person_relationships r
      where r.organization_id = v_item.organization_id
        and r.subject_person_id = v_item.canonical_person_id
        and r.source_identity_id = v_item.source_identity_id
        and (r.related_person_id is null or exists (
          select 1 from public.person_organization_links pol
          where pol.person_id = r.related_person_id
            and pol.organization_id = v_item.organization_id and pol.status = 'active'
        ))
      on conflict (target_domain, relationship_id)
      do update set related_person_id = excluded.related_person_id,
                    status = excluded.status, projection_queue_id = excluded.projection_queue_id,
                    updated_at = now();
    end if;
  elsif v_item.operation_type = 'CLEANUP_SOURCE_MAPPING' then
    update public.platform_domain_person_projections
    set status = 'inactive', projection_queue_id = v_item.id, updated_at = now()
    where organization_id = v_item.organization_id and source_identity_id = v_item.source_identity_id;
    update public.platform_domain_relationship_projections
    set status = 'inactive', projection_queue_id = v_item.id, updated_at = now()
    where organization_id = v_item.organization_id and source_identity_id = v_item.source_identity_id;
  end if;

  update public.platform_identity_projection_queue
  set status = 'COMPLETED', completed_at = now(), updated_at = now(),
      locked_at = null, locked_by = null, lease_expires_at = null, last_error_code = null
  where id = v_item.id;
  insert into public.identity_resolution_events (
    organization_id, event_type, person_id, source_identity_id, actor_type,
    reason_codes, supporting_metadata
  ) values (
    v_item.organization_id, 'PROJECTION_COMPLETED', v_item.canonical_person_id,
    v_item.source_identity_id, 'system', array['IDENTITY_PROJECTION_APPLIED'],
    jsonb_build_object('projection_queue_id', v_item.id, 'target_domain', v_item.target_domain, 'operation_type', v_item.operation_type)
  );
  return jsonb_build_object('status', 'COMPLETED', 'projectionQueueId', v_item.id);
end;
$$;

create or replace function public.fail_platform_identity_projection(
  p_queue_id uuid,
  p_worker_id text,
  p_error_code text,
  p_retryable boolean
) returns text
language plpgsql security invoker set search_path = '' as $$
declare v_item public.platform_identity_projection_queue%rowtype; v_status text; v_delay integer;
begin
  select * into v_item from public.platform_identity_projection_queue
  where id = p_queue_id and status = 'PROCESSING' and locked_by = btrim(p_worker_id)
  for update;
  if not found then raise exception using errcode = '40001', message = 'PROJECTION_LEASE_NOT_OWNED'; end if;
  v_status := case when p_retryable and v_item.attempt_count < 5 then 'RETRY' else 'FAILED' end;
  v_delay := least(3600, 60 * (2 ^ greatest(v_item.attempt_count - 1, 0))::integer);
  update public.platform_identity_projection_queue
  set status = v_status, available_at = case when v_status = 'RETRY' then now() + make_interval(secs => v_delay) else available_at end,
      locked_at = null, locked_by = null, lease_expires_at = null,
      last_error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'PROJECTION_FAILED'), 80),
      updated_at = now()
  where id = v_item.id;
  if v_status = 'FAILED' then
    insert into public.identity_resolution_events (
      organization_id, event_type, person_id, source_identity_id, actor_type,
      reason_codes, supporting_metadata
    ) values (
      v_item.organization_id, 'PROJECTION_FAILED', v_item.canonical_person_id,
      v_item.source_identity_id, 'system', array['IDENTITY_PROJECTION_FAILED'],
      jsonb_build_object('projection_queue_id', v_item.id, 'error_code', left(coalesce(p_error_code, 'PROJECTION_FAILED'), 80))
    );
  end if;
  return v_status;
end;
$$;

create or replace function public.retry_platform_identity_projection(
  p_organization_id uuid,
  p_queue_id uuid,
  p_actor_user_id uuid
) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_item public.platform_identity_projection_queue%rowtype;
begin
  select * into v_item from public.platform_identity_projection_queue
  where id = p_queue_id and organization_id = p_organization_id for update;
  if not found then raise exception using errcode = '42501', message = 'PROJECTION_RETRY_SCOPE_DENIED'; end if;
  if v_item.status not in ('FAILED', 'RETRY') then
    raise exception using errcode = '22023', message = 'PROJECTION_RETRY_NOT_ALLOWED';
  end if;
  update public.platform_identity_projection_queue
  set status = 'RETRY', available_at = now(), attempt_count = 0,
      locked_at = null, locked_by = null, lease_expires_at = null,
      last_error_code = null, updated_at = now()
  where id = v_item.id;
  insert into public.identity_resolution_events (
    organization_id, event_type, person_id, source_identity_id, actor_type,
    actor_user_id, reason_codes, supporting_metadata
  ) values (
    p_organization_id, 'PROJECTION_RETRY_REQUESTED', v_item.canonical_person_id,
    v_item.source_identity_id, 'administrator', p_actor_user_id,
    array['ADMIN_RETRIED_PROJECTION'], jsonb_build_object('projection_queue_id', v_item.id)
  );
end;
$$;

create or replace function public.enqueue_platform_identity_event_projection()
returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_person uuid; v_operation text;
begin
  if new.source_identity_id is null then return new; end if;
  if new.event_type in ('IDENTITY_LINKED', 'ACCOUNT_CLAIMED') then
    v_person := new.person_id;
    v_operation := 'ENSURE_PERSON_MAPPING';
  elsif new.event_type = 'IDENTITY_UNLINKED' then
    v_person := new.previous_person_id;
    v_operation := 'CLEANUP_SOURCE_MAPPING';
  else return new;
  end if;
  if v_person is null or not exists (
    select 1 from public.person_legacy_links
    where source_identity_id = new.source_identity_id
  ) then return new; end if;
  perform public.enqueue_platform_identity_projection(
    new.organization_id, v_person, new.source_identity_id, new.id, v_operation, 'team_family',
    new.source_identity_id::text || ':team_family:' || v_operation || ':' || v_person::text,
    jsonb_build_object('identity_event_type', new.event_type)
  );
  return new;
end;
$$;

drop trigger if exists platform_identity_event_projection_trigger on public.identity_resolution_events;
create trigger platform_identity_event_projection_trigger
after insert on public.identity_resolution_events
for each row execute function public.enqueue_platform_identity_event_projection();

create or replace function public.enqueue_platform_relationship_projection()
returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_event uuid;
begin
  if new.source_identity_id is null or not exists (
    select 1 from public.person_legacy_links
    where source_identity_id = new.source_identity_id and person_id = new.subject_person_id
  ) then return new; end if;
  insert into public.identity_resolution_events (
    organization_id, event_type, person_id, source_identity_id, actor_type,
    reason_codes, supporting_metadata
  ) values (
    new.organization_id, 'PROJECTION_REQUESTED', new.subject_person_id,
    new.source_identity_id, 'system', array['RELATIONSHIP_PROJECTION_REQUIRED'],
    jsonb_build_object('relationship_id', new.id, 'relationship_type', new.relationship_type)
  ) returning id into v_event;
  perform public.enqueue_platform_identity_projection(
    new.organization_id, new.subject_person_id, new.source_identity_id, v_event,
    'SYNC_RELATIONSHIPS', 'team_family',
    new.source_identity_id::text || ':team_family:SYNC_RELATIONSHIPS:' || new.id::text,
    jsonb_build_object('relationship_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists platform_relationship_projection_trigger on public.person_relationships;
create trigger platform_relationship_projection_trigger
after insert or update of status, related_person_id on public.person_relationships
for each row execute function public.enqueue_platform_relationship_projection();

revoke all on function public.enqueue_platform_identity_projection(uuid, uuid, uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.version_platform_identity_review_case() from public, anon, authenticated;
revoke all on function public.register_platform_domain_identity(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.list_platform_identity_review_queue(uuid, text) from public, anon, authenticated;
revoke all on function public.get_platform_identity_review_case(uuid, uuid) from public, anon, authenticated;
revoke all on function public.review_platform_identity_case(uuid, uuid, text, uuid, integer, uuid, text) from public, anon, authenticated;
revoke all on function public.claim_platform_identity_projection(text, integer) from public, anon, authenticated;
revoke all on function public.apply_platform_identity_projection(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_platform_identity_projection(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.retry_platform_identity_projection(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.enqueue_platform_identity_event_projection() from public, anon, authenticated;
revoke all on function public.enqueue_platform_relationship_projection() from public, anon, authenticated;

grant execute on function public.enqueue_platform_identity_projection(uuid, uuid, uuid, uuid, text, text, text, jsonb) to service_role;
grant execute on function public.version_platform_identity_review_case() to service_role;
grant execute on function public.register_platform_domain_identity(uuid, uuid, uuid, text, text, text) to service_role;
grant execute on function public.list_platform_identity_review_queue(uuid, text) to service_role;
grant execute on function public.get_platform_identity_review_case(uuid, uuid) to service_role;
grant execute on function public.review_platform_identity_case(uuid, uuid, text, uuid, integer, uuid, text) to service_role;
grant execute on function public.claim_platform_identity_projection(text, integer) to service_role;
grant execute on function public.apply_platform_identity_projection(uuid, text) to service_role;
grant execute on function public.fail_platform_identity_projection(uuid, text, text, boolean) to service_role;
grant execute on function public.retry_platform_identity_projection(uuid, uuid, uuid) to service_role;
grant execute on function public.enqueue_platform_identity_event_projection() to service_role;
grant execute on function public.enqueue_platform_relationship_projection() to service_role;

comment on table public.platform_identity_projection_queue is 'Narrow service-only queue for canonical identity compatibility projections.';
comment on table public.platform_domain_person_projections is 'Idempotent canonical-to-domain person linkage metadata; domain-specific state remains authoritative.';
comment on table public.platform_domain_relationship_projections is 'Idempotent canonical relationship linkage metadata for compatible domain projections.';
