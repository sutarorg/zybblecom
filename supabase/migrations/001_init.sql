-- Zybble — initial schema
-- PostgreSQL (Supabase). UUIDs, FKs, indexes, constraints, RLS everywhere.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ———————————————— profiles ————————————————
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  company     text not null default '',
  from_name   text not null default '',
  created_at  timestamptz not null default now()
);

-- ———————————————— subscriptions ————————————————
create table public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete cascade,
  plan                      text not null default 'free' check (plan in ('free','growth','agency')),
  status                    text not null default 'active' check (status in ('active','canceled','past_due')),
  current_period_end        timestamptz,
  razorpay_subscription_id  text unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions(user_id);

-- ———————————————— usage (monthly lead quotas) ————————————————
create table public.usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  month       char(7) not null, -- YYYY-MM
  leads_used  integer not null default 0 check (leads_used >= 0),
  updated_at  timestamptz not null default now(),
  unique (user_id, month)
);

-- ———————————————— search_jobs (scraper worker queue) ————————————————
create table public.search_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  query       text not null,
  location    text not null,
  quantity    integer not null check (quantity between 1 and 200),
  status      text not null default 'queued'
              check (status in ('queued','searching','collecting','enriching','finding_emails','complete','failed')),
  progress    integer not null default 0 check (progress between 0 and 100),
  collected   integer not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index search_jobs_user_idx on public.search_jobs(user_id, created_at desc);
create index search_jobs_status_idx on public.search_jobs(status) where status not in ('complete','failed');

-- ———————————————— leads ————————————————
create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  job_id            uuid references public.search_jobs(id) on delete set null,
  company           text not null,
  category          text not null default '',
  address           text not null default '',
  city              text not null default '',
  state             text not null default '',
  country           text not null default '',
  phone             text,
  website           text,
  maps_url          text,
  rating            numeric(2,1) check (rating between 0 and 5),
  reviews           integer,
  hours             text,
  description       text,
  email             text,
  email_status      text check (email_status in ('verified','risky','invalid','unknown')),
  email_source_url  text,
  ai_score          smallint check (ai_score between 0 and 100),
  ai_summary        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- dedupe: one business per user per normalized name+city
  unique (user_id, company, city)
);
create index leads_user_idx on public.leads(user_id, created_at desc);
create index leads_score_idx on public.leads(user_id, ai_score desc nulls last);
create index leads_email_status_idx on public.leads(user_id, email_status);

-- ———————————————— ai_research / ai_scores (cached AI output) ————————————————
create table public.ai_research (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  summary     text not null,
  insights    jsonb not null default '[]',
  angle       text not null,
  created_at  timestamptz not null default now(),
  unique (lead_id)
);

create table public.ai_scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  score       smallint not null check (score between 0 and 100),
  verdict     text not null,
  reasons     jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  unique (lead_id)
);

-- ———————————————— email_accounts (SMTP, encrypted) ————————————————
create table public.email_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  label         text not null,
  host          text not null,
  port          integer not null check (port between 1 and 65535),
  username      text not null,
  password_enc  bytea not null, -- AES-256-GCM, encrypted with SMTP_ENCRYPTION_KEY server-side
  from_email    citext not null,
  from_name     text not null default '',
  status        text not null default 'active' check (status in ('active','error')),
  created_at    timestamptz not null default now()
);
create index email_accounts_user_idx on public.email_accounts(user_id);

-- ———————————————— campaigns ————————————————
create table public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  status      text not null default 'draft' check (status in ('draft','active','paused','completed')),
  account_id  uuid references public.email_accounts(id) on delete set null,
  total_leads integer not null default 0,
  sent_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index campaigns_user_idx on public.campaigns(user_id, created_at desc);

create table public.campaign_steps (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  position     integer not null check (position >= 1),
  day_offset   integer not null default 0 check (day_offset >= 0),
  subject      text not null,
  body         text not null,
  unique (campaign_id, position)
);

create table public.campaign_leads (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  status        text not null default 'active' check (status in ('active','completed','unsubscribed','removed')),
  current_step  integer not null default 0,
  next_send_at  timestamptz,
  unsub_token   text not null default encode(gen_random_bytes(16), 'hex'),
  created_at    timestamptz not null default now(),
  unique (campaign_id, lead_id)
);
create index campaign_leads_due_idx on public.campaign_leads(next_send_at) where status = 'active';

-- ———————————————— email_jobs / email_events ————————————————
create table public.email_jobs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  campaign_id       uuid not null references public.campaigns(id) on delete cascade,
  campaign_lead_id  uuid not null references public.campaign_leads(id) on delete cascade,
  step_id           uuid not null references public.campaign_steps(id) on delete cascade,
  lead_email        text not null,
  subject           text not null,
  body              text not null,
  send_at           timestamptz not null,
  status            text not null default 'scheduled' check (status in ('scheduled','sent','failed','skipped')),
  attempts          integer not null default 0,
  last_error        text,
  sent_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index email_jobs_due_idx on public.email_jobs(send_at) where status = 'scheduled';
create index email_jobs_user_idx on public.email_jobs(user_id, created_at desc);

create table public.email_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  campaign_id  uuid references public.campaigns(id) on delete cascade,
  email_job_id uuid references public.email_jobs(id) on delete set null,
  type         text not null check (type in ('scheduled','sent','failed','retry','suppressed','unsubscribed','bounced')),
  meta         text,
  created_at   timestamptz not null default now()
);
create index email_events_user_idx on public.email_events(user_id, created_at desc);

-- ———————————————— suppression_list ————————————————
create table public.suppression_list (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  email       citext not null,
  reason      text not null default 'unsubscribe' check (reason in ('unsubscribe','manual','bounce')),
  created_at  timestamptz not null default now(),
  unique (user_id, email)
);

-- ———————————————— Row Level Security ————————————————
alter table public.profiles          enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.usage             enable row level security;
alter table public.search_jobs       enable row level security;
alter table public.leads             enable row level security;
alter table public.ai_research       enable row level security;
alter table public.ai_scores         enable row level security;
alter table public.email_accounts    enable row level security;
alter table public.campaigns         enable row level security;
alter table public.campaign_steps    enable row level security;
alter table public.campaign_leads    enable row level security;
alter table public.email_jobs        enable row level security;
alter table public.email_events      enable row level security;
alter table public.suppression_list  enable row level security;

-- Owner-only policies (users can only ever touch their own rows).
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own subscription" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own usage" on public.usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own search jobs" on public.search_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own leads" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own research" on public.ai_research
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own scores" on public.ai_scores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own email accounts" on public.email_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own campaigns" on public.campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own campaign steps" on public.campaign_steps
  for all using (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );

create policy "own campaign leads" on public.campaign_leads
  for all using (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );

create policy "own email jobs" on public.email_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own email events" on public.email_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own suppression list" on public.suppression_list
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ———————————————— Post-signup provisioning ————————————————
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, from_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''), coalesce(new.raw_user_meta_data->>'name', ''));

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');

  insert into public.usage (user_id, month, leads_used)
  values (new.id, to_char(now(), 'YYYY-MM'), 0);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_subscriptions before update on public.subscriptions for each row execute function public.touch_updated_at();
create trigger touch_search_jobs   before update on public.search_jobs   for each row execute function public.touch_updated_at();
create trigger touch_leads         before update on public.leads         for each row execute function public.touch_updated_at();
create trigger touch_campaigns     before update on public.campaigns     for each row execute function public.touch_updated_at();
