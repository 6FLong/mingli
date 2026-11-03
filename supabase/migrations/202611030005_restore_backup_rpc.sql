begin;

create or replace function public.restore_profile_backups(
  target_owner_id uuid,
  target_backups jsonb,
  target_conflict_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  backup jsonb;
  source_profile jsonb;
  source_chart jsonb;
  source_summary jsonb;
  source_report jsonb;
  source_conversation jsonb;
  source_message jsonb;
  source_profile_id uuid;
  target_profile_id uuid;
  target_chart_id uuid;
  target_conversation_id uuid;
  source_conversation_id text;
  conversation_map jsonb;
  restored_count integer := 0;
  skipped_count integer := 0;
  restored_ids uuid[] := array[]::uuid[];
  existing boolean;
  imported_self boolean;
begin
  if target_owner_id is null or not public.is_admin(target_owner_id) then
    raise exception 'administrator required';
  end if;
  if jsonb_typeof(target_backups) <> 'array' or jsonb_array_length(target_backups) < 1 or jsonb_array_length(target_backups) > 100 then
    raise exception 'invalid backup collection';
  end if;
  if target_conflict_mode not in ('preserve', 'replace', 'copy') then
    raise exception 'invalid conflict mode';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_owner_id::text || ':restore', 0));

  for backup in select value from jsonb_array_elements(target_backups)
  loop
    if backup->>'formatVersion' <> 'mingli-backup-v1'
      or jsonb_typeof(backup->'profile') <> 'object'
      or jsonb_typeof(backup#>'{currentChart,facts}') <> 'object' then
      raise exception 'invalid backup format';
    end if;
    source_profile := backup->'profile';
    source_chart := backup->'currentChart';
    source_profile_id := (source_profile->>'id')::uuid;
    select exists(select 1 from public.profiles where id = source_profile_id and owner_id = target_owner_id) into existing;

    if existing and target_conflict_mode = 'preserve' then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    if existing and target_conflict_mode = 'replace' then
      delete from public.messages where owner_id = target_owner_id and profile_id = source_profile_id;
      delete from public.conversations where owner_id = target_owner_id and profile_id = source_profile_id;
      delete from public.client_summaries where owner_id = target_owner_id and profile_id = source_profile_id;
      delete from public.reports where owner_id = target_owner_id and profile_id = source_profile_id;
      delete from public.bazi_charts where owner_id = target_owner_id and profile_id = source_profile_id;
      delete from public.profiles where owner_id = target_owner_id and id = source_profile_id;
    end if;

    target_profile_id := case when target_conflict_mode = 'copy' or existing then gen_random_uuid() else source_profile_id end;
    if target_conflict_mode = 'replace' then target_profile_id := source_profile_id; end if;
    imported_self := coalesce((source_profile->>'is_self')::boolean, false);
    if imported_self and exists(select 1 from public.profiles where owner_id = target_owner_id and is_self = true) then
      imported_self := false;
    end if;

    insert into public.profiles (
      id, owner_id, name, gender, calendar_type, birth_date, birth_time,
      birth_time_known, lunar_leap_month, birth_place, birth_longitude,
      relation, is_self, note, last_consulted_at, created_at, updated_at
    ) values (
      target_profile_id,
      target_owner_id,
      left(coalesce(source_profile->>'name', '未命名档案'), 120),
      case when source_profile->>'gender' = 'female' then 'female' else 'male' end,
      case when source_profile->>'calendar_type' = 'lunar' then 'lunar' else 'solar' end,
      (source_profile->>'birth_date')::date,
      nullif(source_profile->>'birth_time', '')::time,
      coalesce((source_profile->>'birth_time_known')::boolean, false),
      coalesce((source_profile->>'lunar_leap_month')::boolean, false),
      left(coalesce(source_profile->>'birth_place', ''), 160),
      nullif(source_profile->>'birth_longitude', '')::numeric,
      case
        when imported_self then '本人'
        when source_profile->>'relation' = '家人' then '家人'
        else '客户'
      end,
      imported_self,
      left(coalesce(source_profile->>'note', ''), 2000),
      nullif(source_profile->>'last_consulted_at', '')::timestamptz,
      coalesce(nullif(source_profile->>'created_at', '')::timestamptz, timezone('utc', now())),
      timezone('utc', now())
    );

    target_chart_id := gen_random_uuid();
    insert into public.bazi_charts (
      id, owner_id, profile_id, chart_version, schema_version, engine_version,
      ruleset, birth_fingerprint, facts, is_current, created_at, updated_at
    ) values (
      target_chart_id, target_owner_id, target_profile_id, 1,
      'bazi-facts-v1',
      left(coalesce(source_chart->>'engine_version', source_chart#>>'{facts,engineVersion}', 'imported'), 120),
      left(coalesce(source_chart->>'ruleset', source_chart#>>'{facts,ruleset}', '传统子平暂行规则'), 500),
      left(coalesce(source_chart->>'birth_fingerprint', 'imported:' || target_profile_id::text), 500),
      source_chart->'facts', true, timezone('utc', now()), timezone('utc', now())
    );

    conversation_map := '{}'::jsonb;
    if jsonb_typeof(backup->'conversations') = 'array' then
      for source_conversation in select value from jsonb_array_elements(backup->'conversations')
      loop
        source_conversation_id := source_conversation->>'id';
        target_conversation_id := gen_random_uuid();
        conversation_map := conversation_map || jsonb_build_object(source_conversation_id, target_conversation_id::text);
        insert into public.conversations (
          id, owner_id, profile_id, chart_id, title, status, last_message_at, created_at, updated_at
        ) values (
          target_conversation_id, target_owner_id, target_profile_id, target_chart_id,
          left(coalesce(source_conversation->>'title', '恢复的咨询'), 160),
          case when source_conversation->>'status' = 'closed' then 'closed' else 'active' end,
          nullif(source_conversation->>'last_message_at', '')::timestamptz,
          coalesce(nullif(source_conversation->>'created_at', '')::timestamptz, timezone('utc', now())),
          timezone('utc', now())
        );
      end loop;
    end if;

    if jsonb_typeof(backup->'messages') = 'array' then
      for source_message in select value from jsonb_array_elements(backup->'messages')
      loop
        target_conversation_id := nullif(conversation_map->>(source_message->>'conversation_id'), '')::uuid;
        if target_conversation_id is null then continue; end if;
        insert into public.messages (
          id, owner_id, profile_id, conversation_id, chart_id, role, status,
          content, structured_content, fact_refs, idempotency_key, error_code, created_at, updated_at
        ) values (
          gen_random_uuid(), target_owner_id, target_profile_id, target_conversation_id, target_chart_id,
          case when source_message->>'role' = 'assistant' then 'assistant' else 'user' end,
          case when source_message->>'status' in ('pending','processing','failed') then source_message->>'status' else 'complete' end,
          coalesce(source_message->>'content', ''),
          source_message->'structured_content',
          coalesce(source_message->'fact_refs', '[]'::jsonb),
          null,
          left(nullif(source_message->>'error_code', ''), 80),
          coalesce(nullif(source_message->>'created_at', '')::timestamptz, timezone('utc', now())),
          timezone('utc', now())
        );
      end loop;
    end if;

    source_summary := backup->'clientSummary';
    if jsonb_typeof(source_summary) = 'object' then
      insert into public.client_summaries (owner_id, profile_id, content, version, last_consulted_at)
      values (
        target_owner_id, target_profile_id,
        coalesce(source_summary->'content', '{}'::jsonb),
        greatest(1, coalesce((source_summary->>'version')::integer, 1)),
        nullif(source_summary->>'last_consulted_at', '')::timestamptz
      );
    end if;

    source_report := backup->'report';
    if jsonb_typeof(source_report) = 'object' then
      insert into public.reports (
        owner_id, profile_id, report_core, report_version, format_version,
        storage_path, status, last_error, generated_at
      ) values (
        target_owner_id, target_profile_id,
        coalesce(source_report->'report_core', '{}'::jsonb),
        greatest(1, coalesce((source_report->>'report_version')::integer, 1)),
        'mingli-report-v1', null, 'stale', null,
        nullif(source_report->>'generated_at', '')::timestamptz
      );
    end if;

    restored_count := restored_count + 1;
    restored_ids := array_append(restored_ids, target_profile_id);
  end loop;

  return jsonb_build_object('restored', restored_count, 'skipped', skipped_count, 'profileIds', to_jsonb(restored_ids));
end;
$$;

revoke all on function public.restore_profile_backups(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.restore_profile_backups(uuid, jsonb, text) to service_role;

commit;
