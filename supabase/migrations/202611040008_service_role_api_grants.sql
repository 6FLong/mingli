begin;

-- Edge Functions use the service-role key through PostgREST. RLS bypass alone
-- does not grant SQL privileges, so expose only the tables and operations each
-- controlled server function needs.
grant usage on schema public to service_role;

grant select on public.admin_users to service_role;
grant select on public.profiles to service_role;
grant select on public.bazi_charts to service_role;
grant select on public.messages to service_role;
grant select on public.client_summaries to service_role;
grant select on public.reports to service_role;

grant select, insert on public.login_events to service_role;

commit;
