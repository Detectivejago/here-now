begin;

alter table public.events drop constraint if exists events_source_type_check;
alter table public.events
add constraint events_source_type_check
check (source_type in ('user', 'api', 'partner', 'manual', 'imported'));

alter table public.event_sources drop constraint if exists event_sources_source_type_check;
alter table public.event_sources
add constraint event_sources_source_type_check
check (source_type in ('user', 'api', 'partner', 'manual', 'imported'));

commit;
