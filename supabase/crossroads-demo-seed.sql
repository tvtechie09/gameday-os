-- Crossroads Demo Seed
-- Seeds Wintrust Crossroads Sports Complex as a flagship demo venue.
-- Safe to rerun: records use stable UUIDs and ON CONFLICT/WHERE NOT EXISTS where possible.

create extension if not exists pgcrypto;

do $$
declare
  org_id uuid := '10000000-0000-0000-0000-000000000001';
  venue_id uuid := '20000000-0000-0000-0000-000000000001';
  zone_parking_id uuid := '30000000-0000-0000-0000-000000000001';
  zone_fields_id uuid := '30000000-0000-0000-0000-000000000002';
  zone_amenities_id uuid := '30000000-0000-0000-0000-000000000003';
  field_number integer;
  field_id uuid;
  layout_id uuid;
  surface_code text;
  surface_id uuid;
  surface_codes text[];
begin
  insert into public.organizations (id, name, slug)
  values (org_id, 'Crossroads Demo Organization', 'crossroads-demo')
  on conflict (id) do update set name = excluded.name, slug = excluded.slug;

  insert into public.venues (
    id,
    organization_id,
    name,
    description,
    address,
    city,
    state,
    parking_note,
    status,
    logo_url,
    banner_url,
    map_image_url,
    map_notes,
    primary_color,
    secondary_color
  )
  values (
    venue_id,
    org_id,
    'Wintrust Crossroads Sports Complex',
    'Flagship GameDay Venue demo complex for Venue Mode, Tournament Mode, Family Mode, and Venue Operations.',
    'New Lenox, IL',
    'New Lenox',
    'IL',
    'Demo parking lots: North Lot, West/Southwest Lot, and South Lot.',
    'Live',
    null,
    '/demo/crossroads-map.png',
    '/demo/crossroads-map.png',
    'Demo map includes fields, parking, concessions, batting cages, and storm water ponds as non-navigable landmarks.',
    '#166534',
    '#111827'
  )
  on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      address = excluded.address,
      city = excluded.city,
      state = excluded.state,
      parking_note = excluded.parking_note,
      status = excluded.status,
      banner_url = excluded.banner_url,
      map_image_url = excluded.map_image_url,
      map_notes = excluded.map_notes,
      primary_color = excluded.primary_color,
      secondary_color = excluded.secondary_color,
      updated_at = now();

  insert into public.venue_zones (id, organization_id, venue_id, name, description, zone_type, map_label, map_x, map_y, sort_order)
  values
    (zone_parking_id, org_id, venue_id, 'Parking', 'North, West/Southwest, and South parking lots.', 'parking', 'P', 28, 69, 1),
    (zone_fields_id, org_id, venue_id, 'Field Complex', 'Fields 1 through 9 and youth play surface configurations.', 'field_area', 'Fields', 66, 54, 2),
    (zone_amenities_id, org_id, venue_id, 'Amenities', 'Main Gate, beer garden, concessions, and batting cages.', 'support', 'Amenities', 49, 39, 3)
  on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      zone_type = excluded.zone_type,
      map_label = excluded.map_label,
      map_x = excluded.map_x,
      map_y = excluded.map_y,
      sort_order = excluded.sort_order,
      updated_at = now();

  for field_number in 1..9 loop
    field_id := ('40000000-0000-0000-0000-' || lpad(field_number::text, 12, '0'))::uuid;
    layout_id := ('50000000-0000-0000-0000-' || lpad(field_number::text, 12, '0'))::uuid;

    insert into public.fields (
      id,
      organization_id,
      venue_id,
      zone_id,
      name,
      sport_type,
      layout_role,
      field_status,
      status,
      resources
    )
    values (
      field_id,
      org_id,
      venue_id,
      zone_fields_id,
      'Field ' || field_number,
      'baseball',
      'parent',
      case when field_number = 8 then 'maintenance' else 'open' end,
      case when field_number = 8 then 'maintenance' else 'Ready' end,
      '[]'::jsonb
    )
    on conflict (id) do update
    set name = excluded.name,
        zone_id = excluded.zone_id,
        layout_role = excluded.layout_role,
        field_status = excluded.field_status,
        status = excluded.status,
        updated_at = now();

    insert into public.field_layouts (id, organization_id, venue_id, parent_field_id, layout_name, layout_type, is_active, notes)
    values (
      layout_id,
      org_id,
      venue_id,
      field_id,
      'Field ' || field_number || ' split layout',
      'split',
      true,
      'Crossroads demo layout for full-size field split into youth play surfaces.'
    )
    on conflict (id) do update
    set layout_name = excluded.layout_name,
        layout_type = excluded.layout_type,
        is_active = excluded.is_active,
        notes = excluded.notes,
        updated_at = now();

    surface_codes := case field_number
      when 1 then array['1A','1B']
      when 2 then array['2A','2B','2C','2D']
      when 3 then array['3A','3B','3C']
      when 4 then array['4A','4B','4C']
      when 5 then array['5A','5B']
      when 6 then array['6A','6B']
      when 7 then array['7A','7B']
      when 8 then array['8A','8B']
      when 9 then array['9A','9B']
      else array[]::text[]
    end;

    foreach surface_code in array surface_codes loop
      surface_id := (substr(md5('crossroads-' || surface_code), 1, 8) || '-' ||
                     substr(md5('crossroads-' || surface_code), 9, 4) || '-' ||
                     substr(md5('crossroads-' || surface_code), 13, 4) || '-' ||
                     substr(md5('crossroads-' || surface_code), 17, 4) || '-' ||
                     substr(md5('crossroads-' || surface_code), 21, 12))::uuid;

      insert into public.play_surfaces (
        id,
        organization_id,
        venue_id,
        zone_id,
        parent_field_id,
        field_id,
        name,
        surface_code,
        sport_types,
        surface_type,
        layout_role,
        status,
        map_label
      )
      values (
        surface_id,
        org_id,
        venue_id,
        zone_fields_id,
        field_id,
        null,
        'Field ' || field_number || ' ' || surface_code,
        surface_code,
        array['baseball'],
        'diamond',
        'split_child',
        case when surface_code = '4C' then 'delayed' when surface_code = '6B' then 'active' when field_number = 8 then 'maintenance' else 'open' end,
        surface_code
      )
      on conflict (id) do update
      set name = excluded.name,
          parent_field_id = excluded.parent_field_id,
          surface_code = excluded.surface_code,
          status = excluded.status,
          map_label = excluded.map_label,
          updated_at = now();

      insert into public.field_layout_surfaces (layout_id, play_surface_id)
      values (layout_id, surface_id)
      on conflict (layout_id, play_surface_id) do nothing;
    end loop;
  end loop;

  insert into public.venue_mode_endpoints (organization_id, venue_id, endpoint_type, provider_key, endpoint_label, endpoint_url, status, metadata)
  select org_id, venue_id, endpoint_type, provider_key, endpoint_label, endpoint_url, status, metadata
  from (values
    ('qr_entry', 'manual', 'Crossroads Venue QR', '/venue/crossroads', 'configured', '{"route_type":"venue"}'::jsonb),
    ('equipment', 'future_provider', 'Scoreboard Endpoint Placeholder', null, 'not_configured', '{"vendor":"future"}'::jsonb),
    ('equipment', 'future_provider', 'Speaker Endpoint Placeholder', null, 'not_configured', '{"vendor":"future"}'::jsonb),
    ('equipment', 'future_provider', 'Camera/Security Endpoint Placeholder', null, 'not_configured', '{"vendor":"future"}'::jsonb),
    ('equipment', 'future_provider', 'Network Endpoint Placeholder', null, 'configured', '{"vendor":"future"}'::jsonb),
    ('equipment', 'future_provider', 'Lights Endpoint Placeholder', null, 'not_configured', '{"vendor":"future"}'::jsonb)
  ) as endpoint(endpoint_type, provider_key, endpoint_label, endpoint_url, status, metadata)
  where not exists (
    select 1 from public.venue_mode_endpoints existing
    where existing.venue_id = venue_id and existing.endpoint_label = endpoint.endpoint_label
  );

  insert into public.sessions (
    id,
    organization_id,
    field_id,
    play_surface_id,
    title,
    sport_type,
    home_team,
    away_team,
    start_time,
    status,
    game_status,
    home_score,
    away_score,
    inning,
    inning_half,
    balls,
    strikes,
    outs,
    notes
  )
  select
    session_id,
    org_id,
    ('40000000-0000-0000-0000-' || lpad(field_number::text, 12, '0'))::uuid,
    (substr(md5('crossroads-' || surface_code), 1, 8) || '-' ||
     substr(md5('crossroads-' || surface_code), 9, 4) || '-' ||
     substr(md5('crossroads-' || surface_code), 13, 4) || '-' ||
     substr(md5('crossroads-' || surface_code), 17, 4) || '-' ||
     substr(md5('crossroads-' || surface_code), 21, 12))::uuid,
    home_team || ' vs ' || away_team,
    'baseball',
    home_team,
    away_team,
    start_time,
    db_status,
    db_status,
    home_score,
    away_score,
    inning,
    'top',
    0,
    0,
    0,
    'Crossroads demo status: ' || demo_status || '. Next game: ' || next_game || '.'
  from (values
    ('60000000-0000-0000-0000-000000000001'::uuid, 1, '1A', 'Falcons', 'Storm', '2026-06-27 08:30:00-05'::timestamptz, 'scheduled', 'scheduled', 0, 0, 1, 'Hawks vs Wolves'),
    ('60000000-0000-0000-0000-000000000002'::uuid, 3, '3A', 'Celtics', 'Panthers', '2026-06-27 10:30:00-05'::timestamptz, 'live', 'active', 3, 2, 4, 'Warriors vs Hawks'),
    ('60000000-0000-0000-0000-000000000003'::uuid, 4, '4C', 'Chargers', 'Bears', '2026-06-27 12:30:00-05'::timestamptz, 'delayed', 'scheduled', 0, 0, 1, 'Comets vs Cyclones'),
    ('60000000-0000-0000-0000-000000000004'::uuid, 6, '6B', 'Cubs', 'Saints', '2026-06-27 14:00:00-05'::timestamptz, 'live', 'active', 5, 4, 5, 'Express vs Crush'),
    ('60000000-0000-0000-0000-000000000005'::uuid, 8, '8A', 'Spartans', 'Outlaws', '2026-06-27 15:00:00-05'::timestamptz, 'maintenance', 'scheduled', 0, 0, 1, 'Pending field release'),
    ('60000000-0000-0000-0000-000000000006'::uuid, 9, '9B', 'Pride', 'Fire', '2026-06-27 15:30:00-05'::timestamptz, 'scheduled', 'scheduled', 0, 0, 1, 'Nightcap TBD')
  ) as demo_sessions(session_id, field_number, surface_code, home_team, away_team, start_time, demo_status, db_status, home_score, away_score, inning, next_game)
  on conflict (id) do update
  set play_surface_id = excluded.play_surface_id,
      title = excluded.title,
      home_team = excluded.home_team,
      away_team = excluded.away_team,
      start_time = excluded.start_time,
      status = excluded.status,
      game_status = excluded.game_status,
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      inning = excluded.inning,
      notes = excluded.notes,
      updated_at = now();
end $$;
