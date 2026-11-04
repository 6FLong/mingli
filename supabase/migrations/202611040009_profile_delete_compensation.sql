begin;

create or replace function public.record_profile_delete_partial_failure(
  target_owner_id uuid,
  target_profile_id uuid,
  target_error_code text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_owner_id is null or not public.is_admin(target_owner_id) then
    raise exception 'administrator required';
  end if;
  if target_profile_id is null then
    raise exception 'profile required';
  end if;

  insert into public.data_deletion_log(owner_id, profile_id_hash, result, error_code)
  values (
    target_owner_id,
    encode(digest(target_owner_id::text || ':' || target_profile_id::text, 'sha256'), 'hex'),
    'partial_failure',
    left(coalesce(target_error_code, 'unknown'), 80)
  );
end;
$$;

revoke all on function public.record_profile_delete_partial_failure(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_profile_delete_partial_failure(uuid, uuid, text)
  to service_role;

commit;
