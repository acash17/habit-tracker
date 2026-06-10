-- Cadence — complete account deletion (DPDP §12 right to erasure +
-- Google Play "account deletion" policy: deleting the account must remove the
-- account itself, not just its rows).
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run after 005_consents.sql. Idempotent.
--
-- Fixes two gaps in the previous erasure path:
--   1. `profiles` had no DELETE policy, so the client's
--      `delete from profiles where user_id = ...` silently removed 0 rows —
--      display name (personal data) survived "Erase all my data".
--   2. The `auth.users` row (email — personal data) and the job-written
--      `rhythm_cache` rows were never deleted at all.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. profiles: allow owners to delete their own row (client fallback path).
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. delete_my_account(): one-shot, transactional, complete erasure.
--    security definer (owned by postgres) so it may delete the auth.users row;
--    scoped to auth.uid() so a caller can only ever delete THEMSELF.
--    The FK `on delete cascade` chain removes goals, habit_logs, profiles,
--    consents and rhythm_cache in the same transaction.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Only signed-in users may call it; never anon or public.
revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
