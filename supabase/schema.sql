-- ============================================================================
-- Zybble — complete database schema for Supabase
-- ----------------------------------------------------------------------------
-- HOW TO RUN
--   1. Supabase Dashboard → your project → SQL Editor → "+ New query"
--   2. Paste this entire file
--   3. Click "Run" (or press Ctrl/Cmd + Enter)
--   4. Expect: "Success. No rows returned"
--
-- This script is IDEMPOTENT — running it twice is safe and will not
-- destroy data. Re-run it any time you need to repair the schema.
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ----------------------------------------------------------------------------
do $$ begin
  create type "public"."user_role" as enum ('admin', 'creator', 'buyer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "public"."course_status" as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "public"."lesson_type" as enum ('video', 'pdf', 'text');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "public"."order_status" as enum ('pending', 'paid', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "public"."settlement_status" as enum ('pending', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "public"."coupon_type" as enum ('percent', 'flat');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. TABLES
-- ----------------------------------------------------------------------------

create table if not exists "users" (
  "id"            uuid primary key default gen_random_uuid() not null,
  "name"          text not null,
  "email"         text not null,
  "password_hash" text not null,
  "role"          "user_role" default 'buyer' not null,
  "created_at"    timestamp with time zone default now() not null,
  constraint "users_email_unique" unique ("email")
);

create table if not exists "sessions" (
  "id"         uuid primary key default gen_random_uuid() not null,
  "token_hash" text not null,
  "user_id"    uuid not null,
  "expires_at" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "sessions_token_hash_unique" unique ("token_hash")
);

create table if not exists "courses" (
  "id"          uuid primary key default gen_random_uuid() not null,
  "creator_id"  uuid not null,
  "title"       text not null,
  "slug"        text not null,
  "description" text default '' not null,
  "cover_url"   text,
  "price_paise" integer default 0 not null,
  "currency"    text default 'INR' not null,
  "status"      "course_status" default 'draft' not null,
  "created_at"  timestamp with time zone default now() not null,
  "updated_at"  timestamp with time zone default now() not null,
  constraint "courses_slug_unique" unique ("slug")
);

create table if not exists "chapters" (
  "id"         uuid primary key default gen_random_uuid() not null,
  "course_id"  uuid not null,
  "title"      text not null,
  "position"   integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists "lessons" (
  "id"           uuid primary key default gen_random_uuid() not null,
  "chapter_id"   uuid not null,
  "title"        text not null,
  "type"         "lesson_type" default 'video' not null,
  "body"         text default '' not null,
  "video_url"    text,
  "file_url"     text,
  "duration_min" integer,
  "is_preview"   boolean default false not null,
  "position"     integer default 0 not null,
  "resources"    jsonb default '[]'::jsonb not null,
  "created_at"   timestamp with time zone default now() not null
);

create table if not exists "coupons" (
  "id"         uuid primary key default gen_random_uuid() not null,
  "course_id"  uuid not null,
  "code"       text not null,
  "type"       "coupon_type" not null,
  "value"      integer not null,
  "max_uses"   integer,
  "used_count" integer default 0 not null,
  "active"     boolean default true not null,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists "settlements" (
  "id"           uuid primary key default gen_random_uuid() not null,
  "creator_id"   uuid not null,
  "amount_paise" integer not null,
  "status"       "settlement_status" default 'pending' not null,
  "note"         text,
  "created_at"   timestamp with time zone default now() not null,
  "paid_at"      timestamp with time zone
);

create table if not exists "orders" (
  "id"                    uuid primary key default gen_random_uuid() not null,
  "course_id"             uuid not null,
  "buyer_id"              uuid not null,
  "coupon_id"             uuid,
  "gross_paise"           integer not null,
  "discount_paise"        integer default 0 not null,
  "net_paise"             integer not null,
  "platform_fee_paise"    integer default 0 not null,
  "creator_earning_paise" integer default 0 not null,
  "status"                "order_status" default 'pending' not null,
  "provider"              text default 'razorpay' not null,
  "provider_order_id"     text,
  "provider_payment_id"   text,
  "settlement_id"         uuid,
  "created_at"            timestamp with time zone default now() not null
);

create table if not exists "enrollments" (
  "id"         uuid primary key default gen_random_uuid() not null,
  "course_id"  uuid not null,
  "student_id" uuid not null,
  "order_id"   uuid,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists "lesson_progress" (
  "id"           uuid primary key default gen_random_uuid() not null,
  "student_id"   uuid not null,
  "lesson_id"    uuid not null,
  "course_id"    uuid not null,
  "completed_at" timestamp with time zone default now() not null
);

-- ----------------------------------------------------------------------------
-- 3. FOREIGN KEYS
-- ----------------------------------------------------------------------------
do $$ begin
  alter table "sessions" add constraint "sessions_user_id_users_id_fk"
    foreign key ("user_id") references "public"."users"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "courses" add constraint "courses_creator_id_users_id_fk"
    foreign key ("creator_id") references "public"."users"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "chapters" add constraint "chapters_course_id_courses_id_fk"
    foreign key ("course_id") references "public"."courses"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "lessons" add constraint "lessons_chapter_id_chapters_id_fk"
    foreign key ("chapter_id") references "public"."chapters"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "coupons" add constraint "coupons_course_id_courses_id_fk"
    foreign key ("course_id") references "public"."courses"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "settlements" add constraint "settlements_creator_id_users_id_fk"
    foreign key ("creator_id") references "public"."users"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "orders" add constraint "orders_course_id_courses_id_fk"
    foreign key ("course_id") references "public"."courses"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "orders" add constraint "orders_buyer_id_users_id_fk"
    foreign key ("buyer_id") references "public"."users"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "orders" add constraint "orders_coupon_id_coupons_id_fk"
    foreign key ("coupon_id") references "public"."coupons"("id") on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "orders" add constraint "orders_settlement_id_settlements_id_fk"
    foreign key ("settlement_id") references "public"."settlements"("id");
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "enrollments" add constraint "enrollments_course_id_courses_id_fk"
    foreign key ("course_id") references "public"."courses"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "enrollments" add constraint "enrollments_student_id_users_id_fk"
    foreign key ("student_id") references "public"."users"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "enrollments" add constraint "enrollments_order_id_orders_id_fk"
    foreign key ("order_id") references "public"."orders"("id") on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "lesson_progress" add constraint "lesson_progress_student_id_users_id_fk"
    foreign key ("student_id") references "public"."users"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "lesson_progress" add constraint "lesson_progress_lesson_id_lessons_id_fk"
    foreign key ("lesson_id") references "public"."lessons"("id") on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "lesson_progress" add constraint "lesson_progress_course_id_courses_id_fk"
    foreign key ("course_id") references "public"."courses"("id") on delete cascade;
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 4. INDEXES
-- ----------------------------------------------------------------------------
create index        if not exists "sessions_user_idx"         on "sessions"        using btree ("user_id");
create index        if not exists "courses_creator_idx"       on "courses"         using btree ("creator_id");
create index        if not exists "chapters_course_idx"       on "chapters"        using btree ("course_id");
create index        if not exists "lessons_chapter_idx"       on "lessons"         using btree ("chapter_id");
create unique index if not exists "coupons_course_code_idx"   on "coupons"         using btree ("course_id", "code");
create index        if not exists "settlements_creator_idx"   on "settlements"     using btree ("creator_id");
create index        if not exists "orders_course_idx"         on "orders"          using btree ("course_id");
create index        if not exists "orders_buyer_idx"          on "orders"          using btree ("buyer_id");
create index        if not exists "orders_status_idx"         on "orders"          using btree ("status");
create unique index if not exists "orders_provider_order_idx" on "orders"          using btree ("provider_order_id");
create unique index if not exists "enroll_unique_idx"         on "enrollments"     using btree ("course_id", "student_id");
create unique index if not exists "progress_unique_idx"       on "lesson_progress" using btree ("student_id", "lesson_id");
create index        if not exists "progress_course_idx"       on "lesson_progress" using btree ("course_id");
create index        if not exists "progress_student_idx"      on "lesson_progress" using btree ("student_id");

-- ----------------------------------------------------------------------------
-- 5. SECURITY — lock down Supabase's auto-generated REST API
-- ----------------------------------------------------------------------------
-- Zybble talks to Postgres directly over the connection string using the
-- `postgres` role, which bypasses RLS. Enabling RLS with NO policies means
-- Supabase's public REST/GraphQL endpoints (anon & authenticated keys) can
-- read NOTHING from these tables — your users, orders and course content are
-- not exposed to the internet, while the app keeps full access.
-- ----------------------------------------------------------------------------
alter table "users"           enable row level security;
alter table "sessions"        enable row level security;
alter table "courses"         enable row level security;
alter table "chapters"        enable row level security;
alter table "lessons"         enable row level security;
alter table "coupons"         enable row level security;
alter table "settlements"     enable row level security;
alter table "orders"          enable row level security;
alter table "enrollments"     enable row level security;
alter table "lesson_progress" enable row level security;

-- ----------------------------------------------------------------------------
-- 6. VERIFY — should return 10 rows
-- ----------------------------------------------------------------------------
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users','sessions','courses','chapters','lessons',
    'coupons','settlements','orders','enrollments','lesson_progress'
  )
order by table_name;
