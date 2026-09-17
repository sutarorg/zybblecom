-- Zybble — single-application architecture
--
-- Replaces the always-on Railway workers with serverless, chunked,
-- lease-based job processing that runs inside the main app:
--   * search_jobs gain a radius, a durable payload cursor and a lease
--   * jobs are claimed with a short lease so one invocation owns them
--   * an expired lease is automatically recoverable (stale-job recovery)
--   * email jobs keep their existing SKIP LOCKED lease claim
--
-- Lifecycle (granular states are the "processing" phase, preserved so the
-- existing UI stepper keeps reporting real progress):
--   queued -> searching -> collecting -> enriching -> finding_emails -> complete
--   queued -> ... -> failed

-- ———————————————— search_jobs: radius, cursor, lease ————————————————
alter table public.search_jobs
  add column if not exists radius_meters integer not null default 25000
    check (radius_meters between 1000 and 50000),
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists lease_until timestamptz,
  add column if not exists last_error text;

create index if not exists search_jobs_claimable_idx
  on public.search_jobs(created_at)
  where status not in ('complete', 'failed');

-- ———————————————— Lease-based claim (serverless safe) ————————————————
-- Returns at most one job this invocation exclusively owns for the lease
-- window. Any job whose lease expired is reclaimable, which is what makes
-- stale-job recovery automatic when a function times out mid-chunk.
create or replace function public.claim_search_job(p_lease_seconds integer default 120)
returns setof public.search_jobs
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  with candidate as (
    select id from public.search_jobs
     where status not in ('complete', 'failed')
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
         lease_until = now() + make_interval(secs => greatest(30, p_lease_seconds)),
         updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

-- Extend the lease while a chunk is still actively progressing.
create or replace function public.extend_search_job_lease(
  p_job uuid,
  p_lease_seconds integer default 120
)
returns void
language sql
security definer set search_path = public
as $$
  update public.search_jobs
     set lease_until = now() + make_interval(secs => greatest(30, p_lease_seconds)),
         updated_at = now()
   where id = p_job;
$$;

create or replace function public.release_search_job(p_job uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.search_jobs
     set lease_until = null, updated_at = now()
   where id = p_job;
$$;

-- Jobs that exhausted their attempts are failed and their unused quota is
-- refunded. Called by the cron tick; safe to run repeatedly.
create or replace function public.fail_exhausted_search_jobs(p_max_attempts integer default 3)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  j record;
  v_failed integer := 0;
begin
  for j in
    select id from public.search_jobs
     where status not in ('complete', 'failed')
       and worker_attempts >= p_max_attempts
       and (lease_until is null or lease_until < now())
  loop
    update public.search_jobs
       set status = 'failed',
           lease_until = null,
           error = coalesce(error, 'Search stopped after repeated failures'),
           updated_at = now()
     where id = j.id;
    perform public.refund_search_job_quota(j.id);
    v_failed := v_failed + 1;
  end loop;
  return v_failed;
end;
$$;

-- ———————————————— Job creation with radius ————————————————
-- Quota reservation and queue insert stay in one transaction.
create or replace function public.create_search_job(
  p_user uuid,
  p_query text,
  p_location text,
  p_qty integer,
  p_radius integer default 25000
)
returns setof public.search_jobs
language plpgsql
security definer set search_path = public
as $$
begin
  if p_qty < 1 or p_qty > 200 then
    raise exception 'invalid quantity';
  end if;
  if not public.try_consume_leads(p_user, p_qty) then
    return;
  end if;
  return query
    insert into public.search_jobs(
      user_id, query, location, quantity, radius_meters, status
    )
    values (
      p_user, p_query, p_location, p_qty,
      least(50000, greatest(1000, coalesce(p_radius, 25000))), 'queued'
    )
    returning *;
end;
$$;

revoke all on function public.create_search_job(uuid, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.create_search_job(uuid, text, text, integer, integer)
  to service_role;

-- Superseded by the radius-aware signature above.
drop function if exists public.create_search_job(uuid, text, text, integer);

-- ———————————————— Cron observability ————————————————
alter table public.worker_heartbeats drop constraint if exists worker_heartbeats_service_check;
alter table public.worker_heartbeats
  add constraint worker_heartbeats_service_check
  check (service in ('scraper', 'mailer', 'cron'));

-- The separately deployed workers no longer exist.
delete from public.worker_heartbeats where service in ('scraper', 'mailer');

-- ———————————————— Grants (service role only) ————————————————
revoke all on function public.claim_search_job(integer) from public, anon, authenticated;
revoke all on function public.extend_search_job_lease(uuid, integer) from public, anon, authenticated;
revoke all on function public.release_search_job(uuid) from public, anon, authenticated;
revoke all on function public.fail_exhausted_search_jobs(integer) from public, anon, authenticated;

grant execute on function public.claim_search_job(integer) to service_role;
grant execute on function public.extend_search_job_lease(uuid, integer) to service_role;
grant execute on function public.release_search_job(uuid) to service_role;
grant execute on function public.fail_exhausted_search_jobs(integer) to service_role;

-- The zero-argument overload from migration 003 is replaced by the
-- lease-aware version above.
drop function if exists public.claim_search_job();
