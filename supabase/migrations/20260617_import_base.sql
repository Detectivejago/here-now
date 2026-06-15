begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.events
add column if not exists source_type text not null default 'user',
add column if not exists source_id text,
add column if not exists external_id text,
add column if not exists source_url text,
add column if not exists confidence_score numeric(3, 2) not null default 1;

do $$
begin
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
  is_active boolean not null default false,
  reliability_score numeric(3, 2) not null default 1
    check (reliability_score >= 0 and reliability_score <= 1),
  config jsonb not null default '{}'::jsonb,
  last_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, name)
);

alter table public.event_sources
add column if not exists source_type text not null default 'api',
add column if not exists base_url text,
add column if not exists api_key_env text,
add column if not exists enabled boolean not null default false,
add column if not exists is_active boolean not null default false,
add column if not exists reliability_score numeric(3, 2) not null default 1,
add column if not exists config jsonb not null default '{}'::jsonb,
add column if not exists last_imported_at timestamptz,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_sources_source_type_check'
  ) then
    alter table public.event_sources
    add constraint event_sources_source_type_check
    check (source_type in ('user', 'api', 'partner', 'manual'));
  end if;

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

alter table public.raw_events
add column if not exists source_id uuid references public.event_sources(id) on delete cascade,
add column if not exists external_id text,
add column if not exists raw_payload jsonb,
add column if not exists raw_json jsonb not null default '{}'::jsonb,
add column if not exists normalized_event_id uuid references public.events(id) on delete set null,
add column if not exists import_status text not null default 'pending',
add column if not exists error_message text,
add column if not exists payload_hash text,
add column if not exists imported_at timestamptz not null default now(),
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'raw_events_import_status_check'
  ) then
    alter table public.raw_events
    add constraint raw_events_import_status_check
    check (import_status in ('pending', 'normalized', 'duplicate', 'failed'));
  end if;
end
$$;

create index if not exists events_source_type_idx on public.events(source_type);
create index if not exists events_source_external_idx on public.events(source_type, external_id);
create index if not exists events_confidence_score_idx on public.events(confidence_score);
create index if not exists event_sources_provider_idx on public.event_sources(provider);
create index if not exists event_sources_enabled_idx on public.event_sources(enabled);
create index if not exists event_sources_active_idx on public.event_sources(is_active);
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

commit;
