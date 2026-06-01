# Phase 1 — Play Store launch + cloud sync + rhythm insights

Status: approved (design)
Date: 2026-06-01
Out of scope (Phase 2): real AI sequencer, home-screen widget, native two-way calendar, web/iOS launch.

## Goal

Publish a working, DPDP-compliant Cadence build to a Google Play testing track, with Google sign-in, cloud sync, and **real** rhythm insights (most-active / laziest time of day) computed from the user's actual completion history.

## Definition of done

A tester installs the signed AAB, signs in with Google on a real phone, creates and logs a goal, sees the heatmap, opens the Insights tab and sees their real peak/laziest hours, and the corresponding rows exist in Supabase.

---

## A. Completion logging → cloud

### Current state
- `src/habit-log.js` stores `{ [goalId]: { 'YYYY-MM-DD': level } }` in localStorage — **date only, no time**.
- `src/cloud-sync.js` syncs `goals` only.
- `habit_logs` table exists (migration 002) with `done_at timestamptz`, `level`, `day`, unique index on `(user_id, goal_id, day, coalesce(step_id,''))`.

### Change
1. When a completion is logged (the `cycleLevel` path in `habit-log.js` and the Today auto-complete path), also record the **timestamp**.
2. Local model gains a parallel structure or extends each cell to carry the last `done_at` (ISO string). Heatmap keeps using `level` by day; rhythm needs `done_at`.
   - Decision: keep the day→level map for the heatmap (unchanged), AND write a cloud `habit_logs` row carrying `done_at = now()` on each log action when signed in.
3. Extend `cloud-sync.js`:
   - On sign-in bootstrap: pull `habit_logs` for the user into the local day→level cache (so the heatmap is populated cross-device).
   - On each local log action while signed in: upsert a `habit_logs` row `{ user_id, goal_id, step_id:null, day, level, done_at }` (debounced or immediate; immediate is fine — low volume).
   - Conflict key: the existing unique index `(user_id, goal_id, day, step_id)` → upsert `onConflict`.

### Interfaces
- `logCompletion(goalId, { level, at })` — new helper in `habit-log.js`; updates local cache + (if signed in) enqueues cloud upsert.
- `pullHabitLogs(userId)` / `pushHabitLog(userId, row)` in `cloud-sync.js`.

### Edge cases
- Signed out: local-only, no cloud write. Rhythm tab shows the signed-out prompt.
- Unlogging (level → 0): delete the cloud row for that goal+day.

---

## B. Rhythm aggregation RPC

### Postgres function (new migration `003_rhythm.sql`)

```sql
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
```

- `security definer` + `auth.uid()` ensures a user only ever aggregates their own rows (RLS-equivalent).
- Returns sparse buckets (only non-empty dow/hour). Client fills the rest with 0.
- Timezone: client passes `profiles.tz` if set, else the browser/device tz (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

### Client read
- `getRhythm(tz)` in a new `src/rhythm.js` → `supabase.rpc('rhythm_by_hour', { p_tz })`.
- Derive peak (max bucket) and laziest (min bucket within waking hours, e.g. 6–22) in JS.

---

## C. Insights tab (real data)

### Current state
`src/screen-insights.jsx` renders hardcoded `INSIGHTS` cards + a static `CompletionByHour`.

### Change
- Replace with a Rhythm view reusing the prototype's visual language (`src/prototype.jsx` ActiveHoursPanel is the reference):
  - hour × day heatmap (8 three-hour bins or 24 hourly cols — match prototype's 8-bin layout for phone width)
  - "Peak" callout (busiest day + time)
  - "Laziest" callout (lowest waking-hours bin)
  - optional per-day hourly bars
- Data states:
  - **Signed out** → card: "Sign in to see your rhythm" + the Google button (reuse `ProfileCard` CTA or a slim variant).
  - **Signed in, no data yet** → "Log a few days and your rhythm appears here."
  - **Has data** → render heatmap + callouts.
- Keep one or two evergreen non-data cards if desired (e.g. the "effort, not streaks" message), but the hero is real rhythm.

### Interfaces
- `InsightsScreen` calls `getRhythm(tz)` on mount (and on auth change), holds `{loading, buckets}`.

---

## D. Launch readiness

1. **Vercel deploy** — `vercel.json` already present. Deploy repo → get public URL.
   - Add `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to Vercel env.
   - Privacy policy public at `<url>/privacy.html` (Play requires a public URL).
   - Add `<url>` to Google OAuth authorized origins + Supabase redirect allowlist.
2. **On-device OAuth test** — build debug APK, sideload, verify `cadence://auth-callback` deep-link returns to the app and signs in. Requires `cadence://auth-callback` in Supabase redirect allowlist (confirm).
3. **Store assets** — 2–4 phone screenshots (1080×1920) + 1024×500 feature graphic. Icon already generated.
4. **Data Safety form** — declare: collects account identifier (Google), goals, completion history; purpose = app functionality + sync; stored in Supabase; user can request deletion (in-app erase exists). Encrypted in transit. Not shared with third parties; not sold.
5. **Signed AAB** — user generates keystore (`docs/PLAY_STORE_CHECKLIST.md`), `npm run android:aab`, upload to Play **internal testing** track.

---

## Work tracks & order

1. **Logging → cloud** (A) — unblocks data for rhythm.
2. **Rhythm RPC** (B) — migration 003 (user runs in SQL editor).
3. **Insights tab** (C) — consume RPC.
4. **Launch readiness** (D) — Vercel, on-device OAuth, assets, Data Safety, signed AAB.

A → B → C are code; D is largely operational (some by the user: keystore, Play account, screenshots).

## Risks / open items

- **On-device OAuth** is wired (PKCE + deep link) but never run on hardware — first real test may surface a redirect/scheme issue. Mitigation: test early in track D, before assembling the store listing.
- **Timezone correctness** — rhythm depends on tz; default to device tz, store in `profiles.tz` on first sign-in.
- **App name "Cadence"** may be taken on Play — check before listing; fallback names in `docs/play-store/copy.md`.
- **Minimum-functionality / Data Safety accuracy** — must match actual behavior or Google rejects.

## Non-goals (Phase 2)

- Real AI sequence generation (Anthropic via Supabase Edge Function) — currently graceful fallback to a canned sequence; UI copy should not overclaim "AI" until then.
- Home-screen widget, native calendar two-way sync, iOS/web public launch.
