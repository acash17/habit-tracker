-- Cadence — consent ledger (DPDP Act 2023: the Data Fiduciary's record of consent)
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run after 002_full_schema.sql. Idempotent.

-- One row per user per policy version: proves who consented, to what, and when.
create table if not exists public.consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  policy_version int  not null,
  items          jsonb not null default '[]'::jsonb,   -- e.g. ["privacy_tos","age_18_or_guardian"]
  agreed_at      timestamptz not null,                 -- when the user ticked the boxes
  created_at     timestamptz not null default now(),
  unique (user_id, policy_version)                      -- upsert target for re-sign-ins
);
create index if not exists consents_user_idx on public.consents (user_id);

-- Row-Level Security: a user can read and write only their own consent rows.
alter table public.consents enable row level security;
drop policy if exists "consents_select" on public.consents;
drop policy if exists "consents_insert" on public.consents;
drop policy if exists "consents_update" on public.consents;
drop policy if exists "consents_delete" on public.consents;
create policy "consents_select" on public.consents for select using (auth.uid() = user_id);
create policy "consents_insert" on public.consents for insert with check (auth.uid() = user_id);
create policy "consents_update" on public.consents for update using (auth.uid() = user_id);
create policy "consents_delete" on public.consents for delete using (auth.uid() = user_id);
