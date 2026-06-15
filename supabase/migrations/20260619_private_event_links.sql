begin;

create extension if not exists "pgcrypto";

alter table public.events
add column if not exists secret_token text;

update public.events
set secret_token = encode(gen_random_bytes(24), 'hex')
where secret_token is null;

alter table public.events
alter column secret_token set default encode(gen_random_bytes(24), 'hex');

create unique index if not exists events_secret_token_idx
on public.events(secret_token)
where secret_token is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_link_only_secret_check'
  ) then
    alter table public.events
    add constraint events_link_only_secret_check
    check (visibility <> 'link_only' or secret_token is not null);
  end if;
end
$$;

drop policy if exists "Approved events are readable" on public.events;
create policy "Approved events are readable"
on public.events for select
using (
  (
    moderation_status = 'approved'
    and visibility = 'public'
    and status <> 'cancelled'
  )
  or created_by = auth.uid()
  or public.is_admin()
);

drop policy if exists "Readable event images" on public.event_images;
create policy "Readable event images"
on public.event_images for select
using (
  exists (
    select 1
    from public.events
    where events.id = event_images.event_id
      and (
        (
          events.moderation_status = 'approved'
          and events.visibility = 'public'
        )
        or events.created_by = auth.uid()
        or public.is_admin()
      )
  )
);

create or replace function public.get_public_map_events(
  city_id_input uuid,
  category_id_input uuid default null
)
returns table (
  id uuid,
  title text,
  description text,
  city_id uuid,
  category_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  latitude double precision,
  longitude double precision,
  lat double precision,
  lng double precision,
  venue_name text,
  address text,
  image_url text,
  created_by uuid,
  status text,
  moderation_status public.event_status,
  event_type text,
  visibility text,
  source_type text,
  source_id text,
  external_id text,
  source_url text,
  confidence_score numeric,
  quality_score numeric,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  cities jsonb,
  categories jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    e.id,
    e.title,
    case when e.visibility = 'public' then e.description else '' end as description,
    e.city_id,
    e.category_id,
    e.start_date,
    e.end_date,
    e.start_time,
    e.end_time,
    e.timezone,
    e.latitude,
    e.longitude,
    e.lat,
    e.lng,
    case when e.visibility = 'public' then e.venue_name else null end as venue_name,
    case when e.visibility = 'public' then e.address else null end as address,
    case when e.visibility = 'public' then e.image_url else null end as image_url,
    null::uuid as created_by,
    e.status,
    e.moderation_status,
    e.event_type,
    e.visibility,
    e.source_type,
    e.source_id,
    e.external_id,
    e.source_url,
    e.confidence_score,
    e.quality_score,
    e.verified_at,
    e.expires_at,
    e.created_at,
    e.updated_at,
    to_jsonb(c.*) as cities,
    to_jsonb(cat.*) as categories
  from public.events e
  join public.cities c on c.id = e.city_id
  join public.categories cat on cat.id = e.category_id
  where e.city_id = city_id_input
    and (category_id_input is null or e.category_id = category_id_input)
    and e.moderation_status = 'approved'
    and e.visibility in ('public', 'password')
    and e.status <> 'cancelled'
  order by e.start_date asc
  limit 180;
$$;

create or replace function public.get_event_detail_shell(event_id_input uuid)
returns table (
  id uuid,
  title text,
  description text,
  city_id uuid,
  category_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  latitude double precision,
  longitude double precision,
  lat double precision,
  lng double precision,
  venue_name text,
  address text,
  image_url text,
  created_by uuid,
  status text,
  moderation_status public.event_status,
  event_type text,
  visibility text,
  source_type text,
  source_id text,
  external_id text,
  source_url text,
  confidence_score numeric,
  quality_score numeric,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  cities jsonb,
  categories jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    e.id,
    e.title,
    case when e.visibility = 'public' then e.description else '' end as description,
    e.city_id,
    e.category_id,
    e.start_date,
    e.end_date,
    e.start_time,
    e.end_time,
    e.timezone,
    e.latitude,
    e.longitude,
    e.lat,
    e.lng,
    case when e.visibility = 'public' then e.venue_name else null end as venue_name,
    case when e.visibility = 'public' then e.address else null end as address,
    case when e.visibility = 'public' then e.image_url else null end as image_url,
    null::uuid as created_by,
    e.status,
    e.moderation_status,
    e.event_type,
    e.visibility,
    e.source_type,
    e.source_id,
    e.external_id,
    e.source_url,
    e.confidence_score,
    e.quality_score,
    e.verified_at,
    e.expires_at,
    e.created_at,
    e.updated_at,
    to_jsonb(c.*) as cities,
    to_jsonb(cat.*) as categories
  from public.events e
  join public.cities c on c.id = e.city_id
  join public.categories cat on cat.id = e.category_id
  where e.id = event_id_input
    and e.moderation_status = 'approved'
    and e.visibility in ('public', 'password')
    and e.status <> 'cancelled'
  limit 1;
$$;

create or replace function public.get_link_only_event(
  event_id_input uuid,
  secret_token_input text
)
returns table (
  id uuid,
  title text,
  description text,
  city_id uuid,
  category_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  latitude double precision,
  longitude double precision,
  lat double precision,
  lng double precision,
  venue_name text,
  address text,
  image_url text,
  created_by uuid,
  status text,
  moderation_status public.event_status,
  event_type text,
  visibility text,
  source_type text,
  source_id text,
  external_id text,
  source_url text,
  confidence_score numeric,
  quality_score numeric,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  cities jsonb,
  categories jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    e.id,
    e.title,
    e.description,
    e.city_id,
    e.category_id,
    e.start_date,
    e.end_date,
    e.start_time,
    e.end_time,
    e.timezone,
    e.latitude,
    e.longitude,
    e.lat,
    e.lng,
    e.venue_name,
    e.address,
    e.image_url,
    null::uuid as created_by,
    e.status,
    e.moderation_status,
    e.event_type,
    e.visibility,
    e.source_type,
    e.source_id,
    e.external_id,
    e.source_url,
    e.confidence_score,
    e.quality_score,
    e.verified_at,
    e.expires_at,
    e.created_at,
    e.updated_at,
    to_jsonb(c.*) as cities,
    to_jsonb(cat.*) as categories
  from public.events e
  join public.cities c on c.id = e.city_id
  join public.categories cat on cat.id = e.category_id
  where e.id = event_id_input
    and e.secret_token = secret_token_input
    and e.visibility = 'link_only'
    and e.moderation_status = 'approved'
    and e.status <> 'cancelled'
  limit 1;
$$;

grant execute on function public.get_public_map_events(uuid, uuid) to anon, authenticated;
grant execute on function public.get_event_detail_shell(uuid) to anon, authenticated;
grant execute on function public.get_link_only_event(uuid, text) to anon, authenticated;

commit;
