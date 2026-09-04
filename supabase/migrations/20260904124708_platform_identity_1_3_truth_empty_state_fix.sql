-- Forward-only normalization for people with no supported active assertions.
-- Preserve the staged 1.3 implementation as the internal raw calculation and
-- keep the public service contract array-shaped for UI empty states.

alter function public.get_platform_person_truth_summary(uuid, uuid, integer)
  rename to get_platform_person_truth_summary_raw;

create or replace function public.get_platform_person_truth_summary(
  p_organization_id uuid,
  p_person_id uuid,
  p_history_limit integer default 5
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with raw as (
    select public.get_platform_person_truth_summary_raw(
      p_organization_id, p_person_id, p_history_limit
    ) as value
  )
  select case when value is null then null
    else jsonb_set(value, '{fields}', coalesce(value->'fields', '[]'::jsonb), true)
  end
  from raw;
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

revoke all on function public.get_platform_person_truth_summary_raw(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.get_platform_person_truth_summary(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.get_platform_person_effective_value(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.get_platform_person_truth_summary_raw(uuid, uuid, integer) to service_role;
grant execute on function public.get_platform_person_truth_summary(uuid, uuid, integer) to service_role;
grant execute on function public.get_platform_person_effective_value(uuid, uuid, text, text) to service_role;

comment on function public.get_platform_person_truth_summary_raw(uuid, uuid, integer) is
  'Internal staged 1.3 Truth calculation. Use the normalized summary wrapper.';
comment on function public.get_platform_person_truth_summary(uuid, uuid, integer) is
  'Bounded organization-scoped GameDay Truth summary with array-shaped empty states; service-only.';
