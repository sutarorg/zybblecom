begin;
create schema if not exists zybble_private;
revoke all on schema zybble_private from public, anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict, full_name text not null default '', email text not null,
 avatar_url text, country_code text check(country_code ~ '^[A-Z]{2}$'), preferred_currency text check(preferred_currency in ('INR','USD')),
 onboarding_completed boolean not null default false, onboarding_preferences jsonb not null default '{}', preferences jsonb not null default '{}',
 suspended_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), role text not null check(role in ('user','admin')),
 created_at timestamptz not null default now(), unique(user_id,role)
);
create table public.credit_wallets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id), balance integer not null default 0,
 reserved_balance integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (balance >= 0 and reserved_balance between 0 and balance)
);
create table public.credit_transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 transaction_type text not null check(transaction_type in ('purchase','reserve','consume','release','refund','adjustment')),
 amount integer not null, balance_before integer not null, balance_after integer not null, reserved_before integer not null, reserved_after integer not null,
 reference_id uuid not null, description text, metadata jsonb not null default '{}', created_at timestamptz not null default now(),
 unique(transaction_type, reference_id), check(reserved_before between 0 and balance_before and reserved_after between 0 and balance_after),
 check (case transaction_type when 'reserve' then amount>0 and balance_after=balance_before and reserved_after-reserved_before=amount
 when 'release' then amount>0 and balance_after=balance_before and reserved_before-reserved_after=amount
 when 'consume' then amount<0 and balance_after-balance_before=amount and reserved_after-reserved_before=amount
 else balance_after-balance_before=amount and reserved_after=reserved_before end)
);
create table public.credit_purchases (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 pack_slug text not null check(pack_slug in ('starter','creator','studio')), credits integer not null check(credits>0), amount_minor integer not null check(amount_minor>0),
 currency text not null check(currency in ('INR','USD')), provider_mode text not null check(provider_mode in ('test_mode','live_mode')),
 dodo_product_id text not null, dodo_checkout_session_id text unique, dodo_payment_id text unique,
 payment_status text not null default 'pending' check(payment_status in ('pending','succeeded','failed','cancelled','expired','refunded','disputed')),
 fulfillment_status text not null default 'pending' check(fulfillment_status in ('pending','fulfilled','review','reversed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), title text not null check(length(btrim(title)) between 1 and 100),
 description text, status text not null default 'uploading' check(status in ('uploading','uploaded','processing','completed','failed','deleted')),
 original_media_asset_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(id,user_id), check((status='deleted')=(deleted_at is not null))
);
create table public.media_assets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, project_id uuid not null,
 asset_type text not null check(asset_type in ('original_video','generated_video','thumbnail','srt','vtt')),
 storage_provider text not null default 'r2' check(storage_provider='r2'), bucket_name text not null, object_key text not null,
 original_filename text, mime_type text not null, size_bytes bigint check(size_bytes>0), duration_seconds numeric check(duration_seconds>0), width integer check(width>0), height integer check(height>0),
 upload_status text not null default 'pending' check(upload_status in ('pending','verified','aborted','failed')),
 storage_status text not null default 'pending' check(storage_status in ('pending','ready','failed','deleted')),
 etag text, created_at timestamptz not null default now(), unique(bucket_name,object_key), unique(id,project_id,user_id),
 foreign key(project_id,user_id) references public.projects(id,user_id)
);
alter table public.projects add constraint projects_source_owner_fk foreign key(original_media_asset_id,id,user_id) references public.media_assets(id,project_id,user_id);
create table public.upload_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, project_id uuid not null, asset_id uuid not null,
 mode text not null check(mode in ('put','multipart')), multipart_id text, expected_bytes bigint not null check(expected_bytes between 1 and 2000000000),
 staging_key text not null unique, status text not null default 'pending' check(status in ('pending','verifying','verified','failed','aborted')),
 expires_at timestamptz not null, created_at timestamptz not null default now(), unique(asset_id),
 foreign key(asset_id,project_id,user_id) references public.media_assets(id,project_id,user_id)
);
create table public.generation_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, project_id uuid not null, clipsdk_job_id text unique,
 request_idempotency_key uuid not null, status text not null default 'submission_pending' check(status in ('pending','submission_pending','submitted','processing','provider_succeeded','copying_assets','completed','failed','cancellation_requested','cancelled','review')),
 processing_stage text check(processing_stage in ('fetching','transcribing','ranking','rendering')),
 number_of_clips_requested integer not null check(number_of_clips_requested in (3,5,10,20)),
 min_seconds integer not null, max_seconds integer not null, check ((min_seconds,max_seconds) in ((15,30),(20,60),(30,90))),
 aspect text not null check(aspect in ('9:16','1:1','4:5','16:9')), reframe text not null check(reframe in ('auto','center','none')),
 captions jsonb not null check(captions in ('"bold"','"karaoke"','"minimal"','false')), prompt text check(length(prompt)<=500), language text,
 estimated_source_minutes integer not null check(estimated_source_minutes between 1 and 180), reserved_credits integer not null check(reserved_credits>0),
 reservation_status text not null default 'reserved' check(reservation_status in ('reserved','consumed','released')),
 actual_source_duration_seconds numeric, actual_billable_usage numeric, actual_credits_consumed integer, provider_cost numeric,
 error_code text, error_message text, started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,request_idempotency_key), unique(id,project_id,user_id), foreign key(project_id,user_id) references public.projects(id,user_id)
);
create unique index generation_one_active on public.generation_jobs(project_id) where status not in ('completed','failed','cancelled');
create table public.generation_quotes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, project_id uuid not null, settings jsonb not null,
 retry_job_id uuid, required_credits integer not null check(required_credits between 1 and 180), expires_at timestamptz not null, used_job_id uuid unique references public.generation_jobs(id),
 foreign key(project_id,user_id) references public.projects(id,user_id), foreign key(retry_job_id,project_id,user_id) references public.generation_jobs(id,project_id,user_id)
);
create table public.clips (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, project_id uuid not null, generation_job_id uuid not null,
 provider_clip_id text, rank integer not null check(rank>0), score integer check(score between 0 and 100), title text not null, description text, reason text, transcript text,
 start_seconds numeric not null check(start_seconds>=0), end_seconds numeric not null check(end_seconds>start_seconds), duration_seconds numeric not null check(duration_seconds>0),
 video_asset_id uuid, thumbnail_asset_id uuid, srt_asset_id uuid, vtt_asset_id uuid, status text not null default 'pending_storage' check(status in ('pending_storage','ready','failed')),
 created_at timestamptz not null default now(), unique(generation_job_id,rank), unique(id,generation_job_id,user_id),
 foreign key(generation_job_id,project_id,user_id) references public.generation_jobs(id,project_id,user_id),
 foreign key(video_asset_id,project_id,user_id) references public.media_assets(id,project_id,user_id), foreign key(thumbnail_asset_id,project_id,user_id) references public.media_assets(id,project_id,user_id),
 foreign key(srt_asset_id,project_id,user_id) references public.media_assets(id,project_id,user_id), foreign key(vtt_asset_id,project_id,user_id) references public.media_assets(id,project_id,user_id)
);
create table public.webhook_events (
 id uuid primary key default gen_random_uuid(), provider text not null check(provider in ('clipsdk','dodo')), provider_event_id text not null, event_type text not null,
 signature_verified boolean not null, payload_sanitized jsonb not null default '{}', processing_status text not null default 'pending_reconciliation' check(processing_status in ('pending_reconciliation','processed','failed','duplicate')),
 attempt_count integer not null default 1, received_at timestamptz not null default now(), processed_at timestamptz, error_message text,
 unique(provider,provider_event_id)
);
create table public.generation_tasks (
 job_id uuid primary key references public.generation_jobs(id), status text not null default 'pending' check(status in ('pending','processing','completed','failed','review')),
 attempt_count integer not null default 0, next_retry_at timestamptz not null default now(), lease_token uuid, lease_expires_at timestamptz,
 encrypted_request text, first_attempt_at timestamptz, last_error text
);
create table public.asset_copy_tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, generation_job_id uuid not null, clip_id uuid not null,
 source_url_encrypted text, destination_object_key text not null unique, asset_type text not null check(asset_type in ('generated_video','thumbnail','srt','vtt')),
 status text not null default 'pending' check(status in ('pending','processing','completed','failed','expired')),
 attempt_count integer not null default 0, max_attempts integer not null default 8, next_retry_at timestamptz not null default now(),
 lease_token uuid, lease_expires_at timestamptz, last_error text, created_at timestamptz not null default now(), completed_at timestamptz,
 foreign key(clip_id,generation_job_id,user_id) references public.clips(id,generation_job_id,user_id), unique(clip_id,asset_type)
);
create table public.admin_audit_logs (
 id uuid primary key default gen_random_uuid(), admin_user_id uuid not null references public.profiles(id), action text not null,
 target_user_id uuid references public.profiles(id), target_record_id uuid, previous_value jsonb, new_value jsonb,
 reason text not null check(length(btrim(reason)) between 8 and 500), metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.support_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id), email text not null,
 category text, subject text not null check(length(subject) between 1 and 100), message text not null check(length(message) between 10 and 2000),
 status text not null default 'open' check(status in ('open','closed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.request_limits (
 scope text not null, actor text not null, window_start timestamptz not null, count integer not null check(count>0), primary key(scope,actor,window_start)
);

create index projects_owner_page on public.projects(user_id,created_at desc,id desc) where deleted_at is null;
create index jobs_owner_page on public.generation_jobs(user_id,created_at desc,id desc);
create index clips_owner_page on public.clips(user_id,created_at desc,id desc);
create index wallet_history_page on public.credit_transactions(user_id,created_at desc,id desc);
create index purchase_owner_page on public.credit_purchases(user_id,created_at desc,id desc);
create index generation_tasks_due on public.generation_tasks(next_retry_at) where status in ('pending','processing');
create index asset_tasks_due on public.asset_copy_tasks(next_retry_at) where status in ('pending','processing');
create index webhook_events_recent on public.webhook_events(received_at desc,id desc);
create index support_recent on public.support_requests(user_id,created_at desc);
create index admin_audit_recent on public.admin_audit_logs(created_at desc,id desc);

-- Server-side service owns all writes; customer grants are opt-in, never Supabase defaults.
do $$ declare t text; begin
 foreach t in array array['profiles','user_roles','credit_wallets','credit_transactions','credit_purchases','projects','media_assets','upload_sessions','generation_jobs','generation_quotes','clips','webhook_events','generation_tasks','asset_copy_tasks','admin_audit_logs','support_requests','request_limits'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated',t);
  execute format('grant select, insert, update, delete on public.%I to service_role',t);
 end loop;
end $$;
revoke update, delete on public.credit_transactions, public.admin_audit_logs from service_role;

create function zybble_private.sync_auth_profile() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.profiles(id,full_name,email) values(new.id,left(btrim(coalesce(new.raw_user_meta_data->>'full_name','')),100),coalesce(new.email,''))
 on conflict(id) do update set email=excluded.email,updated_at=now();
 insert into public.credit_wallets(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.user_roles(user_id,role) values(new.id,'user') on conflict do nothing;
 return new;
end $$;
revoke all on function zybble_private.sync_auth_profile() from public,anon,authenticated;
create trigger zybble_sync_auth after insert or update of email on auth.users for each row execute function zybble_private.sync_auth_profile();
insert into public.profiles(id,full_name,email) select id,left(btrim(coalesce(raw_user_meta_data->>'full_name','')),100),coalesce(email,'') from auth.users;
insert into public.credit_wallets(user_id) select id from public.profiles;
insert into public.user_roles(user_id,role) select id,'user' from public.profiles;

create policy own_profile on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy update_own_profile on public.profiles for update to authenticated using ((select auth.uid())=id and suspended_at is null) with check ((select auth.uid())=id and suspended_at is null);
grant select on public.profiles to authenticated;
grant update(full_name) on public.profiles to authenticated;
alter table public.profiles add constraint profile_name_length check(length(full_name)<=100);
create policy own_projects on public.projects for select to authenticated using(user_id=(select auth.uid()) and deleted_at is null and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.suspended_at is null));
grant select on public.projects to authenticated;
create policy own_assets on public.media_assets for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
grant select(id,user_id,project_id,asset_type,original_filename,mime_type,size_bytes,duration_seconds,width,height,upload_status,storage_status,created_at) on public.media_assets to authenticated;
create policy own_jobs on public.generation_jobs for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
grant select(id,project_id,user_id,status,processing_stage,number_of_clips_requested,min_seconds,max_seconds,aspect,reframe,captions,prompt,reserved_credits,reservation_status,actual_credits_consumed,started_at,completed_at,created_at,updated_at) on public.generation_jobs to authenticated;
create policy own_clips on public.clips for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
grant select on public.clips to authenticated;
do $$ declare t text; begin
 foreach t in array array['credit_wallets','credit_transactions','credit_purchases'] loop
 execute format('create policy own_rows on public.%I for select to authenticated using (user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.suspended_at is null))',t);
 end loop;
end $$;
grant select on public.credit_wallets to authenticated;
grant select(id,user_id,transaction_type,amount,balance_before,balance_after,reserved_before,reserved_after,reference_id,created_at) on public.credit_transactions to authenticated;
grant select(id,user_id,pack_slug,credits,amount_minor,currency,payment_status,fulfillment_status,created_at,updated_at) on public.credit_purchases to authenticated;
commit;
