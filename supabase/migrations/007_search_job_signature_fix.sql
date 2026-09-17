-- Zybble — converged search-job schema + RPC signatures
--
-- Fixes POST /api/search → "Request failed (500)":
--
--   ROOT CAUSE: the application calls create_search_job with 6 named
--   arguments (p_user, p_query, p_location, p_qty, p_radius, p_provider).
--   Migrations 003/004/005 each defined a DIFFERENT arity:
--     003: (uuid, text, text, integer)              — 4 args
--     004: (uuid, text, text, integer, integer)     — 5 args
--     005: (uuid, text, text, integer, integer, text) — 6 args  ← canonical
--   A database that stopped at 003 or 004 holds an overload that cannot
--   accept p_provider, so PostgREST fails to resolve the call (42883 /
--   PGRST202) and the API returns 500. Partially applied migrations can
--   also leave search_jobs without the provider/radius/lease columns,
--   failing the INSERT at runtime (42703).
--
-- This migration is IDEMPOTENT and CONVERGES any prior state (including
-- partially applied or out-of-order migrations) to the exact schema the
-- application expects. Safe to run repeatedly, at any point.

-- ———————————————— 1) Columns (all idempotent) ————————————————

alter table public.search_jobs
  add column if not exists radius_meters integer not null default 25000;
alter table public.search_jobs
  add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.search_jobs
  add column if not exists lease_until timestamptz;
alter table public.search_jobs
  add column if not exists last_error text;
alter table public.search_jobs
  add column if not exists quota_refunded integer not null default 0;
alter table public.search_jobs
  add column if not exists worker_attempts integer not null default 0;
alter table public.search_jobs
  add column if not exists provider text not null default 'worker';
alter table public.search_jobs
  add column if not exists lease_token uuid;

create index if not exists search_jobs_claimable_idx
  on public.search_jobs(created_at)
  where status not in ('complete', 'failed');
create index if not exists search_jobs_provider_claimable_idx
  on public.search_jobs(provider, created_at)
  where status not in ('complete', 'failed');

-- ———————————————— 2) Remove every superseded overload ————————————————
-- create or replace cannot change a function's argument list, so stale
-- arities must be dropped explicitly.

drop function if exists public.create_search_job(uuid, text, text, integer);
drop function if exists public.create_search_job(uuid, text, text, integer, integer);
drop function if exists public.claim_search_job();
drop function if exists public.claim_search_job(integer);
drop function if exists public.extend_search_job_lease(uuid, integer);
drop function if exists public.release_search_job(uuid);

-- ———————————————— 3) Canonical create_search_job (6 args) ————————————————

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

-- ———————————————— 4) Canonical quota functions ————————————————
-- Plan limits honor canceled-until-period-end and past-due subscriptions.

create or replace function public.try_consume_leads(p_user uuid, p_qty integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_month char(7) := to_char(now(), 'YYYY-MM');
begin
  select coalesce((
    select case
      when s.status = 'active' then s.plan
      when s.status = 'canceled' and s.current_period_end > now() then s.plan
      else 'free'
    end
    from public.subscriptions s where s.user_id = p_user
  ), 'free') into v_plan;

  v_limit := case v_plan
    when 'agency' then 20000
    when 'growth' then 5000
    else 100
  end;

  insert into public.usage(user_id, month, leads_used)
  values (p_user, v_month, 0)
  on conflict (user_id, month) do nothing;

  update public.usage
     set leads_used = leads_used + p_qty, updated_at = now()
   where user_id = p_user and month = v_month
     and leads_used + p_qty <= v_limit;
  return found;
end;
$$;

create or replace function public.refund_search_job_quota(p_job uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  j public.search_jobs%rowtype;
  v_refund integer;
begin
  select * into j from public.search_jobs where id = p_job for update;
  if not found then return 0; end if;

  v_refund := greatest(0, j.quantity - j.collected - j.quota_refunded);
  if v_refund = 0 then return 0; end if;

  update public.usage
     set leads_used = greatest(0, leads_used - v_refund), updated_at = now()
   where user_id = j.user_id and month = to_char(j.created_at, 'YYYY-MM');
  update public.search_jobs
     set quota_refunded = quota_refunded + v_refund, updated_at = now()
   where id = p_job;
  return v_refund;
end;
$$;

-- ———————————————— 5) Canonical lease functions ————————————————
-- Every claim counts as an attempt: a job whose worker died mid-run is
-- reclaimed after the lease expires, and after 3 total claims without
-- completion the cron pass fails it and refunds unused quota.

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
         worker_attempts = j.worker_attempts + 1,
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
           lease_token = null,
           error = coalesce(error, 'Search stopped after repeated failures'),
           updated_at = now()
     where id = j.id;
    perform public.refund_search_job_quota(j.id);
    v_failed := v_failed + 1;
  end loop;
  return v_failed;
end;
$$;

-- ———————————————— 6) Permissions ————————————————
-- SECURITY DEFINER RPCs are backend primitives: service_role only.

revoke all on function public.create_search_job(uuid, text, text, integer, integer, text)
  from public, anon, authenticated;
revoke all on function public.try_consume_leads(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.refund_search_job_quota(uuid)
  from public, anon, authenticated;
revoke all on function public.claim_search_job(text, integer)
  from public, anon, authenticated;
revoke all on function public.extend_search_job_lease(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.release_search_job(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.fail_exhausted_search_jobs(integer)
  from public, anon, authenticated;

grant execute on function public.create_search_job(uuid, text, text, integer, integer, text)
  to service_role;
grant execute on function public.try_consume_leads(uuid, integer) to service_role;
grant execute on function public.refund_search_job_quota(uuid) to service_role;
grant execute on function public.claim_search_job(text, integer) to service_role;
grant execute on function public.extend_search_job_lease(uuid, uuid, integer) to service_role;
grant execute on function public.release_search_job(uuid, uuid) to service_role;
grant execute on function public.fail_exhausted_search_jobs(integer) to service_role;

-- ———————————————— 7) Reload the PostgREST schema cache ————————————————
-- A stale cache is a classic cause of "function ... does not exist" errors
-- immediately after migrations. This notification forces a reload.

NOTIFY pgrst, 'reload schema';
