-- Cadence — rhythm aggregation + per-cell upsert target
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run after 002_full_schema.sql. Idempotent.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Per-cell upsert target. PostgREST upsert .onConflict('...') needs a plain
--    unique constraint on the exact columns — it can target neither the
--    functional index from 002 (coalesce(step_id,'')) nor a partial index
--    (it can't emit the WHERE predicate). So make step_id NOT NULL DEFAULT ''
--    (whole-goal completions use ''; future sub-habit rows carry a real step_id)
--    and add a plain composite unique constraint. This is what the 002
--    functional index was approximating, and is forward-compatible with Phase 2.
-- ─────────────────────────────────────────────────────────────────────────────
update public.habit_logs set step_id = '' where step_id is null;
alter table public.habit_logs alter column step_id set default '';
alter table public.habit_logs alter column step_id set not null;

drop index if exists public.logs_unique_cell;  -- functional index from 002, now redundant
alter table public.habit_logs drop constraint if exists logs_cell_uniq;
alter table public.habit_logs
  add constraint logs_cell_uniq unique (user_id, goal_id, day, step_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. rhythm_by_hour — sum completion intensity by weekday + hour, in the user's
--    timezone. security definer + auth.uid() means a caller only ever aggregates
--    their own rows (RLS-equivalent). Returns sparse buckets; client fills zeros.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.rhythm_by_hour(p_tz text default 'UTC')
returns table(dow int, hour int, total bigint)
language sql security definer set search_path = public as $$
  select
    extract(dow  from (done_at at time zone p_tz))::int as dow,
    extract(hour from (done_at at time zone p_tz))::int as hour,
    sum(level)::bigint as total
  from public.habit_logs
  where user_id = auth.uid()
  group by 1, 2
  order by 1, 2;
$$;

-- Allow signed-in users to call it (RLS on the table still scopes via auth.uid()).
grant execute on function public.rhythm_by_hour(text) to authenticated;
