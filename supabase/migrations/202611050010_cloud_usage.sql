begin;

create or replace function public.get_cloud_usage(target_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  database_bytes bigint := 0;
  report_bytes bigint := 0;
  profile_count bigint := 0;
  message_count bigint := 0;
  report_count bigint := 0;
begin
  if target_owner_id is null then
    raise exception 'owner_required';
  end if;

  select pg_database_size(current_database()) into database_bytes;

  select coalesce(sum(
    case
      when metadata ->> 'size' ~ '^[0-9]+$' then (metadata ->> 'size')::bigint
      else 0
    end
  ), 0)
  into report_bytes
  from storage.objects
  where bucket_id = 'reports'
    and name like target_owner_id::text || '/%';

  select count(*) into profile_count from public.profiles where owner_id = target_owner_id;
  select count(*) into message_count from public.messages where owner_id = target_owner_id;
  select count(*) into report_count from public.reports where owner_id = target_owner_id;

  return jsonb_build_object(
    'databaseBytes', database_bytes,
    'reportBytes', report_bytes,
    'profileCount', profile_count,
    'messageCount', message_count,
    'reportCount', report_count
  );
end;
$$;

revoke all on function public.get_cloud_usage(uuid) from public, anon, authenticated;
grant execute on function public.get_cloud_usage(uuid) to service_role;

commit;
