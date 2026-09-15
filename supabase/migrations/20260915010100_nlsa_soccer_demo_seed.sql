-- Private NLSA soccer demo tenant. All names, locations, users, and records are
-- synthetic. This seed creates no auth.users rows and sends no invitations.

insert into public.organizations (
  id, name, slug, is_demo, primary_color, secondary_color, description
)
values (
  '6e1a0000-0000-4000-8000-000000000001',
  'New Lenox Soccer Association — Demo',
  'new-lenox-soccer-demo',
  true,
  '#047857',
  '#0f172a',
  'Synthetic private soccer operations demo. Contains no real NLSA member data.'
)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    is_demo = true,
    primary_color = excluded.primary_color,
    secondary_color = excluded.secondary_color,
    description = excluded.description;

insert into public.venues (
  id, organization_id, name, description, city, state, address, parking_note,
  status, is_demo, timezone, entrance_note, restroom_note, concession_note,
  emergency_information, public_status, public_status_message
)
values
  (
    '6e1a0000-0000-4000-8000-000000000021',
    '6e1a0000-0000-4000-8000-000000000001',
    'Lincoln-Way Soccer Complex — Demo',
    'Synthetic NLSA soccer complex.',
    'New Lenox', 'IL', 'Synthetic demo location',
    'North lot for Pitches 1–4; west lot for Pitches 5–8.',
    'Live', true, 'America/Chicago',
    'Follow synthetic demo signs to the central pavilion.',
    'Permanent restrooms beside the central pavilion.',
    'Central pavilion, 8:00 AM–3:00 PM.',
    'First aid at the operations tent between Pitches 3 and 5.',
    'open', 'Synthetic demo venue — verify your match card before arrival.'
  ),
  (
    '6e1a0000-0000-4000-8000-000000000022',
    '6e1a0000-0000-4000-8000-000000000001',
    'Haines Wayside Park — Demo',
    'Synthetic NLSA satellite soccer complex.',
    'New Lenox', 'IL', 'Synthetic demo location',
    'Enter from the east drive; overflow parking is signed.',
    'Live', true, 'America/Chicago',
    'Use the east entrance.',
    'Portable restrooms next to Pitch 10.',
    'Mobile concessions near the east entrance.',
    'The Pitch 10 field marshal holds the first-aid kit.',
    'open', 'Synthetic demo venue — verify your match card before arrival.'
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
    is_demo = true,
    timezone = excluded.timezone,
    entrance_note = excluded.entrance_note,
    restroom_note = excluded.restroom_note,
    concession_note = excluded.concession_note,
    emergency_information = excluded.emergency_information,
    public_status = excluded.public_status,
    public_status_message = excluded.public_status_message;

insert into public.fields (
  id, venue_id, organization_id, name, sport_type, surface, status,
  field_status, layout_role, age_group, is_demo, parent_visible,
  public_description, sort_order
)
values
  ('6e1a0000-0000-4000-8000-000000000031', '6e1a0000-0000-4000-8000-000000000021', '6e1a0000-0000-4000-8000-000000000001', 'Pitch 1', 'soccer', 'grass', 'Ready', 'open', 'standalone', 'U8', true, true, 'U8 soccer pitch.', 1),
  ('6e1a0000-0000-4000-8000-000000000032', '6e1a0000-0000-4000-8000-000000000021', '6e1a0000-0000-4000-8000-000000000001', 'Pitch 2', 'soccer', 'grass', 'Ready', 'open', 'standalone', 'U10', true, true, 'U10 soccer pitch.', 2),
  ('6e1a0000-0000-4000-8000-000000000033', '6e1a0000-0000-4000-8000-000000000021', '6e1a0000-0000-4000-8000-000000000001', 'Pitch 3', 'soccer', 'grass', 'Ready', 'open', 'standalone', 'U10/U12', true, true, 'U10 and U12 soccer pitch.', 3),
  ('6e1a0000-0000-4000-8000-000000000034', '6e1a0000-0000-4000-8000-000000000021', '6e1a0000-0000-4000-8000-000000000001', 'Pitch 4', 'soccer', 'grass', 'Ready', 'open', 'standalone', 'U12', true, true, 'U12 soccer pitch.', 4),
  ('6e1a0000-0000-4000-8000-000000000035', '6e1a0000-0000-4000-8000-000000000021', '6e1a0000-0000-4000-8000-000000000001', 'Pitch 5', 'soccer', 'turf', 'Ready', 'open', 'standalone', 'U12/U14', true, true, 'U12 and U14 soccer pitch.', 5),
  ('6e1a0000-0000-4000-8000-000000000040', '6e1a0000-0000-4000-8000-000000000022', '6e1a0000-0000-4000-8000-000000000001', 'Pitch 10', 'soccer', 'grass', 'Ready', 'open', 'standalone', 'U10', true, true, 'U10 soccer pitch.', 10)
on conflict (id) do update
set venue_id = excluded.venue_id,
    organization_id = excluded.organization_id,
    name = excluded.name,
    sport_type = 'soccer',
    surface = excluded.surface,
    status = excluded.status,
    field_status = excluded.field_status,
    layout_role = excluded.layout_role,
    age_group = excluded.age_group,
    is_demo = true,
    parent_visible = excluded.parent_visible,
    public_description = excluded.public_description,
    sort_order = excluded.sort_order;

-- Public identity shells are safe to seed: they do not create a login. Normal
-- Supabase invite acceptance later links auth_user_id by exact email.
insert into public.users (id, auth_user_id, email, display_name, user_status)
values
  ('6e1a0000-0000-4000-8000-000000000011', null, 'president@newlenox.soccer', 'NLSA Organization Owner', 'active'),
  ('6e1a0000-0000-4000-8000-000000000012', null, 'nlsa.staff@gamedayos.test', 'NLSA Operations Staff', 'active'),
  ('6e1a0000-0000-4000-8000-000000000013', null, 'nlsa.coach@gamedayos.test', 'NLSA U12 Coach', 'active'),
  ('6e1a0000-0000-4000-8000-000000000014', null, 'nlsa.parent@gamedayos.test', 'NLSA Parent / Guardian', 'active')
on conflict (email) do update
set display_name = excluded.display_name,
    user_status = 'active',
    updated_at = now();

with desired(email, role_key, scope_type, scope_id, assignment_id) as (
  values
    ('president@newlenox.soccer', 'organization_admin', 'organization', '6e1a0000-0000-4000-8000-000000000001'::uuid, '6e1a0000-0000-4000-8000-000000000051'::uuid),
    ('nlsa.staff@gamedayos.test', 'league_staff', 'organization', '6e1a0000-0000-4000-8000-000000000001'::uuid, '6e1a0000-0000-4000-8000-000000000052'::uuid),
    ('nlsa.coach@gamedayos.test', 'coach', 'team', '6e1a0000-0000-4000-8000-000000000101'::uuid, '6e1a0000-0000-4000-8000-000000000053'::uuid),
    ('nlsa.parent@gamedayos.test', 'parent', 'family', '6e1a0000-0000-4000-8000-000000000201'::uuid, '6e1a0000-0000-4000-8000-000000000054'::uuid)
)
insert into public.user_role_assignments (
  id, user_id, role_id, scope_type, scope_id, assignment_status, approval_notes
)
select d.assignment_id, u.id, r.id, d.scope_type, d.scope_id, 'approved',
       'Synthetic NLSA demo assignment; no production or external-system access.'
from desired d
join public.users u on lower(u.email) = lower(d.email)
join public.roles r on r.key = d.role_key
on conflict (id) do update
set user_id = excluded.user_id,
    role_id = excluded.role_id,
    scope_type = excluded.scope_type,
    scope_id = excluded.scope_id,
    assignment_status = 'approved',
    approval_notes = excluded.approval_notes;
