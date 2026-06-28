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

### 2. Reminder data shape

A goal gains an optional field:

```
reminder: {
  day:    1..31,        // day of month
  month:  0..11,        // calendar month, YEARLY only (omit/ignore for monthly)
  hour:   0..23,
  minute: 0..59,
} | null               // null / absent = no reminder
```

`reminder` is persisted as part of the goal (localStorage + Supabase `goals.sequence`
sibling — it rides the existing goal row; `toRow`/`fromRow` in
[cloud-sync.js](../../../src/cloud-sync.js) must pass `reminder` through).

### 3. Pure scheduling helpers — `src/reminder-schedule.js` (new)

```
goalReminderId(goalId): number
  Stable, positive, per-goal notification id. Deterministic string hash of goalId,
  mapped into a fixed band that never collides with the global daily id (1001).
  e.g. 100000 + (hash(goalId) % 800000).

buildGoalSchedule(goal): { on, repeats: true } | null
  Pure. Returns the Capacitor LocalNotifications schedule for a goal, or null when the
  goal has no reminder OR its cadence is not monthly/yearly.
  - monthly → { on: { day, hour, minute }, repeats: true }
  - yearly  → { on: { month: <1..12>, day, hour, minute }, repeats: true }
    (Capacitor months are 1-based, so store-month 0..11 → +1.)
```

Both are pure (no Capacitor import), unit-tested in Node.

### 4. Native wrappers — `src/notifications.js` (extend)

```
applyGoalReminder(goal): Promise<void>
  - Always cancel the goal's existing notification first (goalReminderId).
  - If buildGoalSchedule(goal) is non-null and on native: ensurePermission() then
    LN.schedule({ notifications: [{ id, title: 'Pacely',
      body: `${goal.title} is due today.`, schedule }] }).
  - Web / non-native / null schedule → cancel only (no-op buzz). Never throws.

rescheduleGoalReminders(goals): Promise<void>
  - For each goal, applyGoalReminder(goal). Called on launch so alarms survive reschedule.
```

`goalReminderId` is imported from `reminder-schedule.js` and used for cancel + schedule so
they always target the same id.

### 5. UI — Reminder section in goal detail

`src/screen-goals.jsx` `GoalDetail`: a new `<Section label="Reminder">`, rendered only when
`goal.cadence === 'monthly' || goal.cadence === 'yearly'`.

- A toggle row "Remind me when this is due" (checkbox styled like the existing recurring
  toggle). Off → `patch({ reminder: null })`. On → `patch({ reminder: <default> })` where
  default = `{ day: 1, month: currentMonth (yearly), hour: 9, minute: 0 }`.
- When on:
  - **Monthly:** a day-of-month control (1–31).
  - **Yearly:** a month control (Jan–Dec) + day-of-month control.
  - A time control (hour + minute).
- Controls use the same look as existing detail controls (the numeric `est` input / pill
  rows). Keep it native-simple: numeric selects/inputs, not a custom wheel.
- Editing any control calls `patch({ reminder: { ...reminder, <field> } })`.

Because `GoalDetail` already calls `onUpdate(goal)` on every patch, the reminder persists
through the normal goal-save path. Scheduling is triggered there (next section).

A small helper line under the controls states the native reality in-app, e.g.
"Reminders ring on the installed app." (one muted caption), so a web tester isn't confused.

### 6. Triggering the schedule

- `src/app.jsx`: wherever a goal is updated (`updateGoal` passed into `GoalsScreen`, and
  `saveGoal`), after `setGoals(...)` call `applyGoalReminder(updatedGoal)`. On delete, call
  `applyGoalReminder({ ...goal, reminder: null })` (cancels). Keep it fire-and-forget
  (`.catch(() => {})`) — never block the UI.
- `src/main.jsx`: on launch, after the existing `rescheduleOnLaunch()`, call
  `rescheduleGoalReminders(loadGoals())` so per-goal alarms are re-armed. Read goals from
  localStorage (same key the app uses) to avoid a React dependency.

### 7. Data flow

```
Goal detail: toggle/edit reminder ─► patch(reminder) ─► onUpdate(goal)
   └─► app.jsx setGoals + applyGoalReminder(goal)
                              └─► buildGoalSchedule(goal) ──► native LN.schedule (id = goalReminderId)
App launch ─► rescheduleGoalReminders(goals) ─► applyGoalReminder per goal
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
- Supabase round-trip must preserve `reminder` (update `toRow`/`fromRow`).

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

**Manual / web (preview):**
- Goals tab shows the new **Yearly** cadence + filter; a goal can be set Yearly.
- A Monthly/Yearly goal shows the Reminder section; toggling on + setting day/time writes
  `goal.reminder` to `cadence:goals` in localStorage; toggling off clears it.
- Section hidden for Daily/Weekly/Project.

**Manual / native (device, later):** install the build, set a near-future minute, confirm
the notification fires and recurs.

## Out of scope (future backlog)

- Paid "Business Compliance" preset pack (GST R1 / 3B / TDS / PF-ESI with default dates).
- Calendar due-day markers for reminders.
- Per-goal alarms for Daily/Weekly cadences.
- Smarter daily-reminder body (today's tasks) — separate backlog item.
