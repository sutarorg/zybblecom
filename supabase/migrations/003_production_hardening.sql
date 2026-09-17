-- Zybble production hardening
-- Safe queue claiming, quota refunds, distributed rate limiting,
-- worker health, webhook retry/idempotency, and duplicate-send protection.

create extension if not exists "citext";

-- Quota reservations are made before a scrape starts. Failed or partial jobs
-- refund unused capacity exactly once.
alter table public.search_jobs
  add column if not exists quota_refunded integer not null default 0
  check (quota_refunded >= 0);
alter table public.search_jobs
  add column if not exists worker_attempts integer not null default 0
  check (worker_attempts >= 0);

create or replace function public.refund_lead_quota(
  p_user uuid,
  p_qty integer,
  p_month char(7) default to_char(now(), 'YYYY-MM')
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_qty <= 0 then return; end if;
  update public.usage
     set leads_used = greatest(0, leads_used - p_qty), updated_at = now()
   where user_id = p_user and month = p_month;
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

-- Quota reservation and queue insert are one transaction: no process crash can
-- consume capacity without leaving a job that can later be refunded.
create or replace function public.create_search_job(
  p_user uuid,
  p_query text,
  p_location text,
  p_qty integer
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
    insert into public.search_jobs(user_id, query, location, quantity, status)
    values (p_user, p_query, p_location, p_qty, 'queued')
    returning *;
end;
$$;

-- Replace the original quota function so expired-canceled and past-due
-- subscriptions cannot retain paid limits if the rollover worker is delayed.
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

-- Multiple scraper replicas may poll safely; SKIP LOCKED guarantees one owner.
create or replace function public.claim_search_job()
returns setof public.search_jobs
language sql
security definer set search_path = public
as $$
  with candidate as (
    select id from public.search_jobs
     where status = 'queued'
     order by created_at
     for update skip locked
     limit 1
  )
  update public.search_jobs j
     set status = 'searching', progress = greatest(progress, 4),
         worker_attempts = worker_attempts + 1, error = null, updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
$$;

-- Worker heartbeats power readiness checks and deployment monitoring.
create table if not exists public.worker_heartbeats (
  service text primary key check (service in ('scraper','mailer')),
  instance_id text not null,
  status text not null default 'healthy',
  details jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now()
);
alter table public.worker_heartbeats enable row level security;

-- Distributed rate limits remain correct across multiple API replicas.
create table if not exists public.api_rate_limits (
  rate_key text not null,
  action text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 0,
  primary key (rate_key, action)
);
alter table public.api_rate_limits enable row level security;

-- Pending plan switches. The current paid subscription remains active until
-- Razorpay confirms the replacement, preventing abandoned checkout data loss.
create table if not exists public.billing_checkouts (
  razorpay_subscription_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('growth','agency')),
  previous_subscription_id text,
  status text not null default 'pending'
    check (status in ('pending','activated','failed','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists billing_checkouts_user_idx
  on public.billing_checkouts(user_id, created_at desc);
alter table public.billing_checkouts enable row level security;

create or replace function public.consume_rate_limit(
  p_key text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare v_count integer;
begin
  insert into public.api_rate_limits(rate_key, action, window_start, request_count)
  values (p_key, p_action, now(), 1)
  on conflict (rate_key, action) do update set
    window_start = case
      when api_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
      then now() else api_rate_limits.window_start end,
    request_count = case
      when api_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
      then 1 else api_rate_limits.request_count + 1 end
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;

-- Mail jobs need an atomic processing lease to prevent duplicate email sends.
alter table public.email_jobs add column if not exists locked_at timestamptz;
alter table public.email_jobs drop constraint if exists email_jobs_status_check;
alter table public.email_jobs add constraint email_jobs_status_check
  check (status in ('scheduled','processing','sent','failed','skipped'));
delete from public.email_jobs a
 using public.email_jobs b
 where a.campaign_lead_id = b.campaign_lead_id
   and a.step_id = b.step_id
   and a.created_at > b.created_at;
create unique index if not exists email_jobs_recipient_step_unique
  on public.email_jobs(campaign_lead_id, step_id);

create or replace function public.claim_due_email_jobs(p_limit integer default 50)
returns setof public.email_jobs
language plpgsql
security definer set search_path = public
as $$
begin
  -- Recover jobs held by workers that died mid-attempt.
  update public.email_jobs
     set status = 'scheduled', locked_at = null,
         send_at = greatest(send_at, now())
   where status = 'processing'
     and locked_at < now() - interval '15 minutes';

  return query
  with candidate as (
    select j.id
      from public.email_jobs j
      join public.campaigns c on c.id = j.campaign_id
     where j.status = 'scheduled'
       and j.send_at <= now()
       and c.status = 'active'
     order by j.send_at
     for update of j skip locked
     limit greatest(1, least(p_limit, 100))
  )
  update public.email_jobs j
     set status = 'processing', locked_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

-- Webhook events are only "processed" after business logic commits. Failed
-- deliveries can be retried; concurrent duplicates cannot process twice.
alter table public.webhook_events
  add column if not exists status text not null default 'processed'
    check (status in ('processing','processed','failed')),
  add column if not exists attempts integer not null default 1,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.claim_webhook_event(p_id text, p_event text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare v_rows integer := 0;
begin
  insert into public.webhook_events(id, event, status, attempts, processed_at, updated_at)
  values (p_id, p_event, 'processing', 1, now(), now())
  on conflict (id) do nothing;
  if found then return true; end if;

  update public.webhook_events
     set status = 'processing', attempts = attempts + 1,
         last_error = null, updated_at = now()
   where id = p_id
     and (status = 'failed' or
          (status = 'processing' and updated_at < now() - interval '5 minutes'));
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- Old migration versions used bytea before citext was guaranteed. Keep the
-- column type and document its AES-GCM hex transport; no plaintext exists.
comment on column public.email_accounts.password_enc is
  'AES-256-GCM ciphertext encoded as PostgreSQL bytea hex; never selected to clients';

-- ———————————————— Least-privilege RLS correction ————————————————
-- The original migration used FOR ALL owner policies. That lets an account
-- call PostgREST directly and set subscriptions.plan='agency' or reset usage.
-- Production mutations go through the API service role; JWT clients may read
-- their own non-secret records but cannot mutate billing/quota/worker state.
drop policy if exists "own profile" on public.profiles;
drop policy if exists "own subscription" on public.subscriptions;
drop policy if exists "own usage" on public.usage;
drop policy if exists "own search jobs" on public.search_jobs;
drop policy if exists "own leads" on public.leads;
drop policy if exists "own research" on public.ai_research;
drop policy if exists "own scores" on public.ai_scores;
drop policy if exists "own email accounts" on public.email_accounts;
drop policy if exists "own campaigns" on public.campaigns;
drop policy if exists "own campaign steps" on public.campaign_steps;
drop policy if exists "own campaign leads" on public.campaign_leads;
drop policy if exists "own email jobs" on public.email_jobs;
drop policy if exists "own email events" on public.email_events;
drop policy if exists "own suppression list" on public.suppression_list;
drop policy if exists "own billing events" on public.billing_events;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "read own usage" on public.usage
  for select using (auth.uid() = user_id);
create policy "read own search jobs" on public.search_jobs
  for select using (auth.uid() = user_id);
create policy "read own leads" on public.leads
  for select using (auth.uid() = user_id);
create policy "read own research" on public.ai_research
  for select using (auth.uid() = user_id);
create policy "read own scores" on public.ai_scores
  for select using (auth.uid() = user_id);
-- No direct SELECT policy for email_accounts: even encrypted credentials stay
-- API-only. The bootstrap endpoint returns a column allowlist without password.
create policy "read own campaigns" on public.campaigns
  for select using (auth.uid() = user_id);
create policy "read own campaign steps" on public.campaign_steps
  for select using (
    exists (select 1 from public.campaigns c
            where c.id = campaign_id and c.user_id = auth.uid())
  );
create policy "read own campaign leads" on public.campaign_leads
  for select using (
    exists (select 1 from public.campaigns c
            where c.id = campaign_id and c.user_id = auth.uid())
  );
create policy "read own email jobs" on public.email_jobs
  for select using (auth.uid() = user_id);
create policy "read own email events" on public.email_events
  for select using (auth.uid() = user_id);
create policy "read own suppression" on public.suppression_list
  for select using (auth.uid() = user_id);
create policy "read own billing events" on public.billing_events
  for select using (auth.uid() = user_id);

-- SECURITY DEFINER RPCs are backend primitives, not public API methods.
revoke all on function public.try_consume_leads(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.refund_lead_quota(uuid, integer, char)
  from public, anon, authenticated;
revoke all on function public.refund_search_job_quota(uuid)
  from public, anon, authenticated;
revoke all on function public.create_search_job(uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.increment_sent_count(uuid)
  from public, anon, authenticated;
revoke all on function public.claim_search_job()
  from public, anon, authenticated;
revoke all on function public.claim_due_email_jobs(integer)
  from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.claim_webhook_event(text, text)
  from public, anon, authenticated;

grant execute on function public.try_consume_leads(uuid, integer) to service_role;
grant execute on function public.refund_lead_quota(uuid, integer, char) to service_role;
grant execute on function public.refund_search_job_quota(uuid) to service_role;
grant execute on function public.create_search_job(uuid, text, text, integer) to service_role;
grant execute on function public.increment_sent_count(uuid) to service_role;
grant execute on function public.claim_search_job() to service_role;
grant execute on function public.claim_due_email_jobs(integer) to service_role;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.claim_webhook_event(text, text) to service_role;