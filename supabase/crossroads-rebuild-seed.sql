-- =====================================================================
-- Crossroads Venue Rebuild Seed
-- Wintrust Crossroads Sports Complex, New Lenox, IL (flagship demo venue)
-- =====================================================================
-- Rebuilds the Crossroads venue end-to-end against the LIVE Supabase
-- project (ekkmflksqerdhutqxeii). This is demo/seed data and is NOT run
-- as a numbered migration (matches the existing supabase/*-seed.sql
-- convention). Apply via the Supabase SQL editor or psql with the
-- service role. Requires migration 202607080001 (field QR columns +
-- cameras/audio_systems/amenities/maintenance_records) to be applied first.
--
-- Safe to re-run: it fully clears Crossroads-owned rows for the target
-- venue and rebuilds them with stable, slug-addressable field records.
-- =====================================================================

create extension if not exists pgcrypto;

do $$
declare
  v_venue_id uuid := 'a8235a4f-c5bf-4f79-b527-853d15f6ae17';       -- existing live Crossroads venue
  v_org_id   uuid := 'c1000000-0000-4000-a000-000000000001';       -- new standalone Crossroads org
  v_old_field_id uuid := '66954416-e942-460d-9a07-3f260b21f8f5';   -- broken "Crossroads Field"
  v_old_scoreboard_id uuid := 'db3e0e75-57ec-4641-8b94-101cc546f09e';
  v_tournament_id uuid := 'c2000000-0000-4000-a000-000000000001';
  v_base_url text := 'https://gameday-os.vercel.app';

  n int;
  code text;
  code_k int;
  child_codes text[];
  slug text;
  child_slug text;
  parent_id uuid;
  child_id uuid;
  p_sport text;
  p_status text;
  c_status text;
  c_layout text;
  c_age text;
  px numeric;
  py numeric;
begin
  -- ---------------------------------------------------------------
  -- 0. New standalone organization (no affiliation to Illinois Celtics)
  -- ---------------------------------------------------------------
  insert into public.organizations (id, name, slug, primary_color, secondary_color, website_url, description)
  values (
    v_org_id,
    'Wintrust Crossroads Sports Complex',
    'crossroads-sports-complex',
    '#1B2A4A', '#C9A24B',
    'https://newlenoxcrossroads.com',
    '100-acre sports complex in New Lenox, IL. Operated by the Village of New Lenox, managed by Sports Facilities Companies, naming rights by Wintrust Financial.'
  )
  on conflict (id) do update
    set name = excluded.name,
        slug = excluded.slug,
        primary_color = excluded.primary_color,
        secondary_color = excluded.secondary_color,
        website_url = excluded.website_url,
        description = excluded.description;

  -- ---------------------------------------------------------------
  -- 1. Clean slate for the Crossroads venue
  -- ---------------------------------------------------------------
  -- Remove the specific broken records first (explicit per spec).
  delete from public.scoreboard_profiles where id = v_old_scoreboard_id;
  delete from public.fields where id = v_old_field_id;

  -- Clear all Crossroads-owned operational rows so the rebuild is clean/rerunnable.
  delete from public.maintenance_records where venue_id = v_venue_id;
  delete from public.cameras where venue_id = v_venue_id;
  delete from public.audio_systems where venue_id = v_venue_id;
  delete from public.amenities where venue_id = v_venue_id;
  delete from public.scoreboard_profiles where venue_id = v_venue_id;
  delete from public.resources where venue_id = v_venue_id;
  delete from public.sponsor_assignments where venue_id = v_venue_id
     or field_id in (select id from public.fields where venue_id = v_venue_id)
     or session_id in (select s.id from public.sessions s join public.fields f on f.id = s.field_id where f.venue_id = v_venue_id);
  delete from public.alerts where venue_id = v_venue_id;
  delete from public.sessions where field_id in (select id from public.fields where venue_id = v_venue_id);
  delete from public.play_surfaces where venue_id = v_venue_id;
  delete from public.field_layouts where venue_id = v_venue_id;
  -- Delete child fields before parents to respect the self-referential FK.
  delete from public.fields where venue_id = v_venue_id and parent_field_id is not null;
  delete from public.fields where venue_id = v_venue_id;
  -- Remove Crossroads sponsors (rebuilt below).
  delete from public.sponsors where organization_id = v_org_id;

  -- ---------------------------------------------------------------
  -- 2. Venue record (reassigned to the new standalone org)
  -- ---------------------------------------------------------------
  insert into public.venues (
    id, organization_id, name, description, city, state, address,
    parking_note, status, map_notes, primary_color, secondary_color, updated_at
  )
  values (
    v_venue_id, v_org_id, 'Wintrust Crossroads Sports Complex',
    '100-acre sports complex with nine full-size (400'') convertible turf baseball/softball fields, home to local New Lenox leagues and regional and national youth tournaments.',
    'New Lenox', 'IL', '520 Cedar Crossings Dr, New Lenox, IL 60451',
    '1,300 free parking spaces on-site', 'Live',
    'Fields 1-9 arranged in three rows of three around the central walkway. Concessions and the Pepsi Play Area sit at the north end; the Coors Light Chill Zone anchors the south end.',
    '#1B2A4A', '#C9A24B', now()
  )
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        name = excluded.name,
        description = excluded.description,
        city = excluded.city,
        state = excluded.state,
        address = excluded.address,
        parking_note = excluded.parking_note,
        status = excluded.status,
        map_notes = excluded.map_notes,
        primary_color = excluded.primary_color,
        secondary_color = excluded.secondary_color,
        updated_at = now();

  -- ---------------------------------------------------------------
  -- 3. Nine parent fields + A/B/C youth surfaces (22 children)
  --    Grid: 3 rows of 3.  Parents = layout_type 'Full'.
  -- ---------------------------------------------------------------
  -- Deterministic field UUIDs let the hosted QR PNGs encode the canonical
  -- public route (/fields/{uuid}) without a slug-resolving redirect. Parents:
  -- c4a00000-...-00000000000N (N = field number). Children:
  -- c4b0000N-...-00000000000K (K = 1/2/3 for A/B/C).
  for n in 1..9 loop
    slug := 'crossroads-field-' || n;
    parent_id := ('c4a00000-0000-4000-a000-00000000000' || n)::uuid;
    p_sport := case when n <= 6 then 'baseball' else 'softball' end;
    p_status := case when n = 8 then 'maintenance'    -- Field 8 in maintenance
                     when n = 3 then 'delayed'         -- Field 3 weather hold
                     else 'open' end;
    px := (case ((n - 1) % 3) when 0 then 25 when 1 then 50 else 75 end);
    py := (case ((n - 1) / 3) when 0 then 25 when 1 then 50 else 75 end);

    insert into public.fields (
      id, organization_id, venue_id, name, sport_type, layout_role, surface_code,
      layout_type, age_group, map_label, map_x, map_y, surface, status, field_status,
      qr_code_slug, qr_code_url, resources
    )
    values (
      parent_id, v_org_id, v_venue_id, 'Field ' || n, p_sport, 'parent', null,
      'Full', '14U+', 'F' || n, px, py, 'Synthetic turf (400'')', p_status, p_status,
      slug, v_base_url || '/fields/' || parent_id,
      '["Bases","Pitching rubber","Foul poles","Field drag/groomer","Portable mound"]'::jsonb
    );

    child_codes := case when n <= 4 then array['A','B','C'] else array['A','B'] end;

    foreach code in array child_codes loop
      child_slug := slug || lower(code);
      code_k := case code when 'A' then 1 when 'B' then 2 else 3 end;
      child_id := ('c4b0000' || n || '-0000-4000-a000-00000000000' || code_k)::uuid;
      c_age := case code when 'A' then '11U-12U' when 'B' then '9U-10U' else '6U-8U' end;
      -- Demonstrate all four layout types somewhere in the venue.
      c_layout := case
        when n = 1 and code = 'A' then 'Tournament'
        when n = 9 and code = 'B' then 'Practice'
        else 'Split' end;
      c_status := case
        when n = 8 then 'maintenance'
        when n = 3 and code = 'A' then 'delayed'
        else 'open' end;

      insert into public.fields (
        id, organization_id, venue_id, parent_field_id, name, sport_type, layout_role,
        surface_code, layout_type, age_group, map_label, map_x, map_y, surface,
        status, field_status, qr_code_slug, qr_code_url, resources
      )
      values (
        child_id, v_org_id, v_venue_id, parent_id,
        'Field ' || n || code, p_sport, 'split_child', code, c_layout, c_age,
        'F' || n || code,
        px + (case code when 'A' then -6 when 'B' then 0 else 6 end),
        py + 7, 'Youth diamond (turf)', c_status, c_status,
        child_slug, v_base_url || '/fields/' || child_id,
        '["Bases","Pitching rubber","Youth mound"]'::jsonb
      );
    end loop;
  end loop;

  -- ---------------------------------------------------------------
  -- 4. Tournament
  -- ---------------------------------------------------------------
  insert into public.tournaments (id, organization_id, name, description, start_date, end_date, website_url)
  values (
    v_tournament_id, v_org_id, 'New Lenox Summer Classic',
    'Regional youth baseball & softball tournament hosted at Wintrust Crossroads Sports Complex.',
    '2026-07-11', '2026-07-12', 'https://newlenoxcrossroads.com'
  )
  on conflict (id) do update set name = excluded.name, updated_at = now();

  -- ---------------------------------------------------------------
  -- 5. Saturday tournament sessions (2026-07-11, Central time)
  -- ---------------------------------------------------------------
  insert into public.sessions (
    organization_id, field_id, tournament_id, title, sport_type, home_team, away_team,
    start_time, end_time, status, game_status, home_score, away_score,
    inning, inning_half, balls, strikes, outs, notes
  )
  select
    v_org_id,
    (select id from public.fields where venue_id = v_venue_id and qr_code_slug = t.slug),
    case when t.in_tourney then v_tournament_id else null end,
    t.home || ' vs ' || t.away, t.sport, t.home, t.away,
    t.start_ts, t.start_ts + interval '2 hours', t.status, t.status,
    t.hs, t.as_, t.inning, t.half, t.balls, t.strikes, t.outs, t.notes
  from (values
    -- Completed earlier today (finals)
    ('crossroads-field-1',  'Illinois Sparks 12U',    'Joliet Bulldogs 14U',    '2026-07-11 08:00:00-05'::timestamptz, 'final',     7, 4, 7, 'bottom', 0,0,0, true,  'Pool play game 1'),
    ('crossroads-field-2',  'New Lenox Renegades 10U','Mokena Storm 10U',       '2026-07-11 08:00:00-05'::timestamptz, 'final',     3, 6, 7, 'bottom', 0,0,0, true,  'Pool play game 1'),
    ('crossroads-field-4',  'Frankfort Falcons 12U',  'Orland Park Pioneers 12U','2026-07-11 08:00:00-05'::timestamptz,'final',     5, 5, 7, 'bottom', 0,0,0, true,  'Pool play game 1 (tie)'),
    ('crossroads-field-6',  'Tinley Park Titans 14U', 'Shorewood Sharks 14U',   '2026-07-11 08:00:00-05'::timestamptz, 'final',    10, 2, 6, 'bottom', 0,0,0, true,  'Run rule'),
    -- In progress now (active)
    ('crossroads-field-1',  'Homer Glen Hawks 10U',   'Lockport Lightning 12U', '2026-07-11 10:30:00-05'::timestamptz, 'active',    2, 1, 3, 'top',    1,2,1, true,  'Live'),
    ('crossroads-field-2',  'Manhattan Miners 10U',   'Plainfield Pride 12U',   '2026-07-11 10:30:00-05'::timestamptz, 'active',    4, 4, 5, 'bottom', 3,1,2, true,  'Live'),
    ('crossroads-field-5',  'Illinois Sparks 12U',    'Tinley Park Titans 14U', '2026-07-11 10:30:00-05'::timestamptz, 'active',    1, 0, 2, 'top',    0,0,0, true,  'Live'),
    ('crossroads-field-6',  'Joliet Bulldogs 14U',    'Frankfort Falcons 12U',  '2026-07-11 10:30:00-05'::timestamptz, 'active',    6, 5, 6, 'top',    2,2,1, true,  'Live'),
    ('crossroads-field-9',  'Mokena Storm 10U',       'Shorewood Sharks 14U',   '2026-07-11 10:30:00-05'::timestamptz, 'active',    0, 3, 4, 'bottom', 1,0,2, true,  'Live'),
    -- Weather hold on Field 3 (delayed -> kept scheduled, tied to weather alert)
    ('crossroads-field-3',  'New Lenox Renegades 10U','Orland Park Pioneers 12U','2026-07-11 13:00:00-05'::timestamptz,'scheduled', 0, 0, 1, 'top',    0,0,0, true,  'Weather hold - lightning within 8 miles'),
    -- Next up (scheduled)
    ('crossroads-field-1',  'Plainfield Pride 12U',   'Manhattan Miners 10U',   '2026-07-11 13:00:00-05'::timestamptz, 'scheduled', 0, 0, 1, 'top',    0,0,0, true,  'Bracket play'),
    ('crossroads-field-2',  'Lockport Lightning 12U', 'Homer Glen Hawks 10U',   '2026-07-11 13:00:00-05'::timestamptz, 'scheduled', 0, 0, 1, 'top',    0,0,0, true,  'Bracket play'),
    ('crossroads-field-4',  'Shorewood Sharks 14U',   'Joliet Bulldogs 14U',    '2026-07-11 13:00:00-05'::timestamptz, 'scheduled', 0, 0, 1, 'top',    0,0,0, true,  'Bracket play'),
    ('crossroads-field-5',  'Frankfort Falcons 12U',  'Illinois Sparks 12U',    '2026-07-11 13:00:00-05'::timestamptz, 'scheduled', 0, 0, 1, 'top',    0,0,0, true,  'Bracket play'),
    ('crossroads-field-7',  'Tinley Park Titans 14U', 'Mokena Storm 10U',       '2026-07-11 13:00:00-05'::timestamptz, 'scheduled', 0, 0, 1, 'top',    0,0,0, true,  'Bracket play'),
    ('crossroads-field-1',  'Illinois Sparks 12U',    'Shorewood Sharks 14U',   '2026-07-11 15:30:00-05'::timestamptz, 'scheduled', 0, 0, 1, 'top',    0,0,0, true,  'Championship bracket'),
    ('crossroads-field-2',  'Joliet Bulldogs 14U',    'Tinley Park Titans 14U', '2026-07-11 15:30:00-05'::timestamptz, 'scheduled', 0, 0, 1, 'top',    0,0,0, true,  'Championship bracket'),
    ('crossroads-field-9',  'Homer Glen Hawks 10U',   'Plainfield Pride 12U',   '2026-07-11 15:30:00-05'::timestamptz, 'scheduled', 0, 0, 1, 'top',    0,0,0, false, 'Consolation')
  ) as t(slug, home, away, start_ts, status, hs, as_, inning, half, balls, strikes, outs, in_tourney, notes);

  -- ---------------------------------------------------------------
  -- 6. Alerts (venue-wide + field-specific)
  -- ---------------------------------------------------------------
  insert into public.alerts (
    organization_id, venue_id, field_id, tournament_id, title, message, alert_type,
    alert_scope, alert_priority, alert_visibility, start_time, end_time, is_active
  )
  select v_org_id, v_venue_id,
    case when a.slug is null then null else (select id from public.fields where venue_id = v_venue_id and qr_code_slug = a.slug) end,
    case when a.scope = 'tournament' then v_tournament_id else null end,
    a.title, a.message, a.atype, a.scope, a.priority, a.visibility, a.starts, a.ends, true
  from (values
    (null,                 'Parking Lot C closed', 'Parking Lot C is temporarily closed for resurfacing. Please use the North and South lots.', 'parking', 'venue', 'normal', 'public', '2026-07-11 06:00:00-05'::timestamptz, '2026-07-11 22:00:00-05'::timestamptz),
    (null,                 'Heat advisory in effect', 'Hydration stations are open near each concession stand. Please monitor athletes for heat stress.', 'weather', 'venue', 'high', 'public', '2026-07-11 10:00:00-05'::timestamptz, '2026-07-11 18:00:00-05'::timestamptz),
    ('crossroads-field-3', 'Field 3 weather hold', 'Play suspended on Field 3 due to lightning within 8 miles. Resumption pending 30-minute all-clear.', 'weather', 'field', 'urgent', 'public', '2026-07-11 12:45:00-05'::timestamptz, '2026-07-11 15:00:00-05'::timestamptz),
    ('crossroads-field-8', 'Field 8 maintenance', 'Field 8 is closed for turf infill top-up and drainage inspection. Games relocated to Field 7.', 'field_closure', 'field', 'high', 'public', '2026-07-11 06:00:00-05'::timestamptz, '2026-07-11 20:00:00-05'::timestamptz),
    ('crossroads-field-1', 'Championship on Field 1', 'Field 1 hosts the 12U championship at 3:30 PM. Grandstand seating fills early.', 'info', 'field', 'normal', 'public', '2026-07-11 14:30:00-05'::timestamptz, '2026-07-11 17:30:00-05'::timestamptz)
  ) as a(slug, title, message, atype, scope, priority, visibility, starts, ends);

  -- ---------------------------------------------------------------
  -- 7. Sponsors (tier encoded in description; schema has no tier column)
  -- ---------------------------------------------------------------
  insert into public.sponsors (id, organization_id, name, website_url, description)
  values
    ('c3000000-0000-4000-a000-000000000001', v_org_id, 'Wintrust Financial',   'https://www.wintrust.com',        'Title sponsor (naming rights). Package: Title. Display priority 1.'),
    ('c3000000-0000-4000-a000-000000000002', v_org_id, 'Pepsi',                'https://www.pepsi.com',           'Gold sponsor. Presenting sponsor of the Pepsi Play Area.'),
    ('c3000000-0000-4000-a000-000000000003', v_org_id, 'Coors Light',          'https://www.coorslight.com',      'Gold sponsor. Presenting sponsor of the Coors Light Chill Zone.'),
    ('c3000000-0000-4000-a000-000000000004', v_org_id, 'Silver Cross Hospital','https://www.silvercross.org',     'Silver sponsor. Health & Safety Partner (adjacent to the complex).'),
    ('c3000000-0000-4000-a000-000000000005', v_org_id, 'Scheels All Sports',   'https://www.scheels.com',         'Silver sponsor. Official sporting goods retailer.'),
    ('c3000000-0000-4000-a000-000000000006', v_org_id, 'NuMark Credit Union',  'https://www.numarkcu.org',        'Bronze sponsor. Regional community banking partner.');

  -- Sponsor assignments (venue + field placements)
  insert into public.sponsor_assignments (sponsor_id, assignment_type, venue_id, field_id, placement_label)
  select s.sid, 'venue', v_venue_id, null, s.placement
  from (values
    ('c3000000-0000-4000-a000-000000000001'::uuid, 'Presented By'),
    ('c3000000-0000-4000-a000-000000000004'::uuid, 'Featured Sponsor')
  ) as s(sid, placement);

  insert into public.sponsor_assignments (sponsor_id, assignment_type, venue_id, field_id, placement_label)
  select fa.sid, 'field', null,
    (select id from public.fields where venue_id = v_venue_id and qr_code_slug = fa.slug), fa.placement
  from (values
    ('c3000000-0000-4000-a000-000000000001'::uuid, 'crossroads-field-1', 'Field Sponsor'),
    ('c3000000-0000-4000-a000-000000000002'::uuid, 'crossroads-field-2', 'Field Sponsor'),
    ('c3000000-0000-4000-a000-000000000005'::uuid, 'crossroads-field-5', 'Field Sponsor'),
    ('c3000000-0000-4000-a000-000000000006'::uuid, 'crossroads-field-7', 'Field Sponsor')
  ) as fa(sid, slug, placement);

  -- ---------------------------------------------------------------
  -- 8. Amenities
  -- ---------------------------------------------------------------
  insert into public.amenities (organization_id, venue_id, sponsor_id, name, amenity_type, description, map_x, map_y, status)
  values
    (v_org_id, v_venue_id, null, 'Welcome Center', 'welcome_center', 'Guest services, will-call, and lost & found.', 50, 8, 'open'),
    (v_org_id, v_venue_id, null, 'North Concession Stand', 'concession', 'Full-service concessions at the north walkway.', 42, 12, 'open'),
    (v_org_id, v_venue_id, null, 'South Concession Stand', 'concession', 'Full-service concessions near the south fields.', 58, 90, 'open'),
    (v_org_id, v_venue_id, 'c3000000-0000-4000-a000-000000000002', 'Pepsi Play Area', 'playground', 'Sponsored playground for younger siblings.', 35, 15, 'open'),
    (v_org_id, v_venue_id, 'c3000000-0000-4000-a000-000000000003', 'Coors Light Chill Zone', 'beer_garden', 'Adult beverage garden and shaded seating at the south end.', 62, 88, 'seasonal'),
    (v_org_id, v_venue_id, null, 'Batting Cage 1', 'batting_cage', 'Two-tunnel warm-up batting cage (east).', 80, 40, 'open'),
    (v_org_id, v_venue_id, null, 'Batting Cage 2', 'batting_cage', 'Two-tunnel warm-up batting cage (west).', 20, 40, 'open'),
    (v_org_id, v_venue_id, null, 'Main Parking (1,300 spaces)', 'parking', '1,300 free parking spaces across North, South, and West lots.', 12, 70, 'open');

  -- ---------------------------------------------------------------
  -- 9. Scoreboards (Daktronics All Sport 5000, one per parent field)
  -- ---------------------------------------------------------------
  insert into public.scoreboard_profiles (
    organization_id, venue_id, field_id, manufacturer, model, connection_type,
    integration_mode, scoreboard_status, controller_location, notes
  )
  select v_org_id, v_venue_id,
    (select id from public.fields where venue_id = v_venue_id and qr_code_slug = 'crossroads-field-' || g),
    'Daktronics', 'All Sport 5000',
    case when g <= 3 then 'network' else 'manual' end,
    case when g <= 3 then 'read_only' else 'manual_only' end,
    case when g <= 3 then 'active' else 'not_configured' end,
    'Field ' || g || ' press box',
    'Daktronics All Sport 5000 scoreboard for Field ' || g || '.'
  from generate_series(1, 9) as g;

  -- ---------------------------------------------------------------
  -- 10. Cameras (common-area fixed + marquee-field PTZ)
  -- ---------------------------------------------------------------
  insert into public.cameras (organization_id, venue_id, field_id, name, camera_type, location_description, stream_status, manufacturer, model)
  values
    (v_org_id, v_venue_id, null, 'Main Entrance Camera', 'fixed', 'Welcome center / main gate', 'online', 'Axis', 'P3265-LVE'),
    (v_org_id, v_venue_id, null, 'North Parking Camera', 'fixed', 'North parking lot', 'online', 'Axis', 'P3265-LVE'),
    (v_org_id, v_venue_id, null, 'Central Walkway Camera', 'fixed', 'Central concourse walkway', 'degraded', 'Axis', 'P3265-LVE');

  insert into public.cameras (organization_id, venue_id, field_id, name, camera_type, location_description, stream_status, manufacturer, model)
  select v_org_id, v_venue_id,
    (select id from public.fields where venue_id = v_venue_id and qr_code_slug = 'crossroads-field-' || c.n),
    'Field ' || c.n || ' Broadcast Camera', 'PTZ', 'Press box overlooking Field ' || c.n, c.st, 'Panasonic', 'AW-UE150'
  from (values (1,'online'), (2,'online'), (6,'offline')) as c(n, st);

  -- ---------------------------------------------------------------
  -- 11. Audio systems (PA per parent field + venue-wide)
  -- ---------------------------------------------------------------
  insert into public.audio_systems (organization_id, venue_id, field_id, name, system_type, manufacturer, model, status)
  select v_org_id, v_venue_id,
    (select id from public.fields where venue_id = v_venue_id and qr_code_slug = 'crossroads-field-' || g),
    'Field ' || g || ' PA', 'PA', 'JBL', 'Commercial CBT',
    case when g <= 3 then 'active' else 'configured' end
  from generate_series(1, 9) as g;

  insert into public.audio_systems (organization_id, venue_id, field_id, name, system_type, manufacturer, model, status)
  values (v_org_id, v_venue_id, null, 'Venue-wide Announcement System', 'press_box', 'Bose', 'FreeSpace', 'active');

  -- ---------------------------------------------------------------
  -- 12. Resources (equipment per parent field)
  -- ---------------------------------------------------------------
  insert into public.resources (organization_id, venue_id, field_id, resource_name, resource_type, manufacturer, model, status, notes)
  select v_org_id, v_venue_id,
    (select id from public.fields where venue_id = v_venue_id and qr_code_slug = 'crossroads-field-' || g),
    r.rname, r.rtype, r.mfr, r.model,
    case when g = 8 then 'maintenance' else 'active' end, r.rname || ' for Field ' || g
  from generate_series(1, 9) as g
  cross join (values
    ('Base Set',        'other',      'Schutt',      'Hollywood'),
    ('Pitching Rubber', 'other',      'Jaypro',      'Pro'),
    ('Foul Poles',      'other',      'BSN',         'Fibreglass'),
    ('Field Groomer',   'other',      'ABI',         'Force')
  ) as r(rname, rtype, mfr, model);

  -- ---------------------------------------------------------------
  -- 13. Maintenance records
  -- ---------------------------------------------------------------
  insert into public.maintenance_records (organization_id, venue_id, field_id, maintenance_type, status, scheduled_date, completed_date, performed_by, notes)
  select v_org_id, v_venue_id,
    case when m.slug is null then null else (select id from public.fields where venue_id = v_venue_id and qr_code_slug = m.slug) end,
    m.mtype, m.status, m.sched, m.done, m.by, m.notes
  from (values
    ('crossroads-field-8', 'turf_infill',    'in_progress', '2026-07-11'::date, null,               'SFC Grounds Crew', 'Infill top-up and drainage inspection in progress; field closed.'),
    ('crossroads-field-1', 'inspection',     'completed',   '2026-07-10'::date, '2026-07-10'::date, 'SFC Grounds Crew', 'Pre-tournament turf and mound inspection passed.'),
    ('crossroads-field-2', 'inspection',     'completed',   '2026-07-10'::date, '2026-07-10'::date, 'SFC Grounds Crew', 'Pre-tournament turf and mound inspection passed.'),
    ('crossroads-field-6', 'lining',         'completed',   '2026-07-10'::date, '2026-07-10'::date, 'SFC Grounds Crew', 'Batter box and baseline lining refreshed.'),
    (null,                 'mowing',         'scheduled',   '2026-07-14'::date, null,               'SFC Grounds Crew', 'Complex-wide multipurpose turf mowing (post-tournament).'),
    ('crossroads-field-3', 'drainage_check', 'scheduled',   '2026-07-13'::date, null,               'SFC Grounds Crew', 'Follow-up drainage check after weather hold.')
  ) as m(slug, mtype, status, sched, done, by, notes);

end $$;
