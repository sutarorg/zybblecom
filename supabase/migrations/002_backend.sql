-- Zybble — backend hardening migration
-- Adds server-side usage enforcement, billing tables, webhook
-- idempotency, bounce/reply event types, and lead notes.

-- ———————————————— lead notes ————————————————
alter table public.leads add column if not exists notes text;

-- ———————————————— reply event type ————————————————
alter table public.email_events drop constraint if exists email_events_type_check;
alter table public.email_events
  add constraint email_events_type_check
  check (type in ('scheduled','sent','failed','retry','suppressed','unsubscribed','bounced','replied'));

-- ———————————————— billing_events ————————————————
create table if not exists public.billing_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('checkout','upgraded','downgraded','canceled','renewed','payment_failed')),
  meta        text,
  created_at  timestamptz not null default now()
);
create index if not exists billing_events_user_idx on public.billing_events(user_id, created_at desc);
alter table public.billing_events enable row level security;
create policy "own billing events" on public.billing_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ———————————————— billing_plans (service-role only) ————————————————
create table if not exists public.billing_plans (
  id                text primary key, -- 'growth' | 'agency'
  razorpay_plan_id  text not null unique,
  updated_at        timestamptz not null default now()
);
alter table public.billing_plans enable row level security;
-- No policies: accessible only through the service role.

-- ———————————————— webhook_events (idempotency) ————————————————
create table if not exists public.webhook_events (
  id           text primary key, -- x-razorpay-event-id
  event        text not null,
  processed_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;
-- No policies: service-role only. Duplicate inserts raise a conflict,
-- which the webhook handler treats as "already processed".

-- ———————————————— atomic usage enforcement ————————————————
-- Atomically consumes `p_qty` leads from the user's monthly quota.
-- Returns true only when the plan's limit would not be exceeded.
create or replace function public.try_consume_leads(p_user uuid, p_qty integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_plan   text;
  v_limit  integer;
  v_month  char(7) := to_char(now(), 'YYYY-MM');
begin
  select coalesce(
    (select s.plan from public.subscriptions s where s.user_id = p_user),
    'free'
  ) into v_plan;

  v_limit := case v_plan
    when 'agency' then 20000
    when 'growth' then 5000
    else 100
  end;

  insert into public.usage (user_id, month, leads_used)
  values (p_user, v_month, 0)
  on conflict (user_id, month) do nothing;

  update public.usage
     set leads_used = leads_used + p_qty,
         updated_at = now()
   where user_id = p_user
     and month = v_month
     and leads_used + p_qty <= v_limit;

  return found;
end;
$$;

-- ———————————————— atomic campaign sent counter ————————————————
create or replace function public.increment_sent_count(p_campaign uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.campaigns
     set sent_count = sent_count + 1,
         updated_at = now()
   where id = p_campaign;
$$;
