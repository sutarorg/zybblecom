begin;
-- Do not guess what historical quotes/jobs originally referred to. Unused legacy
-- quotes must be replaced; existing job IDs remain idempotently retrievable.
alter table public.generation_quotes
 add column source_asset_id uuid,
 add column source_duration_seconds numeric,
 add constraint generation_quote_source_owner_fk foreign key(source_asset_id,project_id,user_id) references public.media_assets(id,project_id,user_id),
 add constraint generation_quote_source_bound check (
   source_asset_id is not null and source_duration_seconds is not null
   and source_duration_seconds > 0 and source_duration_seconds <= 10800
 ) not valid;
alter table public.generation_jobs
 add column source_asset_id uuid,
 add column source_duration_seconds numeric,
 add constraint generation_job_source_owner_fk foreign key(source_asset_id,project_id,user_id) references public.media_assets(id,project_id,user_id);

create or replace function public.reserve_generation_credits(p_user uuid,p_quote uuid,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare q public.generation_quotes; p public.projects; a public.media_assets; existing uuid; task uuid; minimum integer;
begin
 -- Stable lock order: project, job (where applicable), then wallet. Quote is locked first only here.
 select * into strict q from public.generation_quotes where id=p_quote and user_id=p_user for update;
 select * into strict p from public.projects where id=q.project_id and user_id=p_user for update;
 select id into existing from public.generation_jobs where user_id=p_user and request_idempotency_key=p_request;
 if existing is not null then
  if existing=q.used_job_id then return existing; end if;
  raise exception 'IDEMPOTENCY_CONFLICT' using errcode='P0001';
 end if;
 if q.used_job_id is not null or q.expires_at<=clock_timestamp() or p.deleted_at is not null
 or not exists(select 1 from public.profiles where id=p_user and suspended_at is null and onboarding_completed) then
  raise exception 'GENERATION_NOT_ALLOWED' using errcode='P0001';
 end if;
 -- A terminal job label alone does not establish that the previous charge was resolved.
 if exists(select 1 from public.generation_jobs where project_id=p.id and reservation_status='reserved') then
  raise exception 'UNRESOLVED_RESERVATION' using errcode='P0001';
 end if;
 if q.retry_job_id is not null and not exists(select 1 from public.generation_jobs where id=q.retry_job_id and status='failed' and reservation_status='released') then
  raise exception 'RETRY_NOT_ALLOWED' using errcode='P0001';
 end if;
 if q.source_asset_id is null or p.original_media_asset_id is distinct from q.source_asset_id then
  raise exception 'SOURCE_QUOTE_MISMATCH' using errcode='P0001';
 end if;
 select * into strict a from public.media_assets
 where id=q.source_asset_id and project_id=p.id and user_id=p_user for share;
 if a.duration_seconds is distinct from q.source_duration_seconds then
  raise exception 'SOURCE_QUOTE_MISMATCH' using errcode='P0001';
 end if;
 minimum := (q.settings->>'minSeconds')::integer;
 if a.asset_type <> 'original_video' or a.upload_status <> 'verified' or a.storage_status <> 'ready' or a.duration_seconds is null
 or a.duration_seconds>10800 or a.duration_seconds<minimum or q.required_credits<>ceil(a.duration_seconds/60) then
  raise exception 'SOURCE_NOT_VERIFIED' using errcode='P0001';
 end if;
 insert into public.generation_jobs(user_id,project_id,request_idempotency_key,number_of_clips_requested,min_seconds,max_seconds,aspect,reframe,captions,prompt,language,estimated_source_minutes,reserved_credits,source_asset_id,source_duration_seconds)
 values(p_user,p.id,p_request,(q.settings->>'clipCount')::integer,minimum,(q.settings->>'maxSeconds')::integer,q.settings->>'aspect',q.settings->>'reframe',q.settings->'captions',q.settings->>'prompt',q.settings->>'language',q.required_credits,q.required_credits,a.id,a.duration_seconds)
 returning id into task;
 perform zybble_private.post_credit(p_user,'reserve',q.required_credits,task);
 if q.expires_at<=clock_timestamp() then
  raise exception 'GENERATION_NOT_ALLOWED' using errcode='P0001';
 end if;
 insert into public.generation_tasks(job_id) values(task);
 update public.generation_quotes set used_job_id=task where id=q.id;
 update public.projects set status='processing',updated_at=now() where id=p.id;
 return task;
end $$;

commit;
