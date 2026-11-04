begin;

-- Profiles and reports are writable from the application, but destructive
-- operations must pass through the controlled RPC or Edge Function paths.
revoke delete on public.profiles from authenticated;
revoke delete on public.reports from authenticated;
revoke delete on public.user_settings from authenticated;

-- These records are produced by deterministic chart or AI transactions.
-- The browser reads them, while controlled RPCs perform all mutations.
revoke insert, update, delete on public.bazi_charts from authenticated;
revoke insert, update, delete on public.conversations from authenticated;
revoke insert, update, delete on public.messages from authenticated;
revoke insert, update, delete on public.client_summaries from authenticated;

-- Current reports are overwritten through insert/update. Permanent removal is
-- performed by profile-delete with service-role authorization.
drop policy if exists reports_storage_delete_admin on storage.objects;

commit;
