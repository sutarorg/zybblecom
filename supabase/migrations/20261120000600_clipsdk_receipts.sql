-- Correlate and durably deduplicate within the same transaction, without changing
-- job status or credit balances. A reconciler must retrieve authoritative state.
create function public.record_clipsdk_receipt(p_provider_job text, p_event text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_job uuid;
begin
 if p_provider_job is null or p_provider_job !~ '^job_[a-z0-9]{20}$'
    or p_event is null or p_event not in ('job.succeeded','job.failed') then
  raise exception 'INVALID_CLIPSDK_RECEIPT' using errcode = '22023';
 end if;
 select id into v_job from public.generation_jobs
  where clipsdk_job_id = p_provider_job for share;
 if not found then return false; end if;
 insert into public.webhook_events(provider,provider_event_id,event_type,signature_verified,payload_sanitized)
 values ('clipsdk',p_provider_job || ':' || substring(p_event from 5),p_event,true,
         jsonb_build_object('jobId',v_job,'providerJobId',p_provider_job))
 on conflict (provider,provider_event_id) do nothing;
 -- If stored data conflict with the current binding, never acknowledge it.
 return exists(select 1 from public.webhook_events where provider='clipsdk'
  and provider_event_id=p_provider_job || ':' || substring(p_event from 5)
  and event_type=p_event and signature_verified
  and payload_sanitized=jsonb_build_object('jobId',v_job,'providerJobId',p_provider_job));
end;
$$;
revoke all on function public.record_clipsdk_receipt(text,text) from public, anon, authenticated;
grant execute on function public.record_clipsdk_receipt(text,text) to service_role;
