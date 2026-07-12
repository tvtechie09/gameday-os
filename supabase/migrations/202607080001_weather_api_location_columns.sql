-- Weather API support: preserve existing data and add optional venue location fields.
-- Weather profiles already store latitude/longitude and remain the primary source for weather provider lookups.

alter table public.venues add column if not exists latitude double precision;
alter table public.venues add column if not exists longitude double precision;
alter table public.venues add column if not exists zip text;

create index if not exists venues_latitude_longitude_idx on public.venues(latitude, longitude);
