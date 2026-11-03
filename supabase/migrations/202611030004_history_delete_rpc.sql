begin;

create or replace function public.delete_consultation_history(
  target_message_id uuid default null,
  target_conversation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_profile_id uuid;
begin
  if current_user_id is null or not public.is_admin(current_user_id) then
    raise exception 'administrator required';
  end if;
  if (target_message_id is null) = (target_conversation_id is null) then
    raise exception 'exactly one history target is required';
  end if;

  if target_message_id is not null then
    select profile_id into target_profile_id
    from public.messages
    where id = target_message_id and owner_id = current_user_id
    for update;
    if not found then raise exception 'message not found'; end if;
    delete from public.messages where id = target_message_id and owner_id = current_user_id;
  else
    select profile_id into target_profile_id
    from public.conversations
    where id = target_conversation_id and owner_id = current_user_id
    for update;
    if not found then raise exception 'conversation not found'; end if;
    delete from public.conversations where id = target_conversation_id and owner_id = current_user_id;
  end if;

  update public.client_summaries
  set content = content || jsonb_build_object(
    'needsRebuild', true,
    'rebuildReason', 'history_deleted',
    'rebuildRequestedAt', timezone('utc', now())
  )
  where owner_id = current_user_id and profile_id = target_profile_id;

  update public.reports
  set status = 'stale',
      report_core = report_core || jsonb_build_object(
        'needsRebuild', true,
        'rebuildReason', 'history_deleted',
        'rebuildRequestedAt', timezone('utc', now())
      )
  where owner_id = current_user_id and profile_id = target_profile_id;

  return jsonb_build_object(
    'profileId', target_profile_id,
    'summaryNeedsRebuild', true,
    'reportNeedsRebuild', true
  );
end;
$$;

revoke all on function public.delete_consultation_history(uuid, uuid) from public, anon;
grant execute on function public.delete_consultation_history(uuid, uuid) to authenticated;

commit;
