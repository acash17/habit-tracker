-- Cadence — daily rhythm precompute (nightly pg_cron rollup + delta-friendly RPC)
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run after 003_rhythm.sql. Idempotent.
--
-- PREREQUISITE: enable the pg_cron extension once in
--   Supabase → Database → Extensions → search "pg_cron" → enable.
-- (The create-extension statement below also works if your role has rights.)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. rhythm_cache — precomputed weekday×hour totals per user (job-written only).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.rhythm_cache (
  user_id    uuid not null references auth.users(id) on delete cascade,
  dow        int  not null,
  hour       int  not null,
  total      bigint not null default 0,
  updated_at timestamptz not null default now(),  -- run time; also the delta cutoff
  primary key (user_id, dow, hour)
);

alter table public.rhythm_cache enable row level security;
-- Read-only to the owner; only the security-definer job writes it.
drop policy if exists "rhythm_cache_select" on public.rhythm_cache;
create policy "rhythm_cache_select" on public.rhythm_cache
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. refresh_rhythm_cache — full rollup from habit_logs, in each user's timezone.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.refresh_rhythm_cache()
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.rhythm_cache;
  insert into public.rhythm_cache (user_id, dow, hour, total, updated_at)
  select
    l.user_id,
    extract(dow  from (l.done_at at time zone coalesce(p.tz, 'UTC')))::int,
    extract(hour from (l.done_at at time zone coalesce(p.tz, 'UTC')))::int,
    sum(l.level)::bigint,
    now()
  from public.habit_logs l
  left join public.profiles p on p.user_id = l.user_id
  group by 1, 2, 3;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. rhythm_by_hour — add an optional p_since filter so the client can fetch only
--    the delta (rows logged since the last nightly run) on top of the cache.
--    Drop the 1-arg version first to avoid overload ambiguity from PostgREST.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.rhythm_by_hour(text);
create or replace function public.rhythm_by_hour(p_tz text default 'UTC', p_since timestamptz default null)
returns table(dow int, hour int, total bigint)
language sql security definer set search_path = public as $$
  select
    extract(dow  from (done_at at time zone p_tz))::int as dow,
    extract(hour from (done_at at time zone p_tz))::int as hour,
    sum(level)::bigint as total
  from public.habit_logs
  where user_id = auth.uid()
    and (p_since is null or done_at >= p_since)
  group by 1, 2
  order by 1, 2;
$$;
grant execute on function public.rhythm_by_hour(text, timestamptz) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Schedule the nightly rollup. pg_cron runs in UTC on Supabase, so to hit a
--    fixed LOCAL time we convert: 02:00 IST (UTC+5:30) = 20:30 UTC → '30 20 * * *'.
--    Change this expression for a different time/zone. Idempotent: drop any
--    existing job of the same name first.
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job where jobname = 'refresh-rhythm-cache';
exception when others then
  -- pg_cron not yet available or no existing job — ignore.
  null;
end $$;

select cron.schedule(
  'refresh-rhythm-cache',
  '30 20 * * *',  -- 20:30 UTC = 02:00 IST, every day
  $$select public.refresh_rhythm_cache();$$
);
