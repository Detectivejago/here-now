begin;

create extension if not exists "pgcrypto";
create extension if not exists "postgis";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type public.event_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country_code text not null,
  country text not null default '',
  timezone text not null default 'UTC',
  launch_status text not null default 'active'
    check (launch_status in ('active', 'beta', 'requested')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_km numeric(8, 2) not null default 10 check (radius_km > 0),
  bbox jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cities_bbox_shape check (
    bbox ? 'south'
    and bbox ? 'west'
    and bbox ? 'north'
    and bbox ? 'east'
  )
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_it text not null,
  name_en text not null,
  color text not null default '#FF6B61',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  city_id uuid references public.cities(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  status public.event_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  city_id uuid not null references public.cities(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  start_date timestamptz not null,
  end_date timestamptz,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  lat double precision,
  lng double precision,
  location geography(Point, 4326)
    generated always as (st_setsrid(st_makepoint(longitude, latitude), 4326)::geography) stored,
  venue_name text,
  address text,
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  moderation_status public.event_status not null default 'pending',
  status text not null default 'upcoming'
    check (status in ('live_now', 'upcoming', 'ongoing', 'expired', 'cancelled')),
  event_type text not null default 'temporary'
    check (event_type in ('temporary', 'recurring', 'permanent', 'private')),
  visibility text not null default 'public'
    check (visibility in ('public', 'password', 'link_only', 'private')),
  password_hash text,
  source_type text not null default 'user'
    check (source_type in ('user', 'api', 'partner', 'manual')),
  source_id text,
  source_url text,
  confidence_score numeric(3, 2) not null default 1
    check (confidence_score >= 0 and confidence_score <= 1),
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_date is null or end_date >= start_date)
);

create table if not exists public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  session_id text,
  user_id uuid references public.profiles(id) on delete set null,
  page_path text,
  city_id uuid references public.cities(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.event_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  name text not null,
  source_type text not null default 'api'
    check (source_type in ('user', 'api', 'partner', 'manual')),
  base_url text,
  api_key_env text,
  enabled boolean not null default false,
  is_active boolean not null default false,
  reliability_score numeric(3, 2) not null default 1
    check (reliability_score >= 0 and reliability_score <= 1),
  config jsonb not null default '{}'::jsonb,
  last_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, name)
);

create table if not exists public.raw_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.event_sources(id) on delete cascade,
  external_id text not null,
  raw_payload jsonb not null,
  raw_json jsonb not null default '{}'::jsonb,
  normalized_event_id uuid references public.events(id) on delete set null,
  import_status text not null default 'pending'
    check (import_status in ('pending', 'normalized', 'duplicate', 'failed')),
  error_message text,
  payload_hash text,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id, external_id)
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists cities_slug_idx on public.cities(slug);
create index if not exists cities_active_idx on public.cities(is_active);
create index if not exists categories_slug_idx on public.categories(slug);
create index if not exists categories_active_sort_idx on public.categories(is_active, sort_order);
create index if not exists clubs_city_idx on public.clubs(city_id);
create index if not exists clubs_status_idx on public.clubs(status);
create index if not exists clubs_created_by_idx on public.clubs(created_by);
create index if not exists events_city_idx on public.events(city_id);
create index if not exists events_category_idx on public.events(category_id);
create index if not exists events_start_date_idx on public.events(start_date);
create index if not exists events_status_idx on public.events(status);
create index if not exists events_moderation_status_idx on public.events(moderation_status);
create index if not exists events_visibility_idx on public.events(visibility);
create index if not exists events_event_type_idx on public.events(event_type);
create index if not exists events_source_type_idx on public.events(source_type);
create index if not exists events_created_by_idx on public.events(created_by);
create index if not exists events_lat_lng_idx on public.events(latitude, longitude);
create index if not exists events_location_gix on public.events using gist(location);
create index if not exists analytics_event_name_idx on public.analytics_events(event_name);
create index if not exists analytics_created_at_idx on public.analytics_events(created_at);
create index if not exists event_sources_provider_idx on public.event_sources(provider);
create index if not exists event_sources_enabled_idx on public.event_sources(enabled);
create index if not exists raw_events_source_idx on public.raw_events(source_id);
create index if not exists raw_events_external_idx on public.raw_events(external_id);
create index if not exists raw_events_status_idx on public.raw_events(import_status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_cities_updated_at on public.cities;
create trigger set_cities_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_clubs_updated_at on public.clubs;
create trigger set_clubs_updated_at
before update on public.clubs
for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists set_event_sources_updated_at on public.event_sources;
create trigger set_event_sources_updated_at
before update on public.event_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_raw_events_updated_at on public.raw_events;
create trigger set_raw_events_updated_at
before update on public.raw_events
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.prevent_non_admin_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_non_admin_role_change on public.profiles;
create trigger prevent_non_admin_role_change
before update on public.profiles
for each row execute function public.prevent_non_admin_role_change();

create or replace function public.enforce_event_city_bounds()
returns trigger
language plpgsql
as $$
declare
  city_bbox jsonb;
begin
  select bbox into city_bbox
  from public.cities
  where id = new.city_id;

  if city_bbox is null then
    raise exception 'City not found for event.';
  end if;

  if new.latitude < (city_bbox ->> 'south')::double precision
    or new.latitude > (city_bbox ->> 'north')::double precision
    or new.longitude < (city_bbox ->> 'west')::double precision
    or new.longitude > (city_bbox ->> 'east')::double precision then
    raise exception 'Event coordinates are outside the selected city bounds.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_event_city_bounds on public.events;
create trigger enforce_event_city_bounds
before insert or update of city_id, latitude, longitude on public.events
for each row execute function public.enforce_event_city_bounds();

alter table public.profiles enable row level security;
alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.clubs enable row level security;
alter table public.events enable row level security;
alter table public.event_images enable row level security;
alter table public.analytics_events enable row level security;
alter table public.event_sources enable row level security;
alter table public.raw_events enable row level security;

drop policy if exists "Profiles are visible to owner or admin" on public.profiles;
create policy "Profiles are visible to owner or admin"
on public.profiles for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Active cities are readable" on public.cities;
create policy "Active cities are readable"
on public.cities for select
using (is_active = true or public.is_admin());

drop policy if exists "Admins manage cities" on public.cities;
create policy "Admins manage cities"
on public.cities for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Active categories are readable" on public.categories;
create policy "Active categories are readable"
on public.categories for select
using (is_active = true or public.is_admin());

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Approved clubs are readable" on public.clubs;
create policy "Approved clubs are readable"
on public.clubs for select
using (status = 'approved' or created_by = auth.uid() or public.is_admin());

drop policy if exists "Users create pending clubs" on public.clubs;
create policy "Users create pending clubs"
on public.clubs for insert
to authenticated
with check (created_by = auth.uid() and status = 'pending');

drop policy if exists "Users update own pending clubs" on public.clubs;
create policy "Users update own pending clubs"
on public.clubs for update
to authenticated
using (created_by = auth.uid() and status = 'pending')
with check (created_by = auth.uid() and status = 'pending');

drop policy if exists "Admins manage clubs" on public.clubs;
create policy "Admins manage clubs"
on public.clubs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Approved events are readable" on public.events;
create policy "Approved events are readable"
on public.events for select
using (
  (
    moderation_status = 'approved'
    and visibility in ('public', 'password', 'link_only')
    and status <> 'cancelled'
  )
  or created_by = auth.uid()
  or public.is_admin()
);

drop policy if exists "Users create pending events" on public.events;
create policy "Users create pending events"
on public.events for insert
to authenticated
with check (created_by = auth.uid() and moderation_status = 'pending');

drop policy if exists "Users update own pending events" on public.events;
create policy "Users update own pending events"
on public.events for update
to authenticated
using (created_by = auth.uid() and moderation_status = 'pending')
with check (created_by = auth.uid() and moderation_status = 'pending');

drop policy if exists "Users delete own pending events" on public.events;
create policy "Users delete own pending events"
on public.events for delete
to authenticated
using (created_by = auth.uid() and moderation_status = 'pending');

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events"
on public.events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Readable event images" on public.event_images;
create policy "Readable event images"
on public.event_images for select
using (
  exists (
    select 1
    from public.events
    where events.id = event_images.event_id
      and (
        events.moderation_status = 'approved'
        or events.created_by = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "Users manage images for own pending events" on public.event_images;
create policy "Users manage images for own pending events"
on public.event_images for all
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_images.event_id
      and events.created_by = auth.uid()
      and events.moderation_status = 'pending'
  )
)
with check (
  exists (
    select 1
    from public.events
    where events.id = event_images.event_id
      and events.created_by = auth.uid()
      and events.moderation_status = 'pending'
  )
);

drop policy if exists "Admins manage event sources" on public.event_sources;
create policy "Admins manage event sources"
on public.event_sources for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage raw events" on public.raw_events;
create policy "Admins manage raw events"
on public.raw_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage event images" on public.event_images;
create policy "Admins manage event images"
on public.event_images for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can insert analytics" on public.analytics_events;
create policy "Anyone can insert analytics"
on public.analytics_events for insert
with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins read analytics" on public.analytics_events;
create policy "Admins read analytics"
on public.analytics_events for select
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public event images are readable" on storage.objects;
create policy "Public event images are readable"
on storage.objects for select
using (bucket_id = 'event-images');

drop policy if exists "Authenticated users upload event images" on storage.objects;
create policy "Authenticated users upload event images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'event-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own event images" on storage.objects;
create policy "Users update own event images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'event-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'event-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users delete own event images" on storage.objects;
create policy "Users delete own event images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'event-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

commit;
