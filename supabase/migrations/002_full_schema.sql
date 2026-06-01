-- Cadence — full schema (goals + habit_logs + profiles)
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run after 001_init.sql (uses IF NOT EXISTS / CREATE OR REPLACE).
-- Idempotent: re-running does not error.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. GOALS  (one row per goal; sub-habits live in the `sequence` JSONB array)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id          text primary key,                       -- client-generated uuid ('g_<uuid>')
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  color       text default 'terracotta',              -- palette key
  cadence     text default 'oneoff' check (cadence in ('daily','weekly','monthly','oneoff')),
  recurring   boolean default false,
  deadline    text,                                    -- free-text label ('Every day', 'Fri', ...)
  sequence    jsonb not null default '[]'::jsonb,      -- [{id,label,est,done,why,kind,active}]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists goals_user_idx        on public.goals (user_id);
create index if not exists goals_user_updated_idx on public.goals (user_id, updated_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HABIT_LOGS  (append-only completion events; powers heatmap + rhythm insights)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  goal_id     text not null references public.goals(id) on delete cascade,
  step_id     text,                                    -- which sub-habit (null = whole goal)
  day         date not null default current_date,      -- the calendar day logged
  level       smallint not null default 1 check (level between 0 and 3),  -- intensity
  energy      smallint check (energy between 1 and 5), -- optional energy at completion
  done_at     timestamptz not null default now(),      -- exact timestamp (hour-of-day stats)
  created_at  timestamptz not null default now()
);
create index if not exists logs_user_day_idx   on public.habit_logs (user_id, day desc);
create index if not exists logs_goal_idx        on public.habit_logs (goal_id, day);
create index if not exists logs_user_doneat_idx on public.habit_logs (user_id, done_at);
-- one row per goal+day+step (upsert target for the local heatmap cache)
create unique index if not exists logs_unique_cell
  on public.habit_logs (user_id, goal_id, day, coalesce(step_id, ''));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROFILES  (one row per user; settings + energy curve)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  energy_curve jsonb default '[]'::jsonb,              -- 24 floats 0..1
  settings     jsonb default '{}'::jsonb,              -- {voice,haptics,calendar,theme,...}
  tz           text default 'UTC',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at trigger (shared)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security — each user sees ONLY their own rows
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.goals      enable row level security;
alter table public.habit_logs enable row level security;
alter table public.profiles   enable row level security;

-- goals
drop policy if exists "goals_select" on public.goals;
drop policy if exists "goals_insert" on public.goals;
drop policy if exists "goals_update" on public.goals;
drop policy if exists "goals_delete" on public.goals;
create policy "goals_select" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update" on public.goals for update using (auth.uid() = user_id);
create policy "goals_delete" on public.goals for delete using (auth.uid() = user_id);

-- habit_logs
drop policy if exists "logs_select" on public.habit_logs;
drop policy if exists "logs_insert" on public.habit_logs;
drop policy if exists "logs_update" on public.habit_logs;
drop policy if exists "logs_delete" on public.habit_logs;
create policy "logs_select" on public.habit_logs for select using (auth.uid() = user_id);
create policy "logs_insert" on public.habit_logs for insert with check (auth.uid() = user_id);
create policy "logs_update" on public.habit_logs for update using (auth.uid() = user_id);
create policy "logs_delete" on public.habit_logs for delete using (auth.uid() = user_id);

-- profiles
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_select" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = user_id);
