begin;
-- No authenticated column grant: changes are made only after server-side decoding.
alter table public.profiles add column avatar_object_key text;
alter table public.profiles add constraint creator_avatar_owner_path check (
  avatar_object_key is null or avatar_object_key ~ ('^avatars/' || id::text || '/[a-f0-9-]{36}\.webp$')
);
commit;
