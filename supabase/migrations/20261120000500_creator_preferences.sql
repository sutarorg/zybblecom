begin;
-- Authenticated callers may update only these two fields on their own active profile.
-- Retain unrelated settings; notification delivery is not implemented.
create function public.save_creator_preferences(p_aspect text,p_captions text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_aspect is null or p_aspect not in ('9:16','1:1','4:5','16:9')
    or p_captions is null or p_captions not in ('bold','karaoke','minimal','clean') then
  raise exception 'INVALID_CREATOR_PREFERENCES' using errcode='22023';
 end if;
 update public.profiles
 set preferences=preferences || jsonb_build_object('defaultAspect',p_aspect,'defaultCaptions',p_captions),updated_at=now()
 where id=(select auth.uid()) and suspended_at is null and jsonb_typeof(preferences)='object';
 return found;
end $$;
revoke all on function public.save_creator_preferences(text,text) from public,anon,authenticated,service_role;
grant execute on function public.save_creator_preferences(text,text) to authenticated;
commit;
