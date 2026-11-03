begin;

create or replace function public.start_ai_consult(
  target_owner_id uuid,
  target_profile_id uuid,
  target_chart_id uuid,
  target_conversation_id uuid,
  target_question text,
  target_question_type text,
  target_request_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  conversation_row public.conversations%rowtype;
  user_message_row public.messages%rowtype;
  assistant_message_row public.messages%rowtype;
  user_key text := 'q:' || target_request_key;
  assistant_key text := 'a:' || target_request_key;
begin
  if target_owner_id is null or target_profile_id is null or target_chart_id is null then
    raise exception 'invalid consultation identity';
  end if;
  if char_length(target_question) < 1 or char_length(target_question) > 2000 then
    raise exception 'invalid question length';
  end if;
  if target_request_key !~ '^[A-Za-z0-9_-]{16,96}$' then
    raise exception 'invalid request key';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_owner_id::text || ':' || target_request_key, 0));

  if not exists (
    select 1 from public.profiles
    where id = target_profile_id and owner_id = target_owner_id
  ) then
    raise exception 'profile not found';
  end if;
  if not exists (
    select 1 from public.bazi_charts
    where id = target_chart_id and owner_id = target_owner_id
      and profile_id = target_profile_id and is_current = true
      and schema_version = 'bazi-facts-v1'
  ) then
    raise exception 'current chart not found';
  end if;

  select * into assistant_message_row
  from public.messages
  where owner_id = target_owner_id and idempotency_key = assistant_key;
  if found then
    select * into conversation_row from public.conversations where id = assistant_message_row.conversation_id;
    if assistant_message_row.status = 'failed' then
      update public.messages
      set status = 'processing', error_code = null
      where id = assistant_message_row.id
      returning * into assistant_message_row;
      select * into user_message_row
      from public.messages
      where owner_id = target_owner_id and idempotency_key = user_key;
      return jsonb_build_object(
        'reused', false,
        'conversationId', conversation_row.id,
        'userMessageId', user_message_row.id,
        'assistantMessageId', assistant_message_row.id,
        'status', assistant_message_row.status
      );
    end if;
    return jsonb_build_object(
      'reused', true,
      'conversationId', conversation_row.id,
      'assistantMessageId', assistant_message_row.id,
      'status', assistant_message_row.status,
      'structuredContent', assistant_message_row.structured_content,
      'errorCode', assistant_message_row.error_code
    );
  end if;

  if target_conversation_id is null then
    insert into public.conversations (owner_id, profile_id, chart_id, title, status)
    values (
      target_owner_id,
      target_profile_id,
      target_chart_id,
      left(regexp_replace(target_question, '[\r\n]+', ' ', 'g'), 80),
      'active'
    ) returning * into conversation_row;
  else
    select * into conversation_row
    from public.conversations
    where id = target_conversation_id and owner_id = target_owner_id
      and profile_id = target_profile_id and status = 'active'
    for update;
    if not found then raise exception 'conversation not found'; end if;
  end if;

  insert into public.messages (
    owner_id, profile_id, conversation_id, chart_id, role, status,
    content, structured_content, idempotency_key
  ) values (
    target_owner_id, target_profile_id, conversation_row.id, target_chart_id,
    'user', 'complete', target_question,
    jsonb_build_object('questionType', left(coalesce(target_question_type, '自定义'), 40)),
    user_key
  ) returning * into user_message_row;

  insert into public.messages (
    owner_id, profile_id, conversation_id, chart_id, role, status,
    content, structured_content, idempotency_key
  ) values (
    target_owner_id, target_profile_id, conversation_row.id, target_chart_id,
    'assistant', 'processing', '', jsonb_build_object('requestKey', target_request_key), assistant_key
  ) returning * into assistant_message_row;

  update public.conversations
  set last_message_at = user_message_row.created_at
  where id = conversation_row.id;

  return jsonb_build_object(
    'reused', false,
    'conversationId', conversation_row.id,
    'userMessageId', user_message_row.id,
    'assistantMessageId', assistant_message_row.id,
    'status', assistant_message_row.status
  );
end;
$$;

create or replace function public.finalize_ai_consult(
  target_owner_id uuid,
  target_profile_id uuid,
  target_conversation_id uuid,
  target_chart_id uuid,
  target_assistant_message_id uuid,
  target_result jsonb,
  target_fact_refs jsonb,
  target_client_summary jsonb,
  target_report_core jsonb,
  target_report_summary text,
  target_consulted_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_summary_version integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_owner_id::text || ':' || target_profile_id::text, 0));
  if jsonb_typeof(target_result) <> 'object'
    or jsonb_typeof(target_fact_refs) <> 'array'
    or jsonb_typeof(target_client_summary) <> 'object'
    or jsonb_typeof(target_report_core) <> 'object' then
    raise exception 'invalid consultation result';
  end if;

  update public.messages
  set status = 'complete',
      content = coalesce(target_result #>> '{answer,conclusion}', ''),
      structured_content = target_result,
      fact_refs = target_fact_refs,
      error_code = null
  where id = target_assistant_message_id and owner_id = target_owner_id
    and profile_id = target_profile_id and conversation_id = target_conversation_id
    and chart_id = target_chart_id and role = 'assistant' and status = 'processing';
  if not found then raise exception 'processing answer not found'; end if;

  select coalesce(version, 0) + 1 into next_summary_version
  from public.client_summaries
  where profile_id = target_profile_id;
  if next_summary_version is null then next_summary_version := 1; end if;

  insert into public.client_summaries (
    owner_id, profile_id, content, version, last_consulted_at
  ) values (
    target_owner_id, target_profile_id, target_client_summary,
    next_summary_version, target_consulted_at
  )
  on conflict (profile_id) do update
  set content = excluded.content,
      version = public.client_summaries.version + 1,
      last_consulted_at = excluded.last_consulted_at;

  insert into public.reports (
    owner_id, profile_id, report_core, status
  ) values (
    target_owner_id,
    target_profile_id,
    target_report_core || jsonb_build_object('latestSummary', left(target_report_summary, 3000)),
    'stale'
  )
  on conflict (profile_id) do update
  set report_core = excluded.report_core,
      status = 'stale',
      last_error = null;

  update public.conversations
  set last_message_at = target_consulted_at
  where id = target_conversation_id and owner_id = target_owner_id and profile_id = target_profile_id;

  update public.profiles
  set last_consulted_at = target_consulted_at
  where id = target_profile_id and owner_id = target_owner_id;

  insert into public.user_settings (owner_id, current_profile_id, last_consulted_profile_id)
  values (target_owner_id, target_profile_id, target_profile_id)
  on conflict (owner_id) do update
  set current_profile_id = excluded.current_profile_id,
      last_consulted_profile_id = excluded.last_consulted_profile_id;

  return jsonb_build_object(
    'conversationId', target_conversation_id,
    'assistantMessageId', target_assistant_message_id,
    'consultedAt', target_consulted_at
  );
end;
$$;

create or replace function public.fail_ai_consult(
  target_owner_id uuid,
  target_assistant_message_id uuid,
  target_error_code text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.messages
  set status = 'failed', error_code = left(coalesce(target_error_code, 'ai_failed'), 80)
  where id = target_assistant_message_id and owner_id = target_owner_id
    and role = 'assistant' and status = 'processing';
$$;

revoke all on function public.start_ai_consult(uuid, uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.finalize_ai_consult(uuid, uuid, uuid, uuid, uuid, jsonb, jsonb, jsonb, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.fail_ai_consult(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.start_ai_consult(uuid, uuid, uuid, uuid, text, text, text) to service_role;
grant execute on function public.finalize_ai_consult(uuid, uuid, uuid, uuid, uuid, jsonb, jsonb, jsonb, jsonb, text, timestamptz) to service_role;
grant execute on function public.fail_ai_consult(uuid, uuid, text) to service_role;

commit;
