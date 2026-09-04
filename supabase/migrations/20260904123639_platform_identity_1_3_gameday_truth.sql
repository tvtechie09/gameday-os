-- GameDay Platform Identity 1.3 — GameDay Truth
-- A bounded, read-only, service-only explanation of canonical identity facts.

create index if not exists person_provenance_truth_history_idx
  on public.person_provenance_assertions
  (organization_id, person_id, fact_domain, fact_key, status, source_timestamp desc, ingested_at desc);

create or replace function public.get_platform_person_truth_summary(
  p_organization_id uuid,
  p_person_id uuid,
  p_history_limit integer default 5
) returns jsonb
language sql stable security invoker set search_path = '' as $$
with recursive
scope as (
  select p.id, p.display_name, p.preferred_name
  from public.people p
  join public.person_organization_links pol
    on pol.person_id = p.id and pol.organization_id = p_organization_id and pol.status = 'active'
  where p.id = p_person_id and p.status = 'active'
),
supported_fields(fact_domain, fact_key, label) as (
  values
    ('profile'::text, 'display_name'::text, 'Display Name'::text),
    ('profile', 'preferred_name', 'Preferred Name'),
    ('profile', 'first_name', 'First Name'),
    ('profile', 'last_name', 'Last Name')
),
eligible as (
  select pa.id, pa.fact_domain, pa.fact_key, pa.asserted_value, pa.status,
         psi.provider, coalesce(pa.source_timestamp, pa.ingested_at) as asserted_at,
         coalesce(org_rule.priority, platform_rule.priority, 0) as priority,
         case when org_rule.id is not null then 'ORG_AUTHORITY_RULE'
              when platform_rule.id is not null then 'PLATFORM_AUTHORITY_RULE'
              else 'PLATFORM_DEFAULT' end as authority_code
  from public.person_provenance_assertions pa
  join scope on true
  join supported_fields sf on sf.fact_domain = pa.fact_domain and sf.fact_key = pa.fact_key
  join public.person_source_identities psi
    on psi.id = pa.source_identity_id
   and psi.organization_id = p_organization_id
   and psi.person_id = p_person_id
   and psi.status = 'active'
  left join public.identity_authority_rules org_rule
    on org_rule.organization_id = p_organization_id
   and org_rule.fact_domain = pa.fact_domain and org_rule.fact_key = pa.fact_key
   and org_rule.provider = psi.provider and org_rule.active
  left join public.identity_authority_rules platform_rule
    on platform_rule.organization_id is null
   and platform_rule.fact_domain = pa.fact_domain and platform_rule.fact_key = pa.fact_key
   and platform_rule.provider = psi.provider and platform_rule.active
  where pa.organization_id = p_organization_id and pa.person_id = p_person_id
),
current_assertions as (select * from eligible where status = 'current'),
with_top_priority as (
  select ca.*, max(priority) over (partition by fact_domain, fact_key) as top_priority
  from current_assertions ca
),
top_assertions as (select * from with_top_priority where priority = top_priority),
with_latest as (
  select ta.*, max(asserted_at) over (partition by fact_domain, fact_key) as latest_at
  from top_assertions ta
),
decision_stats as (
  select fact_domain, fact_key, max(asserted_at) as latest_at,
         count(distinct asserted_value) as top_value_count,
         count(distinct asserted_value) filter (where asserted_at = latest_at) as latest_value_count
  from with_latest
  group by fact_domain, fact_key
),
winners as (
  select * from (
    select wl.*, row_number() over (
      partition by wl.fact_domain, wl.fact_key
      order by wl.provider, wl.id
    ) as winner_order
    from with_latest wl
    join decision_stats ds using (fact_domain, fact_key)
    where wl.asserted_at = ds.latest_at and ds.latest_value_count = 1
  ) ranked where winner_order = 1
),
all_value_stats as (
  select fact_domain, fact_key, count(*) as source_count, count(distinct asserted_value) as value_count
  from current_assertions group by fact_domain, fact_key
),
history_ranked as (
  select e.*, row_number() over (
    partition by e.fact_domain, e.fact_key order by e.asserted_at desc, e.provider, e.id
  ) as history_order
  from eligible e
),
field_truth as (
  select sf.fact_domain, sf.fact_key, sf.label,
    case when ds.latest_value_count > 1 then null else w.asserted_value end as effective_value,
    case when ds.latest_value_count > 1 then null else w.provider end as effective_provider,
    case when ds.latest_value_count > 1 then 'EQUAL_AUTHORITY_CONFLICT'
         when ds.top_value_count > 1 then 'LATEST_EQUAL_AUTHORITY'
         else w.authority_code end as reason_code,
    case when ds.latest_value_count > 1 then 'UNRESOLVED_CONFLICT'
         when av.value_count > 1 and w.provider in ('gameday_account', 'gameday_native') and w.authority_code <> 'PLATFORM_DEFAULT' then 'HUMAN_RESOLVED'
         when av.value_count > 1 then 'DIFFERENT_SOURCES'
         when av.source_count > 1 then 'AGREEING_SOURCES'
         else 'NO_CONFLICT' end as conflict_state,
    w.asserted_at as effective_at,
    coalesce((select jsonb_agg(jsonb_build_object(
      'provider', ca.provider, 'value', ca.asserted_value, 'timestamp', ca.asserted_at,
      'humanConfirmed', ca.provider in ('gameday_account', 'gameday_native')
    ) order by ca.asserted_at desc, ca.provider, ca.id)
      from current_assertions ca where ca.fact_domain = sf.fact_domain and ca.fact_key = sf.fact_key), '[]'::jsonb) as assertions,
    coalesce((select jsonb_agg(jsonb_build_object(
      'provider', hr.provider, 'value', hr.asserted_value, 'timestamp', hr.asserted_at,
      'status', hr.status, 'humanConfirmed', hr.provider in ('gameday_account', 'gameday_native')
    ) order by hr.history_order)
      from history_ranked hr where hr.fact_domain = sf.fact_domain and hr.fact_key = sf.fact_key
       and hr.history_order <= greatest(1, least(coalesce(p_history_limit, 5), 10))), '[]'::jsonb) as history
  from supported_fields sf
  left join decision_stats ds using (fact_domain, fact_key)
  left join winners w using (fact_domain, fact_key)
  left join all_value_stats av using (fact_domain, fact_key)
),
relationship_truth as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'relationshipType', r.relationship_type,
    'relatedEntityType', r.related_entity_type,
    'relatedLabel', case when r.related_entity_type = 'person' then coalesce(related.display_name, 'Known person') else initcap(replace(r.related_entity_type, '_', ' ')) end,
    'provider', psi.provider,
    'timestamp', coalesce(r.source_updated_at, r.last_seen_at),
    'hasDifferentRelationship', exists (
      select 1 from public.person_relationships other
      join public.person_source_identities other_source on other_source.id = other.source_identity_id and other_source.status = 'active'
      where other.organization_id = r.organization_id and other.subject_person_id = r.subject_person_id
        and other.related_entity_type = r.related_entity_type and other.related_entity_id = r.related_entity_id
        and other.status = 'active' and other.relationship_type <> r.relationship_type
    )
  ) order by r.relationship_type, r.related_entity_type, r.related_entity_id, psi.provider), '[]'::jsonb) as value
  from scope
  join public.person_relationships r on r.organization_id = p_organization_id and r.subject_person_id = p_person_id and r.status = 'active'
  join public.person_source_identities psi on psi.id = r.source_identity_id and psi.organization_id = p_organization_id and psi.person_id = p_person_id and psi.status = 'active'
  left join public.people related on related.id = r.related_person_id
),
projection_state as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'targetDomain', q.target_domain, 'operationType', q.operation_type,
    'status', q.status, 'attemptCount', q.attempt_count, 'lastErrorCode', q.last_error_code,
    'updatedAt', q.updated_at
  ) order by q.updated_at desc) filter (where q.id is not null), '[]'::jsonb) as value
  from scope left join public.platform_identity_projection_queue q
    on q.organization_id = p_organization_id and q.canonical_person_id = p_person_id
   and q.status in ('PENDING', 'PROCESSING', 'RETRY', 'FAILED')
),
review_state as (
  select coalesce(jsonb_agg(jsonb_build_object('caseId', c.id, 'updatedAt', c.updated_at) order by c.updated_at desc), '[]'::jsonb) as value
  from public.identity_resolution_cases c
  join public.person_source_identities s on s.id = c.source_identity_id and s.organization_id = p_organization_id
  where c.organization_id = p_organization_id and c.review_status = 'open'
    and (c.candidate_person_id = p_person_id
      or c.evidence->'candidate_person_ids' ? p_person_id::text)
)
select case when not exists (select 1 from scope) then null else jsonb_build_object(
  'person', (select jsonb_build_object('id', id, 'displayName', display_name, 'preferredName', preferred_name) from scope),
  'fields', (select jsonb_agg(jsonb_build_object(
    'domain', fact_domain, 'key', fact_key, 'label', label,
    'effectiveValue', effective_value, 'effectiveProvider', effective_provider,
    'reasonCode', reason_code, 'conflictState', conflict_state,
    'effectiveAt', effective_at, 'assertions', assertions, 'history', history
  ) order by label) from field_truth where jsonb_array_length(assertions) > 0),
  'relationships', (select value from relationship_truth),
  'projectionItems', (select value from projection_state),
  'reviewCases', (select value from review_state),
  'accountClaimed', exists (select 1 from public.account_people ap join scope on scope.id = ap.person_id)
) end;
$$;

create or replace function public.get_platform_person_effective_value(
  p_organization_id uuid, p_person_id uuid, p_fact_domain text, p_fact_key text
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select value
  from jsonb_array_elements(coalesce(
    public.get_platform_person_truth_summary(p_organization_id, p_person_id, 1)->'fields',
    '[]'::jsonb
  )) value
  where value->>'domain' = p_fact_domain and value->>'key' = p_fact_key
  limit 1;
$$;

revoke all on function public.get_platform_person_truth_summary(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.get_platform_person_effective_value(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.get_platform_person_truth_summary(uuid, uuid, integer) to service_role;
grant execute on function public.get_platform_person_effective_value(uuid, uuid, text, text) to service_role;

comment on function public.get_platform_person_truth_summary(uuid, uuid, integer) is
  'Bounded organization-scoped GameDay Truth summary. Service-only; returns no provider tenant keys, external IDs, or unmasked identifiers.';
