-- Zybble — keep broad searches alive when a worker stops mid-sweep
--
-- A Lead Finder search can span several bounded browser slices: the worker
-- sweeps viewports until the requested number of unique businesses is
-- collected, saves a coverage cursor, and hands the job back to the queue.
--
-- If a worker is killed (redeploy, OOM, network) while it owns a job, that job
-- would previously sit in `searching`/`collecting` forever: the worker only
-- claims `queued` jobs and the in-app processor cannot run a browser.
--
-- This migration adds the missing safety net. It only touches jobs whose lease
-- is well and truly expired (default: 2 minutes), so a healthy worker that
-- extends its lease every few seconds is never disturbed.
--
-- Jobs in `deduplicating` / `enriching` / `finding_emails` are deliberately
-- excluded: those stages are finished by the in-app processor through
-- claim_recoverable_search_job (plain HTTP + DNS, no browser needed).

create or replace function public.requeue_stalled_search_jobs(
  p_provider text default 'scraper',
  p_stalled_seconds integer default 120,
  p_max_attempts integer default 6
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  affected integer := 0;
  failed_ids uuid[];
  job_id uuid;
begin
  with stalled as (
    select j.id
      from public.search_jobs j
     where j.provider in ('scraper', 'worker')
       and j.status in ('searching', 'collecting')
       and j.lease_until is not null
       and j.lease_until < now() - make_interval(secs => greatest(30, p_stalled_seconds))
     order by j.created_at
       for update skip locked
  ),
  updated as (
    update public.search_jobs j
       set status = case when j.worker_attempts < p_max_attempts then 'queued' else 'failed' end,
           error = case when j.worker_attempts < p_max_attempts then j.error else coalesce(j.error, 'The search worker stopped responding.') end,
           message = case
             when j.worker_attempts < p_max_attempts then 'Resuming the search from where it stopped…'
             else 'The search could not be completed. Any unused quota was refunded.'
           end,
           lease_until = null,
           lease_token = null,
           updated_at = now()
      from stalled s
     where j.id = s.id
    returning j.id, j.status
  )
  select array_agg(id) filter (where status = 'failed'), count(*)
    into failed_ids, affected
    from updated;

  -- Refund whatever was never collected for jobs that ran out of attempts.
  if failed_ids is not null then
    foreach job_id in array failed_ids loop
      perform public.refund_search_job_quota(job_id);
    end loop;
  end if;

  return affected;
end;
$$;

revoke all on function public.requeue_stalled_search_jobs(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.requeue_stalled_search_jobs(text, integer, integer)
  to service_role;

notify pgrst, 'reload schema';
