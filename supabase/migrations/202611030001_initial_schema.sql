begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.admin_users (user_id)
values ('3ee8e734-ffad-4a5e-b1b9-4582b751a73f')
on conflict (user_id) do nothing;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = check_user_id
  );
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  gender text not null check (gender in ('male', 'female')),
  calendar_type text not null check (calendar_type in ('solar', 'lunar')),
  birth_date date not null,
  birth_time time,
  birth_time_known boolean not null default true,
  lunar_leap_month boolean not null default false,
  birth_place text not null default '',
  birth_longitude numeric(7, 4),
  relation text not null check (relation in ('本人', '家人', '客户')),
  is_self boolean not null default false,
  note text not null default '' check (char_length(note) <= 2000),
  last_consulted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_time_consistency check (
    (birth_time_known and birth_time is not null)
    or (not birth_time_known and birth_time is null)
  ),
  constraint profiles_self_relation check (not is_self or relation = '本人')
);

create unique index profiles_one_self_per_owner
  on public.profiles(owner_id)
  where is_self;
create index profiles_owner_activity_idx
  on public.profiles(owner_id, last_consulted_at desc nulls last, updated_at desc);
create index profiles_owner_relation_idx
  on public.profiles(owner_id, relation);

create table public.bazi_charts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  chart_version integer not null check (chart_version > 0),
  schema_version text not null default 'bazi-facts-v1',
  engine_version text not null,
  ruleset text not null,
  birth_fingerprint text not null,
  facts jsonb not null check (jsonb_typeof(facts) = 'object'),
  is_current boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, chart_version)
);

create unique index bazi_charts_one_current_per_profile
  on public.bazi_charts(profile_id)
  where is_current;
create index bazi_charts_owner_profile_idx
  on public.bazi_charts(owner_id, profile_id, created_at desc);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  chart_id uuid not null references public.bazi_charts(id) on delete restrict,
  title text not null default '新咨询' check (char_length(title) between 1 and 160),
  status text not null default 'active' check (status in ('active', 'closed')),
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index conversations_profile_activity_idx
  on public.conversations(owner_id, profile_id, last_message_at desc nulls last, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  chart_id uuid not null references public.bazi_charts(id) on delete restrict,
  role text not null check (role in ('user', 'assistant')),
  status text not null default 'complete' check (status in ('pending', 'processing', 'complete', 'failed')),
  content text not null default '',
  structured_content jsonb,
  fact_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(fact_refs) = 'array'),
  idempotency_key text,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index messages_owner_idempotency_idx
  on public.messages(owner_id, idempotency_key)
  where idempotency_key is not null;
create index messages_conversation_page_idx
  on public.messages(conversation_id, created_at desc, id desc);

create table public.client_summaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade unique,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  version integer not null default 1 check (version > 0),
  last_consulted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade unique,
  report_core jsonb not null default '{}'::jsonb check (jsonb_typeof(report_core) = 'object'),
  report_version integer not null default 1 check (report_version > 0),
  format_version text not null default 'mingli-report-v1',
  storage_path text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'stale', 'failed')),
  last_error text,
  generated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  current_profile_id uuid references public.profiles(id) on delete set null,
  last_consulted_profile_id uuid references public.profiles(id) on delete set null,
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'admin_login_success',
    'invalid_credentials',
    'non_admin_attempt',
    'non_admin_authenticated_blocked',
    'rate_limited'
  )),
  account_identifier text not null check (char_length(account_identifier) between 1 and 320),
  occurred_at timestamptz not null default timezone('utc', now()),
  device_summary text not null default '',
  ip_hash text not null default '',
  ip_masked text not null default '',
  country_code text not null default '',
  region_name text not null default '',
  city_name text not null default '',
  location_source text not null default '',
  risk_level text not null default 'normal' check (risk_level in ('normal', 'warning', 'high')),
  read_at timestamptz
);

create index login_events_time_idx on public.login_events(occurred_at desc);
create index login_events_unread_risk_idx
  on public.login_events(read_at, occurred_at desc)
  where risk_level <> 'normal';

create table public.data_deletion_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  profile_id_hash text not null,
  deleted_at timestamptz not null default timezone('utc', now()),
  result text not null check (result in ('success', 'partial_failure', 'failed')),
  error_code text
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'bazi_charts', 'conversations', 'messages',
    'client_summaries', 'reports', 'user_settings'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end;
$$;

alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.bazi_charts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.client_summaries enable row level security;
alter table public.reports enable row level security;
alter table public.user_settings enable row level security;
alter table public.login_events enable row level security;
alter table public.data_deletion_log enable row level security;

create policy admin_users_select_self on public.admin_users
  for select to authenticated
  using (user_id = auth.uid() and public.is_admin());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'bazi_charts', 'conversations', 'messages',
    'client_summaries', 'reports', 'user_settings'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (owner_id = auth.uid() and public.is_admin())',
      table_name || '_select_admin_owner',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (owner_id = auth.uid() and public.is_admin())',
      table_name || '_insert_admin_owner',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (owner_id = auth.uid() and public.is_admin()) with check (owner_id = auth.uid() and public.is_admin())',
      table_name || '_update_admin_owner',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (owner_id = auth.uid() and public.is_admin())',
      table_name || '_delete_admin_owner',
      table_name
    );
  end loop;
end;
$$;

create policy login_events_select_admin on public.login_events
  for select to authenticated
  using (public.is_admin());
create policy login_events_mark_read_admin on public.login_events
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy deletion_log_select_admin on public.data_deletion_log
  for select to authenticated
  using (owner_id = auth.uid() and public.is_admin());

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.bazi_charts to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.client_summaries to authenticated;
grant select, insert, update, delete on public.reports to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select on public.login_events to authenticated;
grant update (read_at) on public.login_events to authenticated;
grant select on public.data_deletion_log to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,
  20971520,
  array['application/pdf', 'application/zip', 'application/json']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy reports_storage_select_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and public.is_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy reports_storage_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reports'
    and public.is_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy reports_storage_update_admin on storage.objects
  for update to authenticated
  using (
    bucket_id = 'reports'
    and public.is_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'reports'
    and public.is_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy reports_storage_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'reports'
    and public.is_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
