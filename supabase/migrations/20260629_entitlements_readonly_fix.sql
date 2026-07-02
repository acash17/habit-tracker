-- SECURITY FIX: entitlements must NOT be writable by the app user.
-- The original policy `"write own entitlement" FOR ALL USING (auth.uid()=user_id)`
-- let ANY signed-in user upsert their own row and set plan='pro' — i.e. unlock
-- Pro for free with a single client call, bypassing payment entirely.
--
-- Entitlements are granted ONLY by the server-side payment webhook, which uses the
-- Supabase service-role key and BYPASSES RLS. So the app needs read-only access;
-- it never needs to write this table. Drop the write policy; keep select-own.
--
-- Run in: Supabase Dashboard → SQL Editor. Safe/idempotent.

drop policy if exists "write own entitlement" on public.entitlements;

-- Ensure the read-only policy exists (owner can read their own entitlement).
drop policy if exists "read own entitlement" on public.entitlements;
create policy "read own entitlement" on public.entitlements
  for select using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy for authenticated users → the client cannot
-- grant itself Pro. The payment webhook (service role) still writes freely.
