-- GameDay OS Platform Identity 1.1
-- Provider-neutral, service-role-only persistence runtime. Team/Family domain
-- records remain operational projections and are never rewritten here.

create table if not exists public.platform_organization_legacy_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legacy_system text not null,
  legacy_namespace text not null,
  legacy_id text not null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, legacy_system, legacy_namespace, legacy_id)
);

create unique index if not exists platform_org_legacy_mapping_active_unique_idx
  on public.platform_organization_legacy_mappings (legacy_system, legacy_namespace, legacy_id)
  where active;
create index if not exists platform_org_legacy_mapping_org_idx
  on public.platform_organization_legacy_mappings (organization_id, active);

alter table public.identity_resolution_cases add column if not exists case_key text;
create unique index if not exists identity_resolution_cases_open_source_unique_idx
  on public.identity_resolution_cases (source_identity_id)
  where review_status = 'open';

alter table public.platform_organization_legacy_mappings enable row level security;
revoke all on table public.platform_organization_legacy_mappings from public, anon, authenticated;
grant select, insert, update, delete on table public.platform_organization_legacy_mappings to service_role;
create policy platform_organization_legacy_mappings_service_role_all
  on public.platform_organization_legacy_mappings for all to service_role
  using (true) with check (true);

create or replace function public.resolve_platform_organization_mapping(
  p_legacy_system text,
  p_legacy_namespace text,
  p_legacy_id text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  active_ids uuid[];
  inactive_count integer;
begin
  if nullif(btrim(p_legacy_system), '') is null
     or nullif(btrim(p_legacy_namespace), '') is null
     or nullif(btrim(p_legacy_id), '') is null then
    return jsonb_build_object('status', 'invalid', 'organization_id', null);
  end if;

  select coalesce(array_agg(organization_id order by organization_id), '{}'::uuid[])
    into active_ids
  from public.platform_organization_legacy_mappings
  where legacy_system = lower(btrim(p_legacy_system))
    and legacy_namespace = lower(btrim(p_legacy_namespace))
    and legacy_id = btrim(p_legacy_id)
    and active;

  if cardinality(active_ids) = 1 then
    return jsonb_build_object('status', 'resolved', 'organization_id', active_ids[1]);
  elsif cardinality(active_ids) > 1 then
    return jsonb_build_object('status', 'ambiguous', 'organization_id', null);
  end if;

  select count(*) into inactive_count
  from public.platform_organization_legacy_mappings
  where legacy_system = lower(btrim(p_legacy_system))
    and legacy_namespace = lower(btrim(p_legacy_namespace))
    and legacy_id = btrim(p_legacy_id)
    and not active;

  return jsonb_build_object(
    'status', case when inactive_count > 0 then 'inactive' else 'unmapped' end,
    'organization_id', null
  );
end;
$$;

create or replace function public.resolve_platform_person(p_input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid := nullif(p_input->>'organizationId', '')::uuid;
  v_provider text := lower(btrim(p_input->>'provider'));
  v_connection text := btrim(p_input->>'providerConnectionKey');
  v_external text := btrim(p_input->>'externalPersonId');
  v_display text := coalesce(nullif(btrim(p_input->>'displayName'), ''), 'Unknown person');
  v_source_updated timestamptz := nullif(p_input->>'sourceUpdatedAt', '')::timestamptz;
  v_source public.person_source_identities%rowtype;
  v_person uuid;
  v_candidates uuid[] := '{}'::uuid[];
  v_identifier jsonb;
  v_fact jsonb;
  v_relationship jsonb;
  v_normalized text;
  v_verification text;
  v_reason text[] := '{}'::text[];
  v_outcome text;
  v_case_key text;
  v_previous_case_key text;
  v_existing_verification text;
  v_legacy jsonb;
begin
  if v_org is null or v_provider = '' or v_connection = '' or v_external = '' then
    raise exception using errcode = '22023', message = 'INVALID_IDENTITY_INPUT';
  end if;
  if not exists (select 1 from public.organizations where id = v_org) then
    raise exception using errcode = '23503', message = 'ORGANIZATION_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_provider || ':' || v_connection || ':' || v_external, 0));

  select * into v_source
  from public.person_source_identities
  where provider = v_provider
    and provider_connection_key = v_connection
    and external_person_id = v_external
  for update;

  if found and v_source.organization_id <> v_org then
    raise exception using errcode = '23514', message = 'SOURCE_IDENTITY_ORGANIZATION_CONFLICT';
  end if;

  if not found then
    insert into public.person_source_identities (
      organization_id, provider, provider_connection_key, external_person_id,
      status, source_metadata, source_updated_at
    ) values (
      v_org, v_provider, v_connection, v_external, 'active',
      coalesce(p_input->'sourceMetadata', '{}'::jsonb), v_source_updated
    ) returning * into v_source;
  else
    update public.person_source_identities
       set last_seen_at = now(), updated_at = now(), status = 'active',
           source_updated_at = coalesce(v_source_updated, source_updated_at),
           source_metadata = coalesce(p_input->'sourceMetadata', source_metadata)
     where id = v_source.id
     returning * into v_source;
  end if;

  if v_source.person_id is not null then
    v_person := v_source.person_id;
    v_outcome := 'LINKED';
    v_reason := array['SOURCE_IDENTITY_ALREADY_LINKED'];
  else
    select coalesce(array_agg(distinct pi.person_id order by pi.person_id), '{}'::uuid[])
      into v_candidates
    from jsonb_array_elements(coalesce(p_input->'identifiers', '[]'::jsonb)) incoming
    join public.person_identifiers pi
      on pi.organization_id = v_org
     and pi.identifier_type = incoming->>'type'
     and pi.normalized_value = case
       when incoming->>'type' = 'email' then lower(btrim(incoming->>'value'))
       when incoming->>'type' = 'phone' then regexp_replace(incoming->>'value', '\D', '', 'g')
       else '' end
     and pi.verification_status in ('provider_verified', 'gameday_verified')
    join public.person_organization_links pol
      on pol.person_id = pi.person_id and pol.organization_id = v_org and pol.status = 'active'
    where (
        incoming->>'verificationStatus' = 'gameday_verified'
        or (incoming->>'verificationStatus' = 'provider_verified' and nullif(btrim(incoming->>'verificationEvidence'), '') is not null)
      )
      and not exists (
        select 1 from public.identity_separation_rules sr
        where sr.organization_id = v_org and sr.source_identity_id = v_source.id
          and sr.person_id = pi.person_id and sr.active
      );

    if cardinality(v_candidates) = 1 then
      v_person := v_candidates[1];
      v_outcome := 'LINKED';
      v_reason := '{}'::text[];
      if exists (
        select 1 from jsonb_array_elements(coalesce(p_input->'identifiers', '[]'::jsonb)) incoming
        join public.person_identifiers pi on pi.person_id = v_person and pi.organization_id = v_org
          and pi.identifier_type = 'email' and pi.normalized_value = lower(btrim(incoming->>'value'))
          and pi.verification_status in ('provider_verified', 'gameday_verified')
        where incoming->>'type' = 'email' and (
          incoming->>'verificationStatus' = 'gameday_verified'
          or (incoming->>'verificationStatus' = 'provider_verified' and nullif(btrim(incoming->>'verificationEvidence'), '') is not null)
        )
      ) then v_reason := array_append(v_reason, 'VERIFIED_EMAIL_EXACT_MATCH'); end if;
      if exists (
        select 1 from jsonb_array_elements(coalesce(p_input->'identifiers', '[]'::jsonb)) incoming
        join public.person_identifiers pi on pi.person_id = v_person and pi.organization_id = v_org
          and pi.identifier_type = 'phone' and pi.normalized_value = regexp_replace(incoming->>'value', '\D', '', 'g')
          and pi.verification_status in ('provider_verified', 'gameday_verified')
        where incoming->>'type' = 'phone' and (
          incoming->>'verificationStatus' = 'gameday_verified'
          or (incoming->>'verificationStatus' = 'provider_verified' and nullif(btrim(incoming->>'verificationEvidence'), '') is not null)
        )
      ) then v_reason := array_append(v_reason, 'VERIFIED_PHONE_EXACT_MATCH'); end if;
      update public.person_source_identities set person_id = v_person, updated_at = now() where id = v_source.id;
      insert into public.identity_resolution_events (
        organization_id, event_type, person_id, source_identity_id, actor_type, reason_codes, supporting_metadata
      ) values (v_org, 'IDENTITY_LINKED', v_person, v_source.id, 'system', v_reason, jsonb_build_object('candidate_count', 1));
    elsif cardinality(v_candidates) > 1 then
      v_outcome := 'POSSIBLE_MATCH';
      v_reason := array['AMBIGUOUS_IDENTIFIER'];
    else
      -- Name plus already-resolved relationship context may suggest a review,
      -- but name alone never links.
      select coalesce(array_agg(distinct p.id order by p.id), '{}'::uuid[])
        into v_candidates
      from public.people p
      join public.person_organization_links pol
        on pol.person_id = p.id and pol.organization_id = v_org and pol.status = 'active'
      where regexp_replace(lower(p.display_name), '[^a-z0-9]+', ' ', 'g') = regexp_replace(lower(v_display), '[^a-z0-9]+', ' ', 'g')
        and exists (
          select 1
          from jsonb_array_elements(coalesce(p_input->'relationships', '[]'::jsonb)) rel
          join public.person_relationships pr
            on pr.organization_id = v_org
           and pr.subject_person_id = p.id
           and pr.relationship_type = rel->>'relationshipType'
           and pr.related_entity_type = rel->>'relatedEntityType'
           and pr.related_entity_id = rel->>'relatedEntityId'
           and pr.status = 'active'
        )
        and not exists (
          select 1 from public.identity_separation_rules sr
          where sr.organization_id = v_org and sr.source_identity_id = v_source.id
            and sr.person_id = p.id and sr.active
        );

      if cardinality(v_candidates) > 0 then
        v_outcome := 'POSSIBLE_MATCH';
        v_reason := array['SAME_GUARDIAN_AND_CHILD_CONTEXT'];
      else
        insert into public.people (display_name, person_type, status)
        values (v_display, coalesce(nullif(p_input->>'personType', ''), 'other'), 'active')
        returning id into v_person;
        insert into public.person_organization_links (person_id, organization_id, status)
        values (v_person, v_org, 'active')
        on conflict (person_id, organization_id) do update
          set status = 'active', last_seen_at = now();
        update public.person_source_identities set person_id = v_person, updated_at = now() where id = v_source.id;
        v_outcome := 'DISTINCT';
        v_reason := case
          when exists (select 1 from public.identity_separation_rules sr where sr.source_identity_id = v_source.id and sr.active)
            then array['EXPLICITLY_MARKED_DISTINCT','NEW_SOURCE_IDENTITY']
          else array['NAME_ONLY_INSUFFICIENT','NEW_SOURCE_IDENTITY'] end;
        insert into public.identity_resolution_events (
          organization_id, event_type, person_id, source_identity_id, actor_type, reason_codes, supporting_metadata
        ) values (v_org, 'SOURCE_IDENTITY_ATTACHED', v_person, v_source.id, 'system', v_reason, jsonb_build_object('created_person', true));
      end if;
    end if;
  end if;

  if v_outcome = 'POSSIBLE_MATCH' then
    v_case_key := md5(v_source.id::text || ':' || array_to_string(v_candidates, ',') || ':' || array_to_string(v_reason, ','));
    select case_key into v_previous_case_key from public.identity_resolution_cases
    where source_identity_id = v_source.id and review_status = 'open';
    insert into public.identity_resolution_cases (
      organization_id, source_identity_id, candidate_person_id, outcome,
      review_status, reason_codes, evidence, confidence, case_key
    ) values (
      v_org, v_source.id, case when cardinality(v_candidates) = 1 then v_candidates[1] else null end,
      'POSSIBLE_MATCH', 'open', v_reason,
      jsonb_build_object('candidate_person_ids', to_jsonb(v_candidates), 'provider', v_provider, 'source_identity_id', v_source.id),
      'candidate', v_case_key
    ) on conflict (source_identity_id) where review_status = 'open'
      do update set candidate_person_id = excluded.candidate_person_id,
                    reason_codes = excluded.reason_codes,
                    evidence = excluded.evidence,
                    confidence = excluded.confidence,
                    case_key = excluded.case_key,
                    updated_at = now();
    if v_previous_case_key is distinct from v_case_key then
      insert into public.identity_resolution_events (
        organization_id, event_type, source_identity_id, actor_type, reason_codes, supporting_metadata
      ) values (v_org, 'POSSIBLE_MATCH_CREATED', v_source.id, 'system', v_reason, jsonb_build_object('candidate_count', cardinality(v_candidates)));
    end if;
    return jsonb_build_object('outcome', v_outcome, 'personId', null, 'sourceIdentityId', v_source.id, 'candidatePersonIds', to_jsonb(v_candidates), 'reasonCodes', to_jsonb(v_reason), 'confidence', 'candidate');
  end if;

  insert into public.person_organization_links (person_id, organization_id, status, last_seen_at)
  values (v_person, v_org, 'active', now())
  on conflict (person_id, organization_id) do update set status = 'active', last_seen_at = now();

  for v_identifier in select value from jsonb_array_elements(coalesce(p_input->'identifiers', '[]'::jsonb)) loop
    if v_identifier->>'type' not in ('email', 'phone') then continue; end if;
    v_normalized := case when v_identifier->>'type' = 'email'
      then lower(btrim(v_identifier->>'value'))
      else regexp_replace(v_identifier->>'value', '\D', '', 'g') end;
    if v_normalized = '' then continue; end if;
    v_verification := case
      when v_identifier->>'verificationStatus' = 'gameday_verified' then 'gameday_verified'
      when v_identifier->>'verificationStatus' = 'provider_verified'
        and nullif(btrim(v_identifier->>'verificationEvidence'), '') is not null then 'provider_verified'
      else 'unverified' end;
    select verification_status into v_existing_verification
    from public.person_identifiers
    where person_id = v_person and identifier_type = v_identifier->>'type'
      and normalized_value = v_normalized and source_identity_id = v_source.id
    limit 1;
    if found then
      update public.person_identifiers
         set display_value = btrim(v_identifier->>'value'), last_seen_at = now(), updated_at = now(),
             verification_status = case
               when verification_status = 'gameday_verified' then verification_status
               when verification_status = 'provider_verified' and v_verification = 'unverified' then verification_status
               else v_verification end
       where person_id = v_person and identifier_type = v_identifier->>'type'
         and normalized_value = v_normalized and source_identity_id = v_source.id;
      if v_existing_verification <> v_verification and v_verification <> 'unverified' then
        insert into public.identity_resolution_events (
          organization_id, event_type, person_id, source_identity_id, actor_type, reason_codes, supporting_metadata
        ) values (v_org, 'IDENTIFIER_VERIFIED', v_person, v_source.id, 'system', array['IDENTIFIER_VERIFICATION_CHANGED'], jsonb_build_object('identifier_type', v_identifier->>'type'));
      end if;
    else
      insert into public.person_identifiers (
        person_id, organization_id, source_identity_id, identifier_type,
        normalized_value, display_value, verification_status
      ) values (v_person, v_org, v_source.id, v_identifier->>'type', v_normalized, btrim(v_identifier->>'value'), v_verification);
      insert into public.identity_resolution_events (
        organization_id, event_type, person_id, source_identity_id, actor_type, reason_codes, supporting_metadata
      ) values (v_org, 'IDENTIFIER_ADDED', v_person, v_source.id, 'system', '{}'::text[], jsonb_build_object('identifier_type', v_identifier->>'type', 'verification_status', v_verification));
    end if;
  end loop;

  for v_fact in select value from jsonb_array_elements(coalesce(p_input->'facts', '[]'::jsonb)) loop
    update public.person_provenance_assertions
       set status = 'stale', updated_at = now()
     where source_identity_id = v_source.id
       and fact_domain = v_fact->>'domain' and fact_key = v_fact->>'key'
       and value_hash <> md5((v_fact->'value')::text) and status = 'current';
    insert into public.person_provenance_assertions (
      organization_id, person_id, source_identity_id, fact_domain, fact_key,
      asserted_value, value_hash, external_record_ref, source_timestamp, status
    ) values (
      v_org, v_person, v_source.id, v_fact->>'domain', v_fact->>'key',
      v_fact->'value', md5((v_fact->'value')::text), nullif(v_fact->>'externalRecordRef', ''),
      coalesce(nullif(v_fact->>'sourceTimestamp', '')::timestamptz, v_source_updated), 'current'
    ) on conflict (source_identity_id, fact_domain, fact_key, value_hash)
      do update set status = 'current', source_timestamp = excluded.source_timestamp,
                    ingested_at = now(), updated_at = now();
  end loop;

  for v_relationship in select value from jsonb_array_elements(coalesce(p_input->'relationships', '[]'::jsonb)) loop
    if v_relationship->>'relationshipType' not in ('guardian_of','coach_of','member_of','volunteer_for')
       or v_relationship->>'relatedEntityType' not in ('person','team','organization','event') then
      continue;
    end if;
    if v_relationship->>'relatedEntityType' = 'person' and not exists (
      select 1 from public.person_organization_links
      where person_id = nullif(v_relationship->>'relatedPersonId', '')::uuid
        and organization_id = v_org and status = 'active'
    ) then
      raise exception using errcode = '23514', message = 'RELATED_PERSON_OUTSIDE_ORGANIZATION';
    end if;
    update public.person_relationships
       set last_seen_at = now(), updated_at = now(), status = 'active', source_updated_at = v_source_updated
     where organization_id = v_org and subject_person_id = v_person
       and relationship_type = v_relationship->>'relationshipType'
       and related_entity_type = v_relationship->>'relatedEntityType'
       and related_entity_id = v_relationship->>'relatedEntityId'
       and source_identity_id = v_source.id and status = 'active';
    if not found then
      insert into public.person_relationships (
        organization_id, subject_person_id, relationship_type, related_person_id,
        related_entity_type, related_entity_id, source_identity_id, source_updated_at
      ) values (
        v_org, v_person, v_relationship->>'relationshipType',
        case when v_relationship->>'relatedEntityType' = 'person' then nullif(v_relationship->>'relatedPersonId', '')::uuid else null end,
        v_relationship->>'relatedEntityType', v_relationship->>'relatedEntityId', v_source.id, v_source_updated
      );
    end if;
  end loop;

  v_legacy := p_input->'legacyPersonMapping';
  if v_legacy is not null and nullif(v_legacy->>'legacySystem', '') is not null
     and nullif(v_legacy->>'legacyTenantKey', '') is not null
     and nullif(v_legacy->>'legacyPersonId', '') is not null then
    insert into public.person_legacy_links (person_id, legacy_system, legacy_tenant_key, legacy_person_id)
    values (v_person, lower(btrim(v_legacy->>'legacySystem')), btrim(v_legacy->>'legacyTenantKey'), btrim(v_legacy->>'legacyPersonId'))
    on conflict (legacy_system, legacy_tenant_key, legacy_person_id) do update
      set person_id = case when public.person_legacy_links.person_id = excluded.person_id then excluded.person_id else public.person_legacy_links.person_id end;
    if exists (
      select 1 from public.person_legacy_links
      where legacy_system = lower(btrim(v_legacy->>'legacySystem'))
        and legacy_tenant_key = btrim(v_legacy->>'legacyTenantKey')
        and legacy_person_id = btrim(v_legacy->>'legacyPersonId')
        and person_id <> v_person
    ) then
      raise exception using errcode = '23514', message = 'LEGACY_PERSON_MAPPING_CONFLICT';
    end if;
  end if;

  update public.identity_resolution_cases set review_status = 'superseded', updated_at = now()
  where source_identity_id = v_source.id and review_status = 'open';

  return jsonb_build_object('outcome', v_outcome, 'personId', v_person, 'sourceIdentityId', v_source.id, 'candidatePersonIds', to_jsonb(v_candidates), 'reasonCodes', to_jsonb(v_reason), 'confidence', case when v_outcome = 'LINKED' then 'deterministic' else 'none' end);
end;
$$;

create or replace function public.keep_platform_identities_separate(
  p_organization_id uuid, p_source_identity_id uuid, p_person_id uuid, p_actor_user_id uuid
) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.person_source_identities where id = p_source_identity_id and organization_id = p_organization_id)
     or not exists (select 1 from public.person_organization_links where person_id = p_person_id and organization_id = p_organization_id and status = 'active') then
    raise exception using errcode = '42501', message = 'IDENTITY_SCOPE_DENIED';
  end if;
  insert into public.identity_separation_rules (organization_id, source_identity_id, person_id, decided_by_user_id, active)
  values (p_organization_id, p_source_identity_id, p_person_id, p_actor_user_id, true)
  on conflict (source_identity_id, person_id) do update set active = true, decided_by_user_id = excluded.decided_by_user_id, decided_at = now(), updated_at = now();
  insert into public.identity_resolution_events (organization_id, event_type, person_id, source_identity_id, actor_type, actor_user_id, reason_codes)
  values (p_organization_id, 'MATCH_REJECTED', p_person_id, p_source_identity_id, 'administrator', p_actor_user_id, array['EXPLICITLY_MARKED_DISTINCT']);
end;
$$;

create or replace function public.unlink_platform_source_identity(
  p_organization_id uuid, p_source_identity_id uuid, p_actor_user_id uuid
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_previous uuid;
begin
  select person_id into v_previous from public.person_source_identities
  where id = p_source_identity_id and organization_id = p_organization_id for update;
  if v_previous is null then raise exception using errcode = 'P0002', message = 'LINKED_SOURCE_NOT_FOUND'; end if;
  update public.person_source_identities set person_id = null, status = 'disconnected', updated_at = now() where id = p_source_identity_id;
  insert into public.identity_resolution_events (organization_id, event_type, source_identity_id, previous_person_id, actor_type, actor_user_id, reason_codes)
  values (p_organization_id, 'IDENTITY_UNLINKED', p_source_identity_id, v_previous, 'administrator', p_actor_user_id, array['ADMIN_UNLINKED_IDENTITY']);
  return v_previous;
end;
$$;

create or replace function public.confirm_platform_identity_match(
  p_organization_id uuid,
  p_source_identity_id uuid,
  p_person_id uuid,
  p_actor_type text,
  p_actor_user_id uuid
) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_previous uuid;
begin
  if p_actor_type not in ('authenticated_user', 'administrator') then
    raise exception using errcode = '22023', message = 'INVALID_IDENTITY_ACTOR';
  end if;
  select person_id into v_previous from public.person_source_identities
  where id = p_source_identity_id and organization_id = p_organization_id for update;
  if not found or not exists (
    select 1 from public.person_organization_links
    where person_id = p_person_id and organization_id = p_organization_id and status = 'active'
  ) then raise exception using errcode = '42501', message = 'IDENTITY_SCOPE_DENIED'; end if;
  if p_actor_type = 'authenticated_user' and not exists (
    select 1 from public.identity_resolution_cases
    where source_identity_id = p_source_identity_id and organization_id = p_organization_id
      and review_status = 'open'
      and (candidate_person_id = p_person_id or evidence->'candidate_person_ids' ? p_person_id::text)
  ) then raise exception using errcode = '42501', message = 'IDENTITY_CANDIDATE_REQUIRED'; end if;
  update public.person_source_identities set person_id = p_person_id, status = 'active', updated_at = now()
  where id = p_source_identity_id;
  update public.identity_resolution_cases
  set review_status = 'confirmed', reviewed_by_user_id = p_actor_user_id, reviewed_at = now(), updated_at = now()
  where source_identity_id = p_source_identity_id and review_status = 'open';
  insert into public.identity_resolution_events (
    organization_id, event_type, person_id, source_identity_id, previous_person_id,
    actor_type, actor_user_id, reason_codes
  ) values (
    p_organization_id, 'IDENTITY_LINKED', p_person_id, p_source_identity_id, v_previous,
    p_actor_type, p_actor_user_id,
    array[case when p_actor_type = 'administrator' then 'ADMIN_CONFIRMED_MATCH' else 'USER_CONFIRMED_MATCH' end]
  );
end;
$$;

create or replace function public.claim_platform_account(
  p_auth_user_id uuid,
  p_organization_id uuid,
  p_verified_identifiers jsonb,
  p_actor_user_id uuid default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_existing uuid;
  v_source uuid;
  v_candidates uuid[] := '{}'::uuid[];
  v_person uuid;
  v_reasons text[] := '{}'::text[];
begin
  select person_id into v_existing from public.account_people where auth_user_id = p_auth_user_id;
  if v_existing is not null then
    return jsonb_build_object('outcome', 'LINKED', 'personId', v_existing, 'reasonCodes', jsonb_build_array('ACCOUNT_ALREADY_CLAIMED'));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('account:' || p_auth_user_id::text, 0));
  insert into public.person_source_identities (
    organization_id, provider, provider_connection_key, external_person_id, status, source_metadata
  ) values (p_organization_id, 'gameday_account', 'auth', p_auth_user_id::text, 'active', jsonb_build_object('claim_only', true))
  on conflict (provider, provider_connection_key, external_person_id) do update set last_seen_at = now(), updated_at = now()
  returning id into v_source;
  if exists (select 1 from public.person_source_identities where id = v_source and organization_id <> p_organization_id) then
    raise exception using errcode = '42501', message = 'ACCOUNT_ORGANIZATION_CONFLICT';
  end if;

  select coalesce(array_agg(distinct pi.person_id order by pi.person_id), '{}'::uuid[])
    into v_candidates
  from jsonb_array_elements(coalesce(p_verified_identifiers, '[]'::jsonb)) incoming
  join public.person_identifiers pi
    on pi.organization_id = p_organization_id
   and pi.identifier_type = incoming->>'type'
   and pi.normalized_value = case when incoming->>'type' = 'email'
     then lower(btrim(incoming->>'value')) else regexp_replace(incoming->>'value', '\D', '', 'g') end
   and pi.verification_status in ('provider_verified', 'gameday_verified')
  join public.person_organization_links pol
    on pol.person_id = pi.person_id and pol.organization_id = p_organization_id and pol.status = 'active'
  where incoming->>'verificationStatus' = 'gameday_verified'
    and not exists (
      select 1 from public.identity_separation_rules sr
      where sr.organization_id = p_organization_id and sr.source_identity_id = v_source
        and sr.person_id = pi.person_id and sr.active
    );

  if cardinality(v_candidates) <> 1 then
    return jsonb_build_object(
      'outcome', 'POSSIBLE_MATCH', 'personId', null, 'candidatePersonIds', to_jsonb(v_candidates),
      'reasonCodes', case when cardinality(v_candidates) > 1 then jsonb_build_array('AMBIGUOUS_IDENTIFIER') else jsonb_build_array('NO_VERIFIED_MATCH') end
    );
  end if;
  v_person := v_candidates[1];
  if exists (select 1 from jsonb_array_elements(coalesce(p_verified_identifiers, '[]'::jsonb)) item where item->>'type' = 'email' and item->>'verificationStatus' = 'gameday_verified')
    then v_reasons := array_append(v_reasons, 'VERIFIED_EMAIL_EXACT_MATCH'); end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_verified_identifiers, '[]'::jsonb)) item where item->>'type' = 'phone' and item->>'verificationStatus' = 'gameday_verified')
    then v_reasons := array_append(v_reasons, 'VERIFIED_PHONE_EXACT_MATCH'); end if;
  insert into public.account_people (auth_user_id, user_id, person_id, claim_method, verification_metadata)
  values (p_auth_user_id, p_actor_user_id, v_person, 'verified_identifier', jsonb_build_object('organization_id', p_organization_id))
  on conflict (auth_user_id) do nothing;
  update public.person_source_identities set person_id = v_person, updated_at = now() where id = v_source;
  insert into public.identity_resolution_events (
    organization_id, event_type, person_id, source_identity_id, actor_type, actor_user_id, reason_codes
  ) values (p_organization_id, 'ACCOUNT_CLAIMED', v_person, v_source, 'authenticated_user', p_actor_user_id, v_reasons);
  return jsonb_build_object('outcome', 'LINKED', 'personId', v_person, 'candidatePersonIds', to_jsonb(v_candidates), 'reasonCodes', to_jsonb(v_reasons));
end;
$$;

create or replace function public.get_platform_person_effective_value(
  p_organization_id uuid, p_person_id uuid, p_fact_domain text, p_fact_key text
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with ranked as (
    select pa.id, pa.asserted_value, psi.provider, pa.source_timestamp, pa.ingested_at,
           coalesce(org_rule.priority, global_rule.priority, 0) as priority,
           case when org_rule.id is not null then 'organization_authority_rule'
                when global_rule.id is not null then 'global_authority_rule'
                else 'latest_assertion_without_explicit_rule' end as authority_reason
    from public.person_provenance_assertions pa
    join public.person_source_identities psi on psi.id = pa.source_identity_id
    left join public.identity_authority_rules org_rule
      on org_rule.organization_id = p_organization_id and org_rule.fact_domain = pa.fact_domain
     and org_rule.fact_key = pa.fact_key and org_rule.provider = psi.provider and org_rule.active
    left join public.identity_authority_rules global_rule
      on global_rule.organization_id is null and global_rule.fact_domain = pa.fact_domain
     and global_rule.fact_key = pa.fact_key and global_rule.provider = psi.provider and global_rule.active
    where pa.organization_id = p_organization_id and pa.person_id = p_person_id
      and pa.fact_domain = p_fact_domain and pa.fact_key = p_fact_key and pa.status = 'current'
    order by priority desc, coalesce(pa.source_timestamp, pa.ingested_at) desc, pa.id
  ), selected as (select * from ranked limit 1)
  select case when not exists (select 1 from selected) then null else jsonb_build_object(
    'effectiveValue', selected.asserted_value,
    'sourceProvider', selected.provider,
    'authorityReason', selected.authority_reason,
    'lastUpdatedAt', coalesce(selected.source_timestamp, selected.ingested_at),
    'provenanceRecordId', selected.id,
    'hasConflict', (select count(distinct asserted_value) > 1 from ranked),
    'hasOpenReview', exists (
      select 1 from public.identity_resolution_cases c
      join public.person_source_identities s on s.id = c.source_identity_id
      where c.organization_id = p_organization_id and c.review_status = 'open'
        and (c.candidate_person_id = p_person_id or s.person_id = p_person_id)
    )
  ) end from selected;
$$;

create or replace function public.list_platform_identity_review_cases(p_organization_id uuid)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'caseId', c.id,
    'organizationId', c.organization_id,
    'sourceIdentityId', c.source_identity_id,
    'provider', s.provider,
    'providerConnectionKey', s.provider_connection_key,
    'externalPersonId', s.external_person_id,
    'candidatePersonIds', c.evidence->'candidate_person_ids',
    'reasonCodes', to_jsonb(c.reason_codes),
    'confidence', c.confidence,
    'reviewStatus', c.review_status,
    'keepSeparate', exists (
      select 1 from public.identity_separation_rules sr
      where sr.organization_id = c.organization_id and sr.source_identity_id = c.source_identity_id and sr.active
    ),
    'updatedAt', c.updated_at
  ) order by c.updated_at desc), '[]'::jsonb)
  from public.identity_resolution_cases c
  join public.person_source_identities s on s.id = c.source_identity_id
  where c.organization_id = p_organization_id and c.review_status = 'open';
$$;

revoke all on function public.resolve_platform_organization_mapping(text, text, text) from public, anon, authenticated;
revoke all on function public.resolve_platform_person(jsonb) from public, anon, authenticated;
revoke all on function public.keep_platform_identities_separate(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.unlink_platform_source_identity(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.confirm_platform_identity_match(uuid, uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.claim_platform_account(uuid, uuid, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.get_platform_person_effective_value(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.list_platform_identity_review_cases(uuid) from public, anon, authenticated;
grant execute on function public.resolve_platform_organization_mapping(text, text, text) to service_role;
grant execute on function public.resolve_platform_person(jsonb) to service_role;
grant execute on function public.keep_platform_identities_separate(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.unlink_platform_source_identity(uuid, uuid, uuid) to service_role;
grant execute on function public.confirm_platform_identity_match(uuid, uuid, uuid, text, uuid) to service_role;
grant execute on function public.claim_platform_account(uuid, uuid, jsonb, uuid) to service_role;
grant execute on function public.get_platform_person_effective_value(uuid, uuid, text, text) to service_role;
grant execute on function public.list_platform_identity_review_cases(uuid) to service_role;

comment on table public.platform_organization_legacy_mappings is 'Explicit fail-closed mapping from legacy state/tenant identifiers to canonical organization UUIDs.';
comment on function public.resolve_platform_person(jsonb) is 'Atomic service-role provider person resolution and persistence; adapters supply normalized facts and never choose canonical people.';
comment on function public.get_platform_person_effective_value(uuid, uuid, text, text) is 'Provider-neutral effective value, authority reason, provenance, conflict, and review projection for future GameDay Truth UX.';
