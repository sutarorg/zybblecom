-- Zybble — pluggable lead provider
--
-- LEAD_PROVIDER=worker: Python/Selenium (no Google Maps API key)
-- LEAD_PROVIDER=places: serverless Places API fallback
--
-- Both providers share one durable queue but can only claim their own rows.

alter table public.search_jobs
  add column if not exists provider text not null default 'worker'
    check (provider in ('worker', 'places')),
  add column if not exists lease_token uuid;

create index if not exists search_jobs_provider_claimable_idx
  on public.search_jobs(provider, created_at)
  where status not in ('complete', 'failed');

create or replace function public.create_search_job(
  p_user uuid,
  p_query text,
  p_location text,
  p_qty integer,
  p_radius integer default 25000,
  p_provider text default 'worker'
)
returns setof public.search_jobs
language plpgsql
security definer set search_path = public
as $$
begin
  if p_qty < 1 or p_qty > 200 then
    raise exception 'invalid quantity';
  end if;
  if p_provider not in ('worker', 'places') then
    raise exception 'invalid provider';
  end if;
  if not public.try_consume_leads(p_user, p_qty) then
    return;
  end if;
  return query
    insert into public.search_jobs(
      user_id, query, location, quantity, radius_meters, provider, status
    )
    values (
      p_user, p_query, p_location, p_qty,
      least(50000, greatest(1000, coalesce(p_radius, 25000))),
      p_provider, 'queued'
    )
    returning *;
end;
$$;

create or replace function public.claim_search_job(
  p_provider text,
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
       and status not in ('complete', 'failed')
       and (lease_until is null or lease_until < now())
     order by
       case when status = 'queued' then 0 else 1 end,
       created_at
     for update skip locked
     limit 1
  )
  update public.search_jobs j
     set status = case when j.status = 'queued' then 'searching' else j.status end,
         progress = greatest(j.progress, 2),
         worker_attempts = case
           when j.status = 'queued' then j.worker_attempts + 1
           else j.worker_attempts
         end,
         lease_token = gen_random_uuid(),
         lease_until = now() + make_interval(secs => greatest(30, p_lease_seconds)),
         updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

create or replace function public.extend_search_job_lease(
  p_job uuid,
  p_lease_token uuid,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update public.search_jobs
     set lease_until = now() + make_interval(secs => greatest(30, p_lease_seconds)),
         updated_at = now()
   where id = p_job and lease_token = p_lease_token
     and status not in ('complete', 'failed');
  return found;
end;
$$;

create or replace function public.release_search_job(
  p_job uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update public.search_jobs
     set lease_until = null, lease_token = null, updated_at = now()
   where id = p_job and lease_token = p_lease_token;
  return found;
end;
$$;

-- Superseded signatures.
drop function if exists public.create_search_job(uuid, text, text, integer, integer);
drop function if exists public.claim_search_job(integer);
drop function if exists public.extend_search_job_lease(uuid, integer);
drop function if exists public.release_search_job(uuid);

revoke all on function public.create_search_job(uuid, text, text, integer, integer, text)
  from public, anon, authenticated;
revoke all on function public.claim_search_job(text, integer)
  from public, anon, authenticated;
revoke all on function public.extend_search_job_lease(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.release_search_job(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.create_search_job(uuid, text, text, integer, integer, text)
  to service_role;
grant execute on function public.claim_search_job(text, integer) to service_role;
grant execute on function public.extend_search_job_lease(uuid, uuid, integer) to service_role;
grant execute on function public.release_search_job(uuid, uuid) to service_role;

-- The browser never sees lease tokens or worker payloads. Existing read-only
-- RLS still applies; the app's bootstrap endpoint uses a strict allowlist.