begin;
create function zybble_private.post_credit(p_user uuid,p_kind text,p_amount integer,p_ref uuid,p_description text default null)
returns void language plpgsql set search_path='' as $$
declare w public.credit_wallets; b integer; r integer;
begin
 select * into strict w from public.credit_wallets where user_id=p_user for update;
 b := w.balance + case when p_kind in ('reserve','release') then 0 else p_amount end;
 r := w.reserved_balance + case when p_kind in ('reserve','consume') then p_amount when p_kind='release' then -p_amount else 0 end;
 if r<0 or b<r then raise exception 'INSUFFICIENT_CREDITS' using errcode='P0001'; end if;
 insert into public.credit_transactions(user_id,transaction_type,amount,balance_before,balance_after,reserved_before,reserved_after,reference_id,description)
 values(p_user,p_kind,p_amount,w.balance,b,w.reserved_balance,r,p_ref,p_description);
 update public.credit_wallets set balance=b,reserved_balance=r,updated_at=now() where user_id=p_user;
end $$;
revoke all on function zybble_private.post_credit(uuid,text,integer,uuid,text) from public,anon,authenticated;

-- Only the server may attest verified provider facts; compare against the frozen checkout snapshot.
create function public.grant_purchase_credits(p_purchase uuid,p_session text,p_payment text,p_product text,p_amount integer,p_currency text,p_quantity integer,p_mode text)
returns boolean language plpgsql security definer set search_path='' as $$
declare p public.credit_purchases;
begin
 select * into strict p from public.credit_purchases where id=p_purchase for update;
 if p_payment is null or p_payment='' or p_session is null or p.dodo_checkout_session_id is distinct from p_session
 or p.dodo_product_id is distinct from p_product or p.amount_minor is distinct from p_amount or p.currency is distinct from p_currency
 or p.provider_mode is distinct from p_mode or p_quantity is distinct from 1 then
  raise exception 'PAYMENT_MISMATCH' using errcode='P0001';
 end if;
 if p.fulfillment_status='fulfilled' and p.dodo_payment_id=p_payment then return false; end if;
 if p.fulfillment_status <> 'pending' or p.payment_status in ('refunded','disputed') or (p.dodo_payment_id is not null and p.dodo_payment_id<>p_payment) then
  raise exception 'PAYMENT_REVIEW_REQUIRED' using errcode='P0001';
 end if;
 update public.credit_purchases set dodo_payment_id=p_payment,payment_status='succeeded',fulfillment_status='fulfilled',updated_at=now() where id=p.id;
 perform zybble_private.post_credit(p.user_id,'purchase',p.credits,p.id);
 return true;
end $$;

create function public.reserve_generation_credits(p_user uuid,p_quote uuid,p_request uuid)
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
 if q.used_job_id is not null or q.expires_at<=now() or p.deleted_at is not null
 or not exists(select 1 from public.profiles where id=p_user and suspended_at is null and onboarding_completed) then
  raise exception 'GENERATION_NOT_ALLOWED' using errcode='P0001';
 end if;
 if q.retry_job_id is not null and not exists(select 1 from public.generation_jobs where id=q.retry_job_id and status='failed' and reservation_status='released') then
  raise exception 'RETRY_NOT_ALLOWED' using errcode='P0001';
 end if;
 select * into strict a from public.media_assets where id=p.original_media_asset_id and project_id=p.id and user_id=p_user;
 minimum := (q.settings->>'minSeconds')::integer;
 if a.asset_type <> 'original_video' or a.upload_status <> 'verified' or a.storage_status <> 'ready' or a.duration_seconds is null
 or a.duration_seconds>10800 or a.duration_seconds<minimum or q.required_credits<>ceil(a.duration_seconds/60) then
  raise exception 'SOURCE_NOT_VERIFIED' using errcode='P0001';
 end if;
 insert into public.generation_jobs(user_id,project_id,request_idempotency_key,number_of_clips_requested,min_seconds,max_seconds,aspect,reframe,captions,prompt,language,estimated_source_minutes,reserved_credits)
 values(p_user,p.id,p_request,(q.settings->>'clipCount')::integer,minimum,(q.settings->>'maxSeconds')::integer,q.settings->>'aspect',q.settings->>'reframe',q.settings->'captions',q.settings->>'prompt',q.settings->>'language',q.required_credits,q.required_credits)
 returning id into task;
 perform zybble_private.post_credit(p_user,'reserve',q.required_credits,task);
 insert into public.generation_tasks(job_id) values(task);
 update public.generation_quotes set used_job_id=task where id=q.id;
 update public.projects set status='processing',updated_at=now() where id=p.id;
 return task;
end $$;

create function public.settle_generation_credits(p_job uuid,p_billable_minutes numeric)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.generation_jobs; charge integer;
begin
 select * into strict j from public.generation_jobs where id=p_job for update;
 if j.reservation_status='consumed' then
  if j.actual_billable_usage is distinct from p_billable_minutes then raise exception 'USAGE_MISMATCH' using errcode='P0001'; end if;
  return true;
 end if;
 if j.reservation_status<>'reserved' or j.status<>'provider_succeeded' or j.clipsdk_job_id is null then raise exception 'SETTLEMENT_NOT_ALLOWED' using errcode='P0001'; end if;
 if p_billable_minutes is null or p_billable_minutes='NaN'::numeric or p_billable_minutes<=0 or p_billable_minutes>j.reserved_credits then
  update public.generation_jobs set status='review',error_code='BILLING_REVIEW',updated_at=now() where id=j.id;
  return false;
 end if;
 charge := ceil(p_billable_minutes);
 perform zybble_private.post_credit(j.user_id,'consume',-charge,j.id);
 if j.reserved_credits>charge then perform zybble_private.post_credit(j.user_id,'release',j.reserved_credits-charge,j.id); end if;
 update public.generation_jobs set reservation_status='consumed',actual_credits_consumed=charge,actual_billable_usage=p_billable_minutes,updated_at=now() where id=j.id;
 return true;
end $$;

create function public.release_generation_credits(p_job uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.generation_jobs;
begin
 select * into strict j from public.generation_jobs where id=p_job for update;
 if j.reservation_status='released' then return false; end if;
 if j.reservation_status<>'reserved' or j.status not in ('failed','cancelled') then raise exception 'RELEASE_NOT_ALLOWED' using errcode='P0001'; end if;
 perform zybble_private.post_credit(j.user_id,'release',j.reserved_credits,j.id);
 update public.generation_jobs set reservation_status='released',updated_at=now() where id=j.id;
 return true;
end $$;

create function public.get_credit_wallet()
returns table(balance integer,reserved_balance integer,available_balance integer)
language sql stable security invoker set search_path='' as $$
 select w.balance,w.reserved_balance,w.balance-w.reserved_balance from public.credit_wallets w where w.user_id=(select auth.uid());
$$;

create function public.adjust_user_credits(p_admin uuid,p_user uuid,p_delta integer,p_request uuid,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
declare w public.credit_wallets; x public.credit_transactions;
begin
 if not exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id where r.user_id=p_admin and r.role='admin' and p.suspended_at is null for share of p,r)
 then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_admin=p_user or p_delta is null or p_delta=0 or abs(p_delta::bigint)>10000 or p_reason is null or length(btrim(p_reason)) not between 8 and 500 then
  raise exception 'INVALID_ADJUSTMENT' using errcode='P0001';
 end if;
 select * into strict w from public.credit_wallets where user_id=p_user for update;
 select * into x from public.credit_transactions where transaction_type='adjustment' and reference_id=p_request;
 if found then
  if x.user_id=p_user and x.amount=p_delta and x.description=btrim(p_reason) and exists(select 1 from public.admin_audit_logs where admin_user_id=p_admin and target_record_id=p_request and action='adjust_user_credits') then return false; end if;
  raise exception 'IDEMPOTENCY_CONFLICT' using errcode='P0001';
 end if;
 perform zybble_private.post_credit(p_user,'adjustment',p_delta,p_request,btrim(p_reason));
 insert into public.admin_audit_logs(admin_user_id,action,target_user_id,target_record_id,previous_value,new_value,reason)
 values(p_admin,'adjust_user_credits',p_user,p_request,jsonb_build_object('balance',w.balance),jsonb_build_object('balance',w.balance+p_delta),btrim(p_reason));
 return true;
end $$;

create function public.take_request_limit(p_scope text,p_actor text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare bucket timestamptz; allowed boolean;
begin
 if p_limit not between 1 and 10000 or p_window_seconds not between 1 and 86400 then raise exception 'INVALID_LIMIT'; end if;
 bucket := to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
 insert into public.request_limits as r(scope,actor,window_start,count) values(p_scope,p_actor,bucket,1)
 on conflict(scope,actor,window_start) do update set count=r.count+1 where r.count<p_limit returning true into allowed;
 return coalesce(allowed,false);
end $$;

revoke all on function public.grant_purchase_credits(uuid,text,text,text,integer,text,integer,text),public.reserve_generation_credits(uuid,uuid,uuid),public.settle_generation_credits(uuid,numeric),public.release_generation_credits(uuid),public.get_credit_wallet(),public.adjust_user_credits(uuid,uuid,integer,uuid,text),public.take_request_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.grant_purchase_credits(uuid,text,text,text,integer,text,integer,text),public.reserve_generation_credits(uuid,uuid,uuid),public.settle_generation_credits(uuid,numeric),public.release_generation_credits(uuid),public.adjust_user_credits(uuid,uuid,integer,uuid,text),public.take_request_limit(text,text,integer,integer) to service_role;
grant execute on function public.get_credit_wallet() to authenticated;
commit;
