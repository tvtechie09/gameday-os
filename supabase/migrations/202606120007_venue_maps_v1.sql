alter table public.venues
  add column if not exists map_image_url text,
  add column if not exists map_notes text;

alter table public.fields
  add column if not exists map_label text,
  add column if not exists map_x numeric,
  add column if not exists map_y numeric;

alter table public.fields
  drop constraint if exists fields_map_x_check;

alter table public.fields
  drop constraint if exists fields_map_y_check;

alter table public.fields
  add constraint fields_map_x_check check (map_x is null or (map_x >= 0 and map_x <= 100));

alter table public.fields
  add constraint fields_map_y_check check (map_y is null or (map_y >= 0 and map_y <= 100));
