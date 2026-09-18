-- Zybble — Lead Finder: GoogleMapScraper engine, filters, live counters
--
-- This migration replaces the paid Google Maps/Places/Geocoding path with the
-- open-source GoogleMapScraper-based worker, and gives the UI everything it
-- needs to report a search honestly:
--
--   requested → discovered → unique → enriched → saved
--   plus duplicates, filtered, emails found, errors and coverage progress.
--
-- Idempotent: safe to run repeatedly, at any point, in the Supabase SQL editor.

-- ———————————————— 1) search_jobs: counters, filters, new stage ————————————————

alter table public.search_jobs
  add column if not exists requested        integer not null default 0,
  add column if not exists discovered       integer not null default 0,
  add column if not exists unique_count     integer not null default 0,
  add column if not exists duplicate_count  integer not null default 0,
  add column if not exists filtered_count   integer not null default 0,
  add column if not exists enriched_count   integer not null default 0,
  add column if not exists email_found_count integer not null default 0,
  add column if not exists error_count      integer not null default 0,
  add column if not exists coverage_total   integer not null default 0,
  add column if not exists coverage_done    integer not null default 0,
  add column if not exists filters          jsonb not null default '{}'::jsonb,
  add column if not exists sort_by          text not null default 'relevance',
  add column if not exists message          text;

-- Keep `requested` in step with `quantity` for existing rows.
update public.search_jobs set requested = quantity where requested = 0;

alter table public.search_jobs
  alter column sort_by set default 'relevance';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'search_jobs_sort_by_check' and conrelid = 'public.search_jobs'::regclass
  ) then
    alter table public.search_jobs
      add constraint search_jobs_sort_by_check
      check (sort_by in ('relevance', 'rating', 'reviews', 'newest'));
  end if;
end $$;

-- A new pipeline stage: Searching → Discovering → Deduplicating → Enriching →
-- Finding emails → Complete.
alter table public.search_jobs drop constraint if exists search_jobs_status_check;
alter table public.search_jobs
  add constraint search_jobs_status_check
  check (status in ('queued','searching','collecting','deduplicating','enriching','finding_emails','complete','failed'));

-- The only discovery engine is the scraper worker. Jobs queued for the retired
-- Google Places provider are handed to the scraper instead of being stranded.
update public.search_jobs
   set provider = 'scraper',
       status = case when status in ('complete','failed') then status else 'queued' end,
       lease_until = null,
       lease_token = null
 where provider <> 'scraper';

alter table public.search_jobs drop constraint if exists search_jobs_provider_check;
alter table public.search_jobs
  add constraint search_jobs_provider_check
  check (provider in ('worker', 'scraper'));

create index if not exists search_jobs_scraper_claimable_idx
  on public.search_jobs(provider, created_at)
  where status not in ('complete', 'failed');

-- ———————————————— 2) leads: stable identity + enrichment fields ————————————————

alter table public.leads
  add column if not exists place_id        text,
  add column if not exists dedupe_key      text,
  add column if not exists open_status     text,
  add column if not exists social_profiles jsonb not null default '[]'::jsonb,
  add column if not exists latitude        double precision,
  add column if not exists longitude       double precision;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'leads_open_status_check' and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_open_status_check
      check (open_status is null or open_status in ('open','closed','permanently_closed','unknown'));
  end if;
end $$;

-- Backfill identity for rows collected before this migration so historical
-- businesses still deduplicate against new searches.
update public.leads
   set dedupe_key = 'na:' || md5(lower(regexp_replace(coalesce(company,''), '[^a-zA-Z0-9]+', ' ', 'g')) || '|' ||
                                 lower(regexp_replace(coalesce(address,''), '[^a-zA-Z0-9]+', ' ', 'g')))
 where dedupe_key is null;

-- One business per user, keyed by place id / Maps URL / name+address. NULLs are
-- left alone so pre-existing duplicates are not collapsed destructively.
create unique index if not exists leads_user_dedupe_key_idx
  on public.leads(user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists leads_job_idx on public.leads(job_id);
create index if not exists leads_place_id_idx on public.leads(place_id) where place_id is not null;
create index if not exists leads_open_status_idx on public.leads(user_id, open_status);

-- ———————————————— 3) Job creation with filters (canonical, 8 args) ————————————————

drop function if exists public.create_search_job(uuid, text, text, integer);
drop function if exists public.create_search_job(uuid, text, text, integer, integer);
drop function if exists public.create_search_job(uuid, text, text, integer, integer, text);

create or replace function public.create_search_job(
  p_user uuid,
  p_query text,
  p_location text,
  p_qty integer,
  p_radius integer default 25000,
  p_provider text default 'scraper',
  p_filters jsonb default '{}'::jsonb,
  p_sort_by text default 'relevance'
)
returns setof public.search_jobs
language plpgsql
security definer set search_path = public
as $$
begin
  if p_qty < 1 or p_qty > 200 then
    raise exception 'invalid quantity';
  end if;
  if p_provider not in ('worker', 'scraper', 'places') then
    raise exception 'invalid provider';
  end if;
  if p_provider = 'places' then
    -- The Google Places provider is retired; discovery is always the scraper.
    p_provider := 'scraper';
  end if;
  if p_sort_by not in ('relevance', 'rating', 'reviews', 'newest') then
    p_sort_by := 'relevance';
  end if;
  if not public.try_consume_leads(p_user, p_qty) then
    return;
  end if;
  return query
    insert into public.search_jobs(
      user_id, query, location, quantity, radius_meters, provider, status,
      requested, filters, sort_by
    )
    values (
      p_user, p_query, p_location, p_qty,
      least(50000, greatest(1000, coalesce(p_radius, 25000))),
      p_provider, 'queued', p_qty,
      coalesce(p_filters, '{}'::jsonb), p_sort_by
    )
    returning *;
end;
$$;

-- ———————————————— 4) Resumable, multi-slice searches ————————————————

-- A broad search ("50 gyms in Delhi") can span several bounded browser slices.
-- Handing a job back to the queue is a continuation, not a failure, so this
-- does NOT consume one of the worker's attempts.
create or replace function public.resume_search_job(
  p_job uuid,
  p_lease_token uuid,
  p_message text default null,
  p_progress integer default null
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update public.search_jobs
     set status = 'queued',
         progress = least(coalesce(p_progress, progress), 95),
         message = coalesce(p_message, message),
         lease_until = null,
         lease_token = null,
         updated_at = now()
   where id = p_job
     and lease_token = p_lease_token
     and status not in ('complete', 'failed');
  return found;
end;
$$;

-- The in-app (serverless) processor can only finish jobs whose discovery is
-- already done: enrichment and email discovery are plain HTTP/DNS work. Jobs
-- still in searching/collecting belong to the browser worker.
create or replace function public.claim_recoverable_search_job(
  p_provider text default 'scraper',
  p_lease_seconds integer default 120
)
returns setof public.search_jobs
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  with candidate as (
    select id from public.search_jobs
     where provider = p_provider
       and status in ('deduplicating', 'enriching', 'finding_emails')
       and (lease_until is null or lease_until < now())
     order by created_at
     for update skip locked
     limit 1
  )
  update public.search_jobs j
     set lease_token = gen_random_uuid(),
         lease_until = now() + make_interval(secs => greatest(30, p_lease_seconds)),
         updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

-- ———————————————— 5) Grants ————————————————

revoke all on function public.create_search_job(uuid, text, text, integer, integer, text, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.resume_search_job(uuid, uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.claim_recoverable_search_job(text, integer)
  from public, anon, authenticated;

grant execute on function public.create_search_job(uuid, text, text, integer, integer, text, jsonb, text)
  to service_role;
grant execute on function public.resume_search_job(uuid, uuid, text, integer)
  to service_role;
grant execute on function public.claim_recoverable_search_job(text, integer)
  to service_role;

-- PostgREST picks up the new/changed functions and columns immediately.
notify pgrst, 'reload schema';
