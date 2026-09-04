-- Platform Identity 1.2 projection safety boundary.
--
-- The human identity decision and its durable queue intent commit together.
-- Domain mapping materialization happens only when a separately claimed queue
-- item is applied, so a downstream failure cannot roll back or reopen the
-- canonical decision.

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
  v_projection_required boolean := false;
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

    -- Canonical mutations stay atomic inside this RPC. No Team/Family/Venue
    -- projection write occurs before this function returns successfully.
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

    select
      nullif(btrim(s.source_metadata->>'reviewLegacySystem'), '') is not null
      and nullif(btrim(s.source_metadata->>'reviewLegacyTenantKey'), '') is not null
      and nullif(btrim(s.source_metadata->>'reviewLegacyPersonId'), '') is not null
    into v_projection_required
    from public.person_source_identities s
    where s.id = v_case.source_identity_id;

    if coalesce(v_projection_required, false) then
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

    -- Materialize downstream mapping only after the decision transaction has
    -- committed and this queue item has been claimed. Any error rolls back this
    -- apply call only; the canonical link and resolved review remain durable.
    insert into public.person_legacy_links (
      person_id, legacy_system, legacy_tenant_key, legacy_person_id, source_identity_id
    )
    select v_item.canonical_person_id,
           lower(btrim(s.source_metadata->>'reviewLegacySystem')),
           btrim(s.source_metadata->>'reviewLegacyTenantKey'),
           btrim(s.source_metadata->>'reviewLegacyPersonId'),
           s.id
    from public.person_source_identities s
    where s.id = v_item.source_identity_id
      and s.organization_id = v_item.organization_id
      and s.person_id = v_item.canonical_person_id
      and nullif(btrim(s.source_metadata->>'reviewLegacySystem'), '') is not null
      and nullif(btrim(s.source_metadata->>'reviewLegacyTenantKey'), '') is not null
      and nullif(btrim(s.source_metadata->>'reviewLegacyPersonId'), '') is not null
    on conflict (legacy_system, legacy_tenant_key, legacy_person_id)
    do update set person_id = excluded.person_id, source_identity_id = excluded.source_identity_id;

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

revoke all on function public.review_platform_identity_case(uuid, uuid, text, uuid, integer, uuid, text) from public, anon, authenticated;
revoke all on function public.apply_platform_identity_projection(uuid, text) from public, anon, authenticated;
grant execute on function public.review_platform_identity_case(uuid, uuid, text, uuid, integer, uuid, text) to service_role;
grant execute on function public.apply_platform_identity_projection(uuid, text) to service_role;

comment on function public.review_platform_identity_case(uuid, uuid, text, uuid, integer, uuid, text)
  is 'Atomic canonical review decision plus durable projection intent; downstream domain projection executes separately.';
comment on function public.apply_platform_identity_projection(uuid, text)
  is 'Applies a claimed identity projection after re-reading canonical state; failures never reverse canonical decisions.';
