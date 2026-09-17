-- Zybble — bounded retries for lease-reclaimed search jobs
--
-- Migration 005 only incremented worker_attempts when a job transitioned
-- from 'queued'. A job whose worker died mid-run (expired lease) was
-- reclaimed without incrementing, so a poison job could be reclaimed
-- forever. Every claim now counts as an attempt; after 3 claims without
-- completion, the cron pass fails the job and refunds unused quota.

create or replace function public.claim_search_job(
  p_provider text,
  p_lease_seconds integer default 120
)
returns setof public.search_jobs
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  with candidate as (
    select id from public.search_jobs
     where provider = p_provider
       and status not in ('complete', 'failed')
       and (lease_until is null or lease_until < now())
     order by
       case when status = 'queued' then 0 else 1 end,
       created_at
     for update skip locked
     limit 1
  )
  update public.search_jobs j
     set status = case when j.status = 'queued' then 'searching' else j.status end,
         progress = greatest(j.progress, 2),
         worker_attempts = j.worker_attempts + 1,
         lease_token = gen_random_uuid(),
         lease_until = now() + make_interval(secs => greatest(30, p_lease_seconds)),
         updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

-- Grants are preserved by CREATE OR REPLACE, but re-assert for certainty.
revoke all on function public.claim_search_job(text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_search_job(text, integer) to service_role;
