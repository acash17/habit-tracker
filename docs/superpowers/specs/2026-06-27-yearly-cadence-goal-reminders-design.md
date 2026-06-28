# Yearly cadence + per-goal due-day reminders — design

**Date:** 2026-06-27
**Status:** Approved for plan
**Author:** Pacely team (with Claude)

## Problem

Users want recurring **compliance / duty reminders** — e.g. "File GST on the 11th every
month", "Renew licence every March". Today Pacely has:
- Goal cadence Daily / Weekly / Monthly / Project (no **Yearly**).
- A single global daily local notification ([notifications.js](../../../src/notifications.js)),
  same time, same generic body — no per-duty alarm and no due-day.

So there's no way to model "this specific obligation is due on day X, remind me then,
every period."

## Goal

1. Add **Yearly** to goal cadence.
2. Let a **Monthly** or **Yearly** goal carry an optional **reminder**: a due-day (+ month
   for yearly) and a time. On the phone build it fires a recurring local notification
   ("File GST is due today."). The compliance use case becomes: a Monthly goal named
   "File GST", reminder on day 11, 9:00.

Daily/Weekly goals are unchanged (still served by the existing global daily reminder).

## Native-only reality (must hold)

Local notifications are Capacitor native-only and a **no-op on web** (plugin is
dynamic-imported and native-guarded). Therefore:
- **Web (the prototype):** the reminder **UI** and the persisted `goal.reminder` data are
  fully exercisable; no notification actually fires.
- **Android/iOS build:** the notification fires.
This split is intentional and must not break the web build.

## Approach (chosen: A)

Model the reminder as an optional field on the goal, with a per-goal recurring native
notification. Core scheduling logic is pure and unit-tested; native calls are thin
wrappers.

Rejected:
- **B — separate reminders store keyed by goalId.** Decouples but adds sync drift between
  two stores and more plumbing. ✗
- **C — pre-schedule N one-off notifications.** More delivery-robust on some OSes but
  complex and churny for an MVP. ✗

## Design

### 1. Yearly cadence

- `src/goal-factory.js` `makeGoalFromSteps`: extend the deadline mapping so
  `cadence === 'yearly'` → `deadline: 'Every year'` (alongside daily/weekly/monthly).
- `src/screen-goals.jsx`:
  - `CADENCE_LABEL` add `yearly: 'Yearly'`.
  - `cadenceList` (in GoalDetail) add `['yearly', 'Yearly']`.
  - Filter `FILTERS` add `['yearly', 'Yearly']`; `counts` initial object add `yearly: 0`
    (the existing `c[g.cadence || 'oneoff']++` already tallies it).
- Cadence chip styling already treats any non-`oneoff` cadence the same (sage pill), so
  yearly needs no new style branch.

### 2. Reminder data shape + storage

A reminder is:

```
reminder: {
  day:    1..31,        // day of month
  month:  0..11,        // calendar month, YEARLY only (ignored for monthly)
  hour:   0..23,
  minute: 0..59,
} | null               // null / absent = no reminder
```

**Storage: a separate local map keyed by goalId**, `cadence:reminders` =
`{ [goalId]: reminder }`, NOT a field on the goal object. Rationale:
- The Supabase `goals` table has no `reminder` column ([cloud-sync.js](../../../src/cloud-sync.js)
  `toRow` enumerates columns), so upserting one would fail — and adding a column is a DB
  migration out of scope here.
- `useCloudSync` **replaces** local goals with the cloud copy on sign-in; a field on the
  goal would be wiped. A separate keyed map survives that.
- Local notifications are inherently **per-device**, so per-device local reminder data is
  the semantically correct home — no cloud sync needed.

The UX is still "a goal with an alarm" (configured in goal detail, keyed by that goal's id);
only the persistence is decoupled. No `cloud-sync.js` change is required.

Module `src/reminders.js` (new) owns the map: `loadReminders()`, `getReminder(goalId)`,
`setReminder(goalId, reminder|null)` (null deletes the key), `removeReminder(goalId)`.

### 3. Pure scheduling helpers — `src/reminder-schedule.js` (new)

```
goalReminderId(goalId): number
  Stable, positive, per-goal notification id. Deterministic string hash of goalId,
  mapped into a fixed band that never collides with the global daily id (1001).
  e.g. 100000 + (hash(goalId) % 800000).

buildGoalSchedule(cadence, reminder): { on, repeats: true } | null
  Pure. Returns the Capacitor LocalNotifications schedule, or null when reminder is
  falsy OR cadence is not 'monthly'/'yearly'.
  - monthly → { on: { day, hour, minute }, repeats: true }
  - yearly  → { on: { month: <1..12>, day, hour, minute }, repeats: true }
    (Capacitor months are 1-based, so store-month 0..11 → +1.)
```

Both are pure (no Capacitor import), unit-tested in Node.

### 4. Native wrappers — `src/notifications.js` (extend)

```
applyGoalReminder(goal, reminder): Promise<void>
  - Always cancel the goal's existing notification first (goalReminderId(goal.id)).
  - If buildGoalSchedule(goal.cadence, reminder) is non-null and on native:
    ensurePermission() then LN.schedule({ notifications: [{ id, title: 'Pacely',
      body: `${goal.title} is due today.`, schedule }] }).
  - Web / non-native / null schedule → cancel only (no-op buzz). Never throws.

rescheduleGoalReminders(goals, reminders): Promise<void>
  - For each goal, applyGoalReminder(goal, reminders[goal.id]). Called on launch so alarms
    survive a reschedule.
```

`goalReminderId` is imported from `reminder-schedule.js` and used for cancel + schedule so
they always target the same id.

### 5. UI — Reminder section in goal detail

`src/screen-goals.jsx` `GoalDetail`: a new `<Section label="Reminder">`, rendered only when
`goal.cadence === 'monthly' || goal.cadence === 'yearly'`.

- Local state `reminder`, seeded once from `getReminder(goal.id)`; reset when `goal.id`
  changes (same pattern as the existing `setConfirmDel(false)` effect on `goal.id`).
- A single helper `updateReminder(next)` that: sets local state, `setReminder(goal.id, next)`,
  and `applyGoalReminder(goal, next).catch(() => {})`. All edits route through it.
- A toggle row "Remind me when this is due" (checkbox styled like the existing recurring
  toggle). Off → `updateReminder(null)`. On → `updateReminder(<default>)` where
  default = `{ day: 1, month: <current month> (yearly only), hour: 9, minute: 0 }`.
- When on:
  - **Monthly:** a day-of-month control (1–31).
  - **Yearly:** a month control (Jan–Dec) + day-of-month control.
  - A time control (hour + minute).
- Controls use the same look as existing detail controls (numeric inputs / pill rows).
  Native-simple: numeric `<input>`/`<select>`, not a custom wheel.
- Editing any control calls `updateReminder({ ...reminder, <field> })`.

Because reminders are stored in their own keyed map (not on the goal), reminder edits do
NOT go through `onUpdate(goal)` and never trigger a cloud goal push.

A small muted caption under the controls states the native reality in-app, e.g.
"Reminders ring on the installed app." so a web tester isn't confused.

### 6. Triggering the schedule

- The schedule is (re)applied **inside `GoalDetail.updateReminder`** (above) — every toggle
  or field edit calls `applyGoalReminder(goal, next)`, fire-and-forget.
- **Goal delete** (`src/app.jsx` `deleteGoal`): call `removeReminder(id)` and
  `applyGoalReminder({ id, cadence: '', title: '' }, null).catch(() => {})` so the alarm is
  cancelled and the orphan reminder key is dropped.
- **App launch** (`src/main.jsx`): after the existing `rescheduleOnLaunch()`, call
  `rescheduleGoalReminders(load('goals', []), loadReminders())` so per-goal alarms are
  re-armed. Read both from localStorage (via `storage.load` / `loadReminders`) to avoid a
  React dependency.

### 7. Data flow

```
Goal detail: toggle/edit reminder ─► updateReminder(next)
   ├─► setReminder(goal.id, next)              (persist to cadence:reminders map)
   └─► applyGoalReminder(goal, next)
          └─► buildGoalSchedule(goal.cadence, next) ─► native LN.schedule (id = goalReminderId)
App launch ─► rescheduleGoalReminders(goals, reminders) ─► applyGoalReminder per goal
Notification fires on due day ─► "‹title› is due today."
```

## Error handling / edge cases

- No reminder or non-monthly/yearly cadence → `buildGoalSchedule` returns null → only a
  cancel happens. No crash.
- Cadence changed monthly→daily while a reminder exists → `buildGoalSchedule` null →
  reminder alarm cancelled on next `applyGoalReminder`. (UI also hides the section, but the
  stored `reminder` is harmless; cancel still runs.)
- Day 29–31 in a short month → Capacitor fires on the nearest valid occurrence per its own
  rules; acceptable for MVP (note it, don't special-case).
- Web / permissions denied → no buzz, data still saved; `applyGoalReminder` never throws.
- Goal deleted → `removeReminder(id)` drops the orphan key and the alarm is cancelled, so a
  future goal can't inherit a stale id-collision (ids are a deterministic hash of goalId).
- Reminders are local-only, so they do NOT sync across devices — correct for per-device
  alarms; no `cloud-sync.js` change.

## Testing

**Unit (vitest, Node) — `src/reminder-schedule.test.js`:**
- `buildGoalSchedule`:
  - monthly goal w/ reminder → `{ on: { day, hour, minute }, repeats: true }`.
  - yearly goal w/ reminder → includes `month` = stored month + 1 (1-based).
  - goal with no reminder → null.
  - goal reminder but cadence daily/weekly/oneoff → null.
- `goalReminderId`:
  - deterministic (same id for same goalId across calls).
  - distinct ids for distinct goalIds (sample set, no collision).
  - always a positive integer and never 1001 (the global id).
- `reminders` store (`src/reminders.test.js`): `setReminder` then `getReminder` round-trips;
  `setReminder(id, null)` / `removeReminder(id)` deletes the key; absent id → undefined.

**Manual / web (preview):**
- Goals tab shows the new **Yearly** cadence + filter; a goal can be set Yearly.
- A Monthly/Yearly goal shows the Reminder section; toggling on + setting day/time writes
  the entry to `cadence:reminders` (keyed by goal id) in localStorage; toggling off clears
  that key.
- Section hidden for Daily/Weekly/Project.

**Manual / native (device, later):** install the build, set a near-future minute, confirm
the notification fires and recurs.

## Out of scope (future backlog)

- Paid "Business Compliance" preset pack (GST R1 / 3B / TDS / PF-ESI with default dates).
- Calendar due-day markers for reminders.
- Per-goal alarms for Daily/Weekly cadences.
- Smarter daily-reminder body (today's tasks) — separate backlog item.
