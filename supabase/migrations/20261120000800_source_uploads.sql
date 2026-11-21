begin;

alter table public.upload_sessions
 add column verification_token uuid,
 add column verification_started_at timestamptz,
 add column cleaned_at timestamptz;
create index upload_cleanup_queue on public.upload_sessions(expires_at) where cleaned_at is null;
create index upload_pending_owner on public.upload_sessions(user_id, expires_at) where status in ('pending','verifying');
create index projects_owner_listing on public.projects(user_id, created_at, id) where deleted_at is null;
create index completed_jobs_owner on public.generation_jobs(user_id, project_id) where status='completed' and reservation_status='consumed';
create index ready_clips_owner on public.clips(user_id, project_id) where status='ready';

-- Ownership, file limits and credit independence are also enforced at the DB boundary.
create function public.begin_source_upload(
 p_user uuid, p_project uuid, p_asset uuid, p_session uuid, p_title text,
 p_filename text, p_mime text, p_bytes bigint, p_bucket text
) returns void language plpgsql set search_path=public,pg_temp as $$
declare k text := p_user::text || '/' || p_project::text || '/' || p_asset::text;
begin
 perform 1 from public.profiles where id=p_user and onboarding_completed and suspended_at is null for update;
 if not found then raise exception 'UPLOAD_ACCOUNT_UNAVAILABLE'; end if;
 if (select count(*) from public.upload_sessions where user_id=p_user and status in ('pending','verifying') and expires_at>now()) >= 5 then
   raise exception 'UPLOAD_LIMIT_REACHED';
 end if;
 insert into public.projects(id,user_id,title) values(p_project,p_user,p_title);
 insert into public.media_assets(id,project_id,user_id,asset_type,bucket_name,object_key,original_filename,mime_type)
  values(p_asset,p_project,p_user,'original_video',p_bucket,'sources/' || k,p_filename,p_mime);
 insert into public.upload_sessions(id,user_id,project_id,asset_id,mode,expected_bytes,staging_key,expires_at)
  values(p_session,p_user,p_project,p_asset,case when p_bytes<=16777216 then 'put' else 'multipart' end,
    p_bytes,'source-staging/' || k,now()+interval '24 hours');
end $$;

create function public.verify_source_upload(
 p_user uuid, p_session uuid, p_token uuid, p_bytes bigint, p_etag text, p_mime text,
 p_duration numeric, p_width integer, p_height integer
) returns void language plpgsql set search_path=public,pg_temp as $$
declare s public.upload_sessions;
begin
 select * into s from public.upload_sessions where id=p_session and user_id=p_user for update;
 if not found or s.status<>'verifying' or s.verification_token is distinct from p_token
    or p_token is null or p_bytes is distinct from s.expected_bytes or coalesce(p_etag,'')=''
    or p_duration is null or not (p_duration>0 and p_duration<=10800)
    or p_width is null or p_width not between 1 and 8192 or p_height is null or p_height not between 1 and 8192 then
   raise exception 'UPLOAD_STATE_CONFLICT';
 end if;
 update public.media_assets set size_bytes=p_bytes,etag=p_etag,duration_seconds=p_duration,width=p_width,height=p_height,
   upload_status='verified',storage_status='ready'
 where id=s.asset_id and user_id=p_user and project_id=s.project_id and asset_type='original_video'
   and upload_status='pending' and mime_type=p_mime;
 if not found then raise exception 'UPLOAD_STATE_CONFLICT'; end if;
 update public.projects set status='uploaded',original_media_asset_id=s.asset_id,updated_at=now()
 where id=s.project_id and user_id=p_user and status='uploading' and deleted_at is null;
 if not found then raise exception 'UPLOAD_STATE_CONFLICT'; end if;
 update public.upload_sessions set status='verified',verification_token=null,verification_started_at=null where id=p_session;
end $$;

create function public.discard_source_upload(p_user uuid,p_session uuid,p_token uuid,p_expired boolean)
returns boolean language plpgsql set search_path=public,pg_temp as $$
declare s public.upload_sessions;
declare terminal text;
begin
 select * into s from public.upload_sessions where id=p_session and user_id=p_user for update;
 if not found or s.status='verified' then return false; end if;
 if s.status in ('aborted','failed') then return true; end if;
 if p_expired then
   if s.expires_at>now() or (s.status='verifying' and s.verification_started_at>now()-interval '5 minutes') then return false; end if;
 elsif p_token is null then
   if s.status<>'pending' and not (s.status='verifying' and s.verification_started_at is not null and s.verification_started_at<=now()-interval '5 minutes') then return false; end if;
 elsif s.status<>'verifying' or s.verification_token is distinct from p_token then return false;
 end if;
 terminal := case when p_token is null then 'aborted' else 'failed' end;
 update public.upload_sessions set status=terminal,verification_token=null,verification_started_at=null where id=s.id;
 update public.media_assets set upload_status=terminal,storage_status='failed'
 where id=s.asset_id and user_id=p_user and upload_status='pending';
 update public.projects set status='deleted',deleted_at=now(),updated_at=now()
 where id=s.project_id and user_id=p_user and status='uploading';
 return true;
end $$;

revoke all on function public.begin_source_upload(uuid,uuid,uuid,uuid,text,text,text,bigint,text),
 public.verify_source_upload(uuid,uuid,uuid,bigint,text,text,numeric,integer,integer),
 public.discard_source_upload(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.begin_source_upload(uuid,uuid,uuid,uuid,text,text,text,bigint,text),
 public.verify_source_upload(uuid,uuid,uuid,bigint,text,text,numeric,integer,integer),
 public.discard_source_upload(uuid,uuid,uuid,boolean) to service_role;

-- Invoker reads retain projects/jobs/clips/assets RLS; one snapshot for both figures.
create function public.ready_project_clip_counts(p_projects uuid[] default null)
returns table(project_id uuid, clip_count bigint) language sql stable set search_path=public,pg_temp as $$
 select c.project_id,count(*)
 from public.clips c
 join public.generation_jobs j on (j.id,j.project_id,j.user_id)=(c.generation_job_id,c.project_id,c.user_id)
 join public.media_assets a on (a.id,a.project_id,a.user_id)=(c.video_asset_id,c.project_id,c.user_id)
 where c.user_id=(select auth.uid()) and (p_projects is null or c.project_id=any(p_projects))
   and c.status='ready' and j.status='completed' and j.reservation_status='consumed'
   and a.asset_type='generated_video' and a.upload_status='verified' and a.storage_status='ready'
 group by c.project_id;
$$;
create function public.get_workspace_overview()
returns table(videos_processed bigint,clips_generated bigint) language sql stable set search_path=public,pg_temp as $$
 select (select count(distinct j.project_id) from public.generation_jobs j
         where j.user_id=(select auth.uid()) and j.status='completed' and j.reservation_status='consumed'),
        coalesce((select sum(clip_count)::bigint from public.ready_project_clip_counts()),0);
$$;
revoke all on function public.ready_project_clip_counts(uuid[]),public.get_workspace_overview() from public,anon;
grant execute on function public.ready_project_clip_counts(uuid[]),public.get_workspace_overview() to authenticated;
commit;
