begin;

create or replace function public.save_current_chart(
  target_profile_id uuid,
  target_schema_version text,
  target_engine_version text,
  target_ruleset text,
  target_birth_fingerprint text,
  target_facts jsonb
)
returns public.bazi_charts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_chart public.bazi_charts;
  created_chart public.bazi_charts;
  next_version integer;
begin
  if current_user_id is null or not public.is_admin(current_user_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = target_profile_id and owner_id = current_user_id
  ) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_profile_id::text, 0));

  select * into existing_char
  from public.bazi_charts
  where profile_id = target_profile_id and is_curren
  limit 1;

  if existing_chart.id is not null
     and existing_chart.birth_fingerprint = target_birth_fingerprin
     and existing_chart.engine_version = target_engine_version
     and existing_chart.schema_version = target_schema_version then
    return existing_chart;
  end if;

  select coalesce(max(chart_version), 0) + 1 into next_version
  from public.bazi_charts
  where profile_id = target_profile_id;

  update public.bazi_charts
  set is_current = false
  where profile_id = target_profile_id and is_current;

  insert into public.bazi_charts (
    owner_id,
    profile_id,
    chart_version,
    schema_version,
    engine_version,
    ruleset,
    birth_fingerprint,
    facts,
    is_curren
  ) values (
    current_user_id,
    target_profile_id,
    next_version,
    target_schema_version,
    target_engine_version,
    target_ruleset,
    target_birth_fingerprint,
    target_facts,
    true
  ) returning * into created_chart;

  insert into public.reports (owner_id, profile_id, status)
  values (current_user_id, target_profile_id, 'stale')
  on conflict (profile_id) do update
  set status = 'stale', updated_at = timezone('utc', now());

  return created_chart;
end;
$$;

revoke all on function public.save_current_chart(uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.save_current_chart(uuid, text, text, text, text, jsonb) to authenticated;

commit;
