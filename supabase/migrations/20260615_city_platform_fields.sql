begin;

alter table public.cities
add column if not exists country text,
add column if not exists timezone text not null default 'UTC',
add column if not exists launch_status text not null default 'active';

update public.cities
set country = coalesce(country, country_code);

alter table public.cities
alter column country set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cities_launch_status_check'
  ) then
    alter table public.cities
    add constraint cities_launch_status_check
    check (launch_status in ('active', 'beta', 'requested'));
  end if;
end
$$;

alter table public.events
add column if not exists start_time timestamptz,
add column if not exists end_time timestamptz,
add column if not exists timezone text,
add column if not exists lat double precision,
add column if not exists lng double precision,
add column if not exists venue_name text,
add column if not exists source_url text,
add column if not exists verified_at timestamptz,
add column if not exists expires_at timestamptz;

update public.events
set start_time = coalesce(start_time, start_date),
    end_time = coalesce(end_time, end_date),
    lat = coalesce(lat, latitude),
    lng = coalesce(lng, longitude);

alter table public.event_sources
add column if not exists is_active boolean not null default false,
add column if not exists reliability_score numeric(3, 2) not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_sources_reliability_score_check'
  ) then
    alter table public.event_sources
    add constraint event_sources_reliability_score_check
    check (reliability_score >= 0 and reliability_score <= 1);
  end if;
end
$$;

update public.event_sources
set is_active = coalesce(is_active, enabled);

alter table public.raw_events
add column if not exists raw_json jsonb not null default '{}'::jsonb,
add column if not exists imported_at timestamptz not null default now();

update public.raw_events
set raw_json = case
  when raw_json = '{}'::jsonb then raw_payload
  else raw_json
end;

create index if not exists cities_launch_status_idx on public.cities(launch_status);
create index if not exists events_expires_at_idx on public.events(expires_at);
create index if not exists event_sources_active_idx on public.event_sources(is_active);
create index if not exists raw_events_imported_at_idx on public.raw_events(imported_at);

commit;
