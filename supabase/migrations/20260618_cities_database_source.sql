begin;

alter table public.cities
add column if not exists lat double precision,
add column if not exists lng double precision;

update public.cities
set lat = coalesce(lat, latitude),
    lng = coalesce(lng, longitude);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cities_lat_range_check'
  ) then
    alter table public.cities
    add constraint cities_lat_range_check
    check (lat is null or lat between -90 and 90);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cities_lng_range_check'
  ) then
    alter table public.cities
    add constraint cities_lng_range_check
    check (lng is null or lng between -180 and 180);
  end if;
end
$$;

create or replace function public.sync_city_coordinates()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE' then
    if new.lat is distinct from old.lat and new.latitude is not distinct from old.latitude then
      new.latitude = new.lat;
    end if;

    if new.lng is distinct from old.lng and new.longitude is not distinct from old.longitude then
      new.longitude = new.lng;
    end if;

    if new.latitude is distinct from old.latitude and new.lat is not distinct from old.lat then
      new.lat = new.latitude;
    end if;

    if new.longitude is distinct from old.longitude and new.lng is not distinct from old.lng then
      new.lng = new.longitude;
    end if;
  end if;

  new.latitude = coalesce(new.latitude, new.lat);
  new.longitude = coalesce(new.longitude, new.lng);
  new.lat = coalesce(new.lat, new.latitude);
  new.lng = coalesce(new.lng, new.longitude);
  return new;
end;
$$;

drop trigger if exists sync_city_coordinates on public.cities;
create trigger sync_city_coordinates
before insert or update of latitude, longitude, lat, lng on public.cities
for each row execute function public.sync_city_coordinates();

insert into public.cities (
  id,
  name,
  slug,
  country_code,
  country,
  timezone,
  launch_status,
  latitude,
  longitude,
  lat,
  lng,
  radius_km,
  bbox,
  is_active
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Milano',
    'milano',
    'IT',
    'Italy',
    'Europe/Rome',
    'active',
    45.4642,
    9.1900,
    45.4642,
    9.1900,
    14,
    '{"south":45.386,"west":9.04,"north":45.535,"east":9.32}'::jsonb,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Parigi',
    'parigi',
    'FR',
    'France',
    'Europe/Paris',
    'beta',
    48.8566,
    2.3522,
    48.8566,
    2.3522,
    15,
    '{"south":48.8156,"west":2.2241,"north":48.9022,"east":2.4699}'::jsonb,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Amsterdam',
    'amsterdam',
    'NL',
    'Netherlands',
    'Europe/Amsterdam',
    'beta',
    52.3676,
    4.9041,
    52.3676,
    4.9041,
    12,
    '{"south":52.318,"west":4.728,"north":52.431,"east":5.079}'::jsonb,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'New York',
    'new-york',
    'US',
    'United States',
    'America/New_York',
    'beta',
    40.7128,
    -74.0060,
    40.7128,
    -74.0060,
    18,
    '{"south":40.4774,"west":-74.2591,"north":40.9176,"east":-73.7004}'::jsonb,
    true
  )
on conflict (slug) do update
set name = excluded.name,
    country_code = excluded.country_code,
    country = excluded.country,
    timezone = excluded.timezone,
    launch_status = excluded.launch_status,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    lat = excluded.lat,
    lng = excluded.lng,
    radius_km = excluded.radius_km,
    bbox = excluded.bbox,
    is_active = excluded.is_active;

create index if not exists cities_active_launch_idx on public.cities(is_active, launch_status);
create index if not exists cities_lat_lng_idx on public.cities(lat, lng);

commit;
