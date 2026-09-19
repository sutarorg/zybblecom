-- Zybble — multiple published phones/emails, and Razorpay plans bound to a key
--
-- Two production fixes, both idempotent and safe to run repeatedly in the
-- Supabase SQL editor.
--
-- 1) Contact details.
--    Emails have exactly one source: the pinned google-maps-scraper engine
--    (`-email`), which reads what each business publishes on its own website.
--    A listing can publish several addresses and several phone numbers, and
--    until now only the first one could be stored. `leads.emails` and
--    `leads.phones` keep them all; `leads.email` / `leads.phone` stay as the
--    primary contact so every existing surface (outreach, CSV, filters) keeps
--    working unchanged.
--
--    Backfill is deliberate and conservative: existing single values are
--    promoted into the arrays only when they are non-null and non-empty. No
--    address is ever invented, normalised into existence or duplicated here.
--
-- 2) Razorpay plan cache.
--    `billing_plans` cached one `razorpay_plan_id` per plan name for the whole
--    database. Razorpay plan ids only exist inside the account (and mode) that
--    created them, so after switching test ↔ live keys — or rotating an
--    account — the cached id referred to a plan that the current key cannot
--    see. Creating a subscription with it failed with Razorpay's
--    "The ID provided is invalid or could not be found."
--    `razorpay_key_id` records which key created the plan; a mismatch (including
--    the null recorded for every row that predates this migration) makes the
--    runtime re-check the id against Razorpay and re-provision when the current
--    key cannot see it.

-- ———————————————— 1) leads: every published contact ————————————————

alter table public.leads
  add column if not exists emails text[] not null default '{}'::text[],
  add column if not exists phones text[] not null default '{}'::text[];

-- Promote existing single values into the arrays (idempotent: a row whose
-- array already carries the value is left untouched).
update public.leads
   set emails = array[email]
 where email is not null
   and btrim(email) <> ''
   and not (email = any (emails));

update public.leads
   set phones = array[phone]
 where phone is not null
   and btrim(phone) <> ''
   and not (phone = any (phones));

-- Listing views filter by "has an email" and sort by row age; the primary
-- column is what the UI reads first.
create index if not exists leads_primary_email_idx
  on public.leads(user_id, created_at desc)
  where email is not null;

comment on column public.leads.emails is
  'Every valid address the scraping engine published for this business (cap 5). The primary one is leads.email.';
comment on column public.leads.phones is
  'Every valid phone number the listing published (cap 3). The primary one is leads.phone.';

-- ———————————————— 2) billing_plans: scope the plan cache to a key ————————————————

alter table public.billing_plans
  add column if not exists razorpay_key_id text;

comment on column public.billing_plans.razorpay_key_id is
  'Razorpay key that created this plan. A different key means the cached plan id is unusable and must be re-provisioned.';

-- A NULL plan id means "not provisioned for the configured key yet", which the
-- runtime fills in on the next checkout. The unique guarantee only needs to
-- hold for ids that exist, so a partial index replaces the old constraint.
alter table public.billing_plans
  alter column razorpay_plan_id drop not null;
alter table public.billing_plans
  drop constraint if exists billing_plans_razorpay_plan_id_key;
create unique index if not exists billing_plans_razorpay_plan_id_uniq
  on public.billing_plans(razorpay_plan_id)
  where razorpay_plan_id is not null;
