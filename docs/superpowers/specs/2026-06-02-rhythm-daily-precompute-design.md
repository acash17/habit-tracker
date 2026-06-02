# Daily rhythm precompute — nightly pg_cron rollup + hybrid client read

Status: approved (design)
Date: 2026-06-02

## Goal

Aggregate each user's rhythm (completion intensity by weekday × hour) once a day
via a scheduled Supabase job, so the Insights tab reads a tiny precomputed table
instead of aggregating `habit_logs` live. Keep data fresh by merging today's
new completions on top of the nightly cache (hybrid read) — no 24h staleness.

## Why hybrid

At current scale the live `rhythm_by_hour` RPC is already instant; precompute only
matters at scale. To get the requested daily automation without making Insights
stale, the nightly job builds the cache and the client adds only the small "delta"
(rows logged since the last run) live.

---

## A. Schema + job — migration `004_rhythm_cron.sql`

### `rhythm_cache` table
```
user_id uuid (fk auth.users on delete cascade)
dow int, hour int          -- weekday (0=Sun) and hour, in the user's tz
total bigint               -- summed level
updated_at timestamptz     -- the run time (= the delta cutoff)
primary key (user_id, dow, hour)
```
RLS: enable; select policy `auth.uid() = user_id`. No client writes (job-only).

### `refresh_rhythm_cache()` — `security definer`
Recompute the whole rollup from `habit_logs`, bucketed by each user's
`profiles.tz` (default 'UTC'), with `updated_at = now()`:
```
delete from rhythm_cache;
insert into rhythm_cache (user_id, dow, hour, total, updated_at)
select l.user_id,
       extract(dow  from (l.done_at at time zone coalesce(p.tz,'UTC')))::int,
       extract(hour from (l.done_at at time zone coalesce(p.tz,'UTC')))::int,
       sum(l.level)::bigint, now()
from habit_logs l left join profiles p on p.user_id = l.user_id
group by 1,2,3;
```

### pg_cron schedule
`create extension if not exists pg_cron;` then schedule **daily at 20:30 UTC
(= 02:00 IST)**:
`cron.schedule('refresh-rhythm-cache', '30 20 * * *', 'select public.refresh_rhythm_cache();')`.
Unschedule any existing job of that name first (idempotent re-run).
NOTE: pg_cron must be enabled in Supabase → Database → Extensions (one-time);
cron runs in UTC. Documented in SUPABASE_SETUP.

### `rhythm_by_hour` gains a `p_since` filter
Drop the 1-arg function (avoids overload ambiguity) and recreate as
`rhythm_by_hour(p_tz text default 'UTC', p_since timestamptz default null)` with
`and (p_since is null or done_at >= p_since)`. Same `security definer` + grant.

## B. Client hybrid read — `src/rhythm.js` `getRhythm()`

1. `select dow,hour,total,updated_at from rhythm_cache` (RLS scopes to the user).
2. If empty or error → fall back to full live `rhythm_by_hour(p_tz)` (new users,
   or before the first nightly run).
3. Else `cutoff = max(updated_at)`; `delta = rhythm_by_hour(p_tz, cutoff)`;
   return `[...cache, ...delta]`.

`bucketsToMatrix` already sums duplicate `(dow,hour)` buckets, so concatenating
cache + delta merges them correctly — no separate merge function needed.

## Testing

- Existing `bucketsToMatrix` test already covers summing duplicate cells; add one
  test feeding cache-shaped + delta-shaped buckets that land on the same cell.
- pg_cron / SQL verified by running once in Supabase (manual; no DB in unit tests).
- `npm run build` — no broken imports.

## Out of scope

Per-user cron times, real-time push updates, notifications.
