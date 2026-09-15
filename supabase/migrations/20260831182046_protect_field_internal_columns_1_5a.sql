-- Family 1.5A defense in depth: preserve public field/QR reads without
-- granting browser roles access to internal staff notes, opaque resources,
-- updater identities, or provider/location metadata.

revoke select on table public.fields from public, anon, authenticated;

grant select (
  id,
  venue_id,
  name,
  sport_type,
  surface,
  status,
  created_at,
  updated_at,
  map_label,
  map_x,
  map_y,
  field_status,
  organization_id,
  zone_id,
  parent_field_id,
  layout_role,
  surface_code,
  layout_type,
  age_group,
  qr_code_url,
  qr_code_slug,
  is_demo,
  status_reason,
  status_effective_at,
  status_updated_at,
  expected_recheck_at,
  parent_visible,
  public_description,
  latitude,
  longitude,
  address,
  accessibility_notes,
  sort_order,
  status_expires_at
) on public.fields to anon, authenticated;

comment on column public.fields.operational_notes is
  'Private venue operations data. Never grant to browser roles or expose in parent/public projections.';
comment on column public.fields.location_metadata is
  'Private provider/location metadata. Never grant to browser roles or expose in parent/public projections.';
