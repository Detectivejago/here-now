begin;

alter table public.events
add column if not exists moderation_status public.event_status not null default 'pending',
add column if not exists event_type text not null default 'temporary',
add column if not exists visibility text not null default 'public',
add column if not exists password_hash text,
add column if not exists source_type text not null default 'user',
add column if not exists source_id text,
add column if not exists confidence_score numeric(3, 2) not null default 1;

update public.events
set moderation_status = case
  when status::text in ('pending', 'approved', 'rejected') then status::text::public.event_status
  else moderation_status
end;

alter table public.events alter column status drop default;

alter table public.events
alter column status type text
using case
  when status::text in ('pending', 'approved', 'rejected') then 'upcoming'
  else status::text
end;

alter table public.events alter column status set default 'upcoming';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_lifecycle_status_check'
  ) then
    alter table public.events
    add constraint events_lifecycle_status_check
    check (status in ('live_now', 'upcoming', 'ongoing', 'expired', 'cancelled'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_event_type_check'
  ) then
    alter table public.events
    add constraint events_event_type_check
    check (event_type in ('temporary', 'recurring', 'permanent', 'private'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_visibility_check'
  ) then
    alter table public.events
    add constraint events_visibility_check
    check (visibility in ('public', 'password', 'link_only', 'private'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_source_type_check'
  ) then
    alter table public.events
    add constraint events_source_type_check
    check (source_type in ('user', 'api', 'partner', 'manual'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_confidence_score_check'
  ) then
    alter table public.events
    add constraint events_confidence_score_check
    check (confidence_score >= 0 and confidence_score <= 1);
  end if;
end
$$;

create table if not exists public.event_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  name text not null,
  source_type text not null default 'api'
    check (source_type in ('user', 'api', 'partner', 'manual')),
  base_url text,
  api_key_env text,
  enabled boolean not null default false,
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
  normalized_event_id uuid references public.events(id) on delete set null,
  import_status text not null default 'pending'
    check (import_status in ('pending', 'normalized', 'duplicate', 'failed')),
  error_message text,
  payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id, external_id)
);

create index if not exists events_moderation_status_idx on public.events(moderation_status);
create index if not exists events_visibility_idx on public.events(visibility);
create index if not exists events_event_type_idx on public.events(event_type);
create index if not exists events_source_type_idx on public.events(source_type);
create index if not exists event_sources_provider_idx on public.event_sources(provider);
create index if not exists event_sources_enabled_idx on public.event_sources(enabled);
create index if not exists raw_events_source_idx on public.raw_events(source_id);
create index if not exists raw_events_external_idx on public.raw_events(external_id);
create index if not exists raw_events_status_idx on public.raw_events(import_status);

drop trigger if exists set_event_sources_updated_at on public.event_sources;
create trigger set_event_sources_updated_at
before update on public.event_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_raw_events_updated_at on public.raw_events;
create trigger set_raw_events_updated_at
before update on public.raw_events
for each row execute function public.set_updated_at();

alter table public.event_sources enable row level security;
alter table public.raw_events enable row level security;

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

insert into public.event_sources (
  provider,
  name,
  source_type,
  base_url,
  api_key_env,
  enabled,
  config
)
values (
  'ticketmaster',
  'Ticketmaster Discovery API',
  'api',
  'https://app.ticketmaster.com/discovery/v2',
  'TICKETMASTER_API_KEY',
  false,
  '{"adapter":"ticketmaster"}'::jsonb
)
on conflict (provider, name) do update
set source_type = excluded.source_type,
    base_url = excluded.base_url,
    api_key_env = excluded.api_key_env,
    config = excluded.config;

commit;
