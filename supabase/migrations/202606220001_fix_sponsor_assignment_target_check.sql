alter table public.sponsor_assignments
  drop constraint if exists sponsor_assignments_target_check;

alter table public.sponsor_assignments
  add constraint sponsor_assignments_target_check check (
    (assignment_type = 'venue' and venue_id is not null and field_id is null and session_id is null)
    or (assignment_type = 'field' and venue_id is null and field_id is not null and session_id is null)
    or (assignment_type = 'session' and venue_id is null and field_id is null and session_id is not null)
  );
