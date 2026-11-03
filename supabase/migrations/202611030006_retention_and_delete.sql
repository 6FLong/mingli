begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists retention_due_at timestamptz,
  add column if not exists retention_expired_at timestamptz;

create index if not exists profiles_retention_due_idx
  on public.profiles(owner_id, retention_due_at)
  where relation = '客户';

create or replace function public.apply_profile_retention_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  basis timestamptz;
begin
  if new.relation <> '客户' then
    new.retention_due_at := null;
    new.retention_expired_at := null;
    return new;
  end if;
  basis := coalesce(new.last_consulted_at, new.created_at, now());
  new.retention_due_at := basis + interval '90 days';
  new.retention_expired_at := case when now() >= new.retention_due_at then new.retention_due_at else null end;
  return new;
end;
$$;

drop trigger if exists profiles_apply_retention_status on public.profiles;
create trigger profiles_apply_retention_status
before insert or update of relation, last_consulted_at, created_at
on public.profiles
for each row execute function public.apply_profile_retention_status();

create or replace function public.refresh_client_retention_status()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed integer;
begin
  update public.profiles
  set retention_due_at = coalesce(last_consulted_at, created_at) + interval '90 days',
      retention_expired_at = case
        when now() >= coalesce(last_consulted_at, created_at) + interval '90 days'
          then coalesce(last_consulted_at, created_at) + interval '90 days'
        else null
      end
  where relation = '客户'
    and (
      retention_due_at is distinct from coalesce(last_consulted_at, created_at) + interval '90 days'
      or retention_expired_at is distinct from case
        when now() >= coalesce(last_consulted_at, created_at) + interval '90 days'
          then coalesce(last_consulted_at, created_at) + interval '90 days'
        else null
      end
    );
  get diagnostics changed = row_count;

  update public.profiles
  set retention_due_at = null, retention_expired_at = null
  where relation <> '客户' and (retention_due_at is not null or retention_expired_at is not null);
  return changed;
end;
$$;

select public.refresh_client_retention_status();

create extension if not exists pg_cron with schema pg_catalog;
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'mingli-refresh-client-retention') then
    perform cron.schedule(
      'mingli-refresh-client-retention',
      '15 16 * * *',
      'select public.refresh_client_retention_status();'
    );
  end if;
end;
$$;

revoke all on function public.refresh_client_retention_status() from public, anon, authenticated;
grant execute on function public.refresh_client_retention_status() to service_role;

create or replace function public.delete_profile_permanently(
  target_owner_id uuid,
  target_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_hash text;
  message_count integer;
  conversation_count integer;
  chart_count integer;
begin
  if target_owner_id is null or not public.is_admin(target_owner_id) then
    raise exception 'administrator required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_owner_id::text || ':' || target_profile_id::text, 0));
  if not exists(select 1 from public.profiles where id = target_profile_id and owner_id = target_owner_id) then
    raise exception 'profile not found';
  end if;

  select count(*) into message_count from public.messages where owner_id = target_owner_id and profile_id = target_profile_id;
  select count(*) into conversation_count from public.conversations where owner_id = target_owner_id and profile_id = target_profile_id;
  select count(*) into chart_count from public.bazi_charts where owner_id = target_owner_id and profile_id = target_profile_id;
  profile_hash := encode(digest(target_owner_id::text || ':' || target_profile_id::text, 'sha256'), 'hex');

  delete from public.messages where owner_id = target_owner_id and profile_id = target_profile_id;
  delete from public.conversations where owner_id = target_owner_id and profile_id = target_profile_id;
  delete from public.client_summaries where owner_id = target_owner_id and profile_id = target_profile_id;
  delete from public.reports where owner_id = target_owner_id and profile_id = target_profile_id;
  delete from public.bazi_charts where owner_id = target_owner_id and profile_id = target_profile_id;
  delete from public.profiles where owner_id = target_owner_id and id = target_profile_id;

  insert into public.data_deletion_log(owner_id, profile_id_hash, result)
  values (target_owner_id, profile_hash, 'success');

  return jsonb_build_object(
    'deleted', true,
    'messages', message_count,
    'conversations', conversation_count,
    'charts', chart_count
  );
exception when others then
  if target_owner_id is not null and target_profile_id is not null then
    insert into public.data_deletion_log(owner_id, profile_id_hash, result, error_code)
    values (target_owner_id, coalesce(profile_hash, 'unavailable'), 'failed', left(sqlstate, 80));
  end if;
  return jsonb_build_object('deleted', false, 'errorCode', sqlstate);
end;
$$;

revoke all on function public.delete_profile_permanently(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_profile_permanently(uuid, uuid) to service_role;

commit;
