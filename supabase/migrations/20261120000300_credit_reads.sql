begin;
-- Only transactional RPCs change the wallet or append the financial ledger.
revoke insert,update,delete on public.credit_wallets from service_role;
revoke insert on public.credit_transactions from service_role;
create function public.get_credit_summary()
returns table(available integer, reserved integer, consumed bigint)
language sql stable security invoker set search_path='' as $$
 select w.available_balance,w.reserved_balance,
 coalesce((select -sum(t.amount) from public.credit_transactions t where t.user_id=(select auth.uid()) and t.transaction_type='consume'),0)
 from public.get_credit_wallet() w;
$$;
create function public.list_credit_activity(p_filter text,p_before timestamptz default null,p_cursor uuid default null)
returns table(id uuid, created_at timestamptz, kind text, pack_slug text, amount_minor integer, currency text,
 payment_status text, fulfillment_status text, credits integer, reference_id uuid)
language sql stable security invoker set search_path='' as $$
 select a.* from (
  (select p.id,p.created_at,'purchase'::text as kind,p.pack_slug,p.amount_minor,p.currency,p.payment_status,p.fulfillment_status,p.credits,null::uuid as reference_id
   from public.credit_purchases p where p.user_id=(select auth.uid()) and p_filter in ('all','purchases')
   and (p_before is null or (p.created_at,p.id)<(p_before,p_cursor)) order by p.created_at desc,p.id desc limit 26)
   union all
  (select t.id,t.created_at,t.transaction_type,null,null,null,null,null,
   case when t.transaction_type='reserve' then -t.amount else t.amount end,t.reference_id
   from public.credit_transactions t where t.user_id=(select auth.uid()) and p_filter in ('all','usage') and t.transaction_type<>'purchase'
   and (p_before is null or (t.created_at,t.id)<(p_before,p_cursor)) order by t.created_at desc,t.id desc limit 26)
 ) a order by a.created_at desc,a.id desc limit 26;
$$;
revoke all on function public.get_credit_summary(),public.list_credit_activity(text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.get_credit_summary(),public.list_credit_activity(text,timestamptz,uuid) to authenticated;
commit;
