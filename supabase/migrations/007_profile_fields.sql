-- Pacely — customer profile fields (first name, last name, phone)
-- collected via the post-sign-in profile chat and stored on the user's profile row.
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run after 006_account_deletion.sql. Idempotent.
--
-- DPDP / Play note: `phone` is additional personal data. The Privacy Policy and
-- Play Data Safety declaration are updated to reflect that phone is now collected.
-- These columns live on `public.profiles`, which already has RLS scoped to
-- auth.uid() (migration 002) and a DELETE policy + cascade for erasure (006),
-- so this data is covered by the existing access-control and right-to-erasure paths.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists phone      text;

-- No new RLS policies needed: profiles_select / profiles_insert / profiles_update
-- (from 002) and profiles_delete (from 006) already scope every row to its owner.
