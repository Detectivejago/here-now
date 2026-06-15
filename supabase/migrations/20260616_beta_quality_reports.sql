begin;

alter table public.events
add column if not exists quality_score numeric(3, 2) not null default 0.6;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_quality_score_check'
  ) then
    alter table public.events
    add constraint events_quality_score_check
    check (quality_score >= 0 and quality_score <= 1);
  end if;
end
$$;

update public.events
set quality_score = least(
  1,
  (
    case when nullif(trim(title), '') is not null then 0.16 else 0 end +
    case when nullif(trim(coalesce(address, venue_name, '')), '') is not null then 0.15 else 0 end +
    case when latitude is not null and longitude is not null then 0.18 else 0 end +
    case when coalesce(start_time, start_date) is not null then 0.16 else 0 end +
    case when nullif(trim(description), '') is not null then 0.15 else 0 end +
    case
      when source_type in ('partner', 'manual') then 0.10
      when source_type = 'api' and confidence_score >= 0.75 then 0.08
      when confidence_score >= 0.85 then 0.05
      else 0
    end +
    case when verified_at is not null then 0.10 else 0 end
  )
)::numeric(3, 2)
where quality_score = 0.6;

create table if not exists public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  reason text not null
    check (reason in ('not_existing', 'wrong_time', 'wrong_place', 'inappropriate', 'duplicate', 'other')),
  details text,
  reporter_user_id uuid references public.profiles(id) on delete set null,
  reporter_session_id text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  feedback_type text not null default 'general'
    check (feedback_type in ('general', 'bug', 'idea')),
  city_id uuid references public.cities(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  page_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.city_requests (
  id uuid primary key default gen_random_uuid(),
  city_name text not null,
  country text,
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  status text not null default 'requested'
    check (status in ('requested', 'reviewing', 'planned', 'launched', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists events_quality_score_idx on public.events(quality_score);
create index if not exists event_reports_event_idx on public.event_reports(event_id);
create index if not exists event_reports_status_idx on public.event_reports(status);
create index if not exists beta_feedback_city_idx on public.beta_feedback(city_id);
create index if not exists city_requests_status_idx on public.city_requests(status);

drop trigger if exists set_event_reports_updated_at on public.event_reports;
create trigger set_event_reports_updated_at
before update on public.event_reports
for each row execute function public.set_updated_at();

create or replace function public.unlock_private_event(
  event_id_input uuid,
  password_hash_input text
)
returns table (
  description text,
  address text,
  latitude double precision,
  longitude double precision,
  image_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select e.description, e.address, e.latitude, e.longitude, e.image_url
  from public.events e
  where e.id = event_id_input
    and e.visibility = 'password'
    and e.password_hash = password_hash_input
    and e.moderation_status = 'approved'
    and e.status <> 'cancelled'
  limit 1;
$$;

alter table public.event_reports enable row level security;
alter table public.beta_feedback enable row level security;
alter table public.city_requests enable row level security;

drop policy if exists "Anyone can report events" on public.event_reports;
create policy "Anyone can report events"
on public.event_reports for insert
with check (reporter_user_id is null or reporter_user_id = auth.uid());

drop policy if exists "Admins manage event reports" on public.event_reports;
create policy "Admins manage event reports"
on public.event_reports for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can submit beta feedback" on public.beta_feedback;
create policy "Anyone can submit beta feedback"
on public.beta_feedback for insert
with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins read beta feedback" on public.beta_feedback;
create policy "Admins read beta feedback"
on public.beta_feedback for select
to authenticated
using (public.is_admin());

drop policy if exists "Anyone can request cities" on public.city_requests;
create policy "Anyone can request cities"
on public.city_requests for insert
with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins manage city requests" on public.city_requests;
create policy "Admins manage city requests"
on public.city_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant execute on function public.unlock_private_event(uuid, text) to anon, authenticated;

commit;
