# Yearly Cadence + Per-Goal Due-Day Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Yearly goal cadence and let Monthly/Yearly goals carry a due-day + time reminder that fires a recurring local notification on the phone build.

**Architecture:** Reminders are stored in a separate local map `cadence:reminders` keyed by goalId (not on the goal, so no Supabase schema change and they survive cloud sign-in sync). Two pure helpers (`goalReminderId`, `buildGoalSchedule`) are unit-tested; `notifications.js` gains thin native wrappers that no-op on web. The goal-detail screen gets a Reminder section for Monthly/Yearly goals.

**Tech Stack:** React 18, Vite 5, vitest (Node — pure-logic tests only; UI verified by running the app), @capacitor/local-notifications (native-only).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/reminder-schedule.js` | **New.** Pure `goalReminderId(goalId)` + `buildGoalSchedule(cadence, reminder)`. No Capacitor. |
| `src/reminder-schedule.test.js` | **New.** Unit tests for the two pure helpers. |
| `src/reminders.js` | **New.** Local keyed store: `loadReminders`, `getReminder`, `setReminder`, `removeReminder`. |
| `src/reminders.test.js` | **New.** Unit tests for the store round-trip/delete. |
| `src/notifications.js` | Add `applyGoalReminder(goal, reminder)` + `rescheduleGoalReminders(goals, reminders)` (native wrappers). |
| `src/goal-factory.js` | `makeGoalFromSteps`: `yearly` cadence → deadline `'Every year'`. |
| `src/screen-goals.jsx` | Yearly in cadence label/list/filters/counts; Reminder section in `GoalDetail`. |
| `src/app.jsx` | `deleteGoal`: remove reminder + cancel its alarm. |
| `src/main.jsx` | On launch, reschedule per-goal reminders. |

---

## Task 1: Pure schedule helpers

**Files:**
- Create: `src/reminder-schedule.js`
- Test: `src/reminder-schedule.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/reminder-schedule.test.js
import { describe, test, expect } from 'vitest';
import { goalReminderId, buildGoalSchedule } from './reminder-schedule.js';

describe('goalReminderId', () => {
  test('deterministic for the same id', () => {
    expect(goalReminderId('g_abc')).toBe(goalReminderId('g_abc'));
  });
  test('distinct for distinct ids, positive, never the global id 1001', () => {
    const ids = ['g_a', 'g_b', 'g_c', 'g_d', 'g_e'].map(goalReminderId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of ids) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
      expect(n).not.toBe(1001);
    }
  });
});

describe('buildGoalSchedule', () => {
  const rem = { day: 11, month: 2, hour: 9, minute: 30 };
  test('monthly → on {day,hour,minute}, repeats', () => {
    expect(buildGoalSchedule('monthly', rem)).toEqual({ on: { day: 11, hour: 9, minute: 30 }, repeats: true });
  });
  test('yearly → includes 1-based month', () => {
    expect(buildGoalSchedule('yearly', rem)).toEqual({ on: { month: 3, day: 11, hour: 9, minute: 30 }, repeats: true });
  });
  test('yearly with missing month defaults to January (month 1)', () => {
    expect(buildGoalSchedule('yearly', { day: 1, hour: 9, minute: 0 }).on.month).toBe(1);
  });
  test('no reminder → null', () => {
    expect(buildGoalSchedule('monthly', null)).toBeNull();
  });
  test('non monthly/yearly cadence → null', () => {
    expect(buildGoalSchedule('daily', rem)).toBeNull();
    expect(buildGoalSchedule('weekly', rem)).toBeNull();
    expect(buildGoalSchedule('oneoff', rem)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/reminder-schedule.test.js`
Expected: FAIL — `Failed to resolve import "./reminder-schedule.js"`.

- [ ] **Step 3: Write the implementation**

```js
// src/reminder-schedule.js
// Pure helpers for per-goal local-notification scheduling. No Capacitor import.

// Stable, positive, per-goal notification id. djb2 hash of the goalId mapped into a
// fixed band well clear of the single global daily reminder id (1001).
export function goalReminderId(goalId) {
  const s = String(goalId);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 100000 + (h % 800000);
}

// Capacitor LocalNotifications schedule for a goal's reminder, or null when there's no
// reminder or the cadence isn't monthly/yearly. Capacitor months are 1-based.
export function buildGoalSchedule(cadence, reminder) {
  if (!reminder) return null;
  const { day, month, hour, minute } = reminder;
  if (cadence === 'monthly') return { on: { day, hour, minute }, repeats: true };
  if (cadence === 'yearly') return { on: { month: (month || 0) + 1, day, hour, minute }, repeats: true };
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/reminder-schedule.test.js`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/reminder-schedule.js src/reminder-schedule.test.js
git commit -m "feat: pure reminder-schedule helpers (goalReminderId, buildGoalSchedule)"
```

---

## Task 2: Local reminders store

**Files:**
- Create: `src/reminders.js`
- Test: `src/reminders.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/reminders.test.js
import { describe, test, expect, beforeEach } from 'vitest';
import { loadReminders, getReminder, setReminder, removeReminder } from './reminders.js';

// storage.js swallows errors when localStorage is undefined (Node), so these tests
// exercise the in-memory fallback path: setReminder writes, getReminder reads back
// within the same call chain via the returned object. To make them deterministic in
// Node we assert on the pure merge behaviour through a provided map.
beforeEach(() => {
  // Provide a minimal localStorage shim so the store persists across calls in Node.
  const mem = {};
  globalThis.localStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  };
});

describe('reminders store', () => {
  test('set then get round-trips', () => {
    setReminder('g1', { day: 5, hour: 9, minute: 0 });
    expect(getReminder('g1')).toEqual({ day: 5, hour: 9, minute: 0 });
  });
  test('setReminder(id, null) deletes the key', () => {
    setReminder('g1', { day: 5, hour: 9, minute: 0 });
    setReminder('g1', null);
    expect(getReminder('g1')).toBeUndefined();
  });
  test('removeReminder deletes the key', () => {
    setReminder('g2', { day: 1, hour: 8, minute: 0 });
    removeReminder('g2');
    expect(getReminder('g2')).toBeUndefined();
  });
  test('absent id → undefined; loadReminders is an object', () => {
    expect(getReminder('nope')).toBeUndefined();
    expect(typeof loadReminders()).toBe('object');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/reminders.test.js`
Expected: FAIL — `Failed to resolve import "./reminders.js"`.

- [ ] **Step 3: Write the implementation**

```js
// src/reminders.js
// Per-device reminder store, keyed by goalId: cadence:reminders = { [goalId]: reminder }.
// Kept separate from the goal object so it needs no Supabase column and survives the
// cloud-goal replacement that happens on sign-in. Notifications are per-device anyway.
import { load, save } from './storage.js';

const KEY = 'reminders';

export function loadReminders() { return load(KEY, {}); }

export function getReminder(goalId) { return loadReminders()[goalId]; }

// reminder === null/undefined deletes the key.
export function setReminder(goalId, reminder) {
  const all = loadReminders();
  if (reminder == null) delete all[goalId];
  else all[goalId] = reminder;
  save(KEY, all);
}

export function removeReminder(goalId) { setReminder(goalId, null); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/reminders.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/reminders.js src/reminders.test.js
git commit -m "feat: local per-goal reminders store (cadence:reminders)"
```

---

## Task 3: Native notification wrappers

**Files:**
- Modify: `src/notifications.js` (add imports + two functions at end)

- [ ] **Step 1: Add the import (top of file, after existing imports)**

```js
import { goalReminderId, buildGoalSchedule } from './reminder-schedule.js';
```

- [ ] **Step 2: Append the two wrappers at the end of `src/notifications.js`**

```js
// ── Per-goal due-day reminders (Monthly/Yearly) ───────────────────────────────
// Schedules a recurring local notification for one goal. Native-only; on web this is
// a no-op. Always cancels the goal's existing alarm first so edits don't stack.
export async function applyGoalReminder(goal, reminder) {
  if (!isNativeNotify()) return;
  try {
    const LN = await ln();
    const id = goalReminderId(goal.id);
    await LN.cancel({ notifications: [{ id }] });
    const schedule = buildGoalSchedule(goal.cadence, reminder);
    if (!schedule) return; // off, or non monthly/yearly → cancel only
    if (!(await ensurePermission())) return;
    await LN.schedule({
      notifications: [{ id, title: 'Pacely', body: `${goal.title} is due today.`, schedule }],
    });
  } catch (e) { console.warn('[notify] goal reminder failed:', e?.message || e); }
}

// Re-arm every per-goal reminder on launch (alarms otherwise reset on reinstall).
export async function rescheduleGoalReminders(goals, reminders) {
  if (!isNativeNotify()) return;
  for (const g of goals || []) await applyGoalReminder(g, (reminders || {})[g.id]);
}
```

- [ ] **Step 3: Verify it builds (no unit test — native side effects)**

Run: `npm run build`
Expected: succeeds (no unresolved imports / syntax errors).

- [ ] **Step 4: Commit**

```bash
git add src/notifications.js
git commit -m "feat: applyGoalReminder + rescheduleGoalReminders (native, web no-op)"
```

---

## Task 4: Yearly cadence in the goal factory

**Files:**
- Modify: `src/goal-factory.js` (`makeGoalFromSteps` deadline mapping)

- [ ] **Step 1: Add a test for the yearly deadline**

Append to `src/goal-factory.test.js` inside the existing `describe('makeGoalFromSteps', ...)` block (before its closing `});`):

```js
  test('yearly cadence → "Every year" deadline', () => {
    const g = makeGoalFromSteps('a', [{ label: 'x', est: 5 }], { cadence: 'yearly', recurring: true });
    expect(g.deadline).toBe('Every year');
    expect(g.cadence).toBe('yearly');
    expect(g.recurring).toBe(true);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/goal-factory.test.js`
Expected: FAIL — deadline is `'Every month'` (the current `else` branch), not `'Every year'`.

- [ ] **Step 3: Update the deadline mapping**

In `src/goal-factory.js`, replace the `deadline` assignment in `makeGoalFromSteps`:

```js
  const deadline = cadence === 'oneoff'
    ? (DEADLINE_LABEL[deadlineKey] || deadlineKey)
    : (cadence === 'daily' ? 'Every day'
      : cadence === 'weekly' ? 'Every week'
      : cadence === 'yearly' ? 'Every year'
      : 'Every month');
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/goal-factory.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/goal-factory.js src/goal-factory.test.js
git commit -m "feat: yearly cadence -> 'Every year' deadline in goal-factory"
```

---

## Task 5: Yearly in the Goals UI (labels, picker, filters)

**Files:**
- Modify: `src/screen-goals.jsx`

- [ ] **Step 1: Add the cadence label**

Replace the `CADENCE_LABEL` const near the top of `src/screen-goals.jsx`:

```js
const CADENCE_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly', oneoff: 'Project' };
```

- [ ] **Step 2: Add Yearly to the detail cadence picker**

In `GoalDetail`, replace `cadenceList`:

```js
  const cadenceList = [['daily','Daily'], ['weekly','Weekly'], ['monthly','Monthly'], ['yearly','Yearly'], ['oneoff','Project']];
```

- [ ] **Step 3: Add Yearly to the recurring-checkbox label cases**

In `GoalDetail`'s recurring toggle (the `<div>Repeat each …</div>` line), extend the cadence text:

```js
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>
              Repeat each {goal.cadence === 'daily' ? 'day' : goal.cadence === 'weekly' ? 'week' : goal.cadence === 'yearly' ? 'year' : goal.cadence === 'monthly' ? 'month' : 'period'}
            </div>
```

- [ ] **Step 4: Add Yearly to the list filters + counts**

In `GoalsScreen`, add `yearly: 0` to the `counts` initial object:

```js
    const c = { all: goals.length, daily: 0, weekly: 0, monthly: 0, yearly: 0, oneoff: 0, completed: 0 };
```

And add a filter pill to `FILTERS`:

```js
  const FILTERS = [
    ['all',       'All'],
    ['completed', 'Completed'],
    ['daily',     'Daily'],
    ['weekly',    'Weekly'],
    ['monthly',   'Monthly'],
    ['yearly',    'Yearly'],
    ['oneoff',    'Projects'],
  ];
```

- [ ] **Step 5: Verify in the running app**

Start the dev server (preview_start, config `dev`). Create a goal, open it, set cadence **Yearly**. Confirm the card chip reads "Yearly", the Yearly filter pill appears with a count, and:
```js
JSON.parse(localStorage.getItem('cadence:goals')||'[]').map(g => g.cadence)
```
shows `"yearly"` for it.

- [ ] **Step 6: Commit**

```bash
git add src/screen-goals.jsx
git commit -m "feat: Yearly cadence in goal label, picker, filters, counts"
```

---

## Task 6: Reminder section in goal detail

**Files:**
- Modify: `src/screen-goals.jsx` (imports + `GoalDetail`)

- [ ] **Step 1: Add imports at the top of `src/screen-goals.jsx`**

```js
import { getReminder, setReminder } from './reminders.js';
import { applyGoalReminder } from './notifications.js';
```

- [ ] **Step 2: Add a months constant near `CADENCE_LABEL`**

```js
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
```

- [ ] **Step 3: Add reminder state + updater inside `GoalDetail`**

After the existing `const { user } = useAuth();` line in `GoalDetail`, add:

```js
  const [reminder, setReminderState] = React.useState(() => getReminder(goal.id) || null);
  React.useEffect(() => { setReminderState(getReminder(goal.id) || null); }, [goal.id]);
  function updateReminder(next) {
    setReminderState(next);
    setReminder(goal.id, next);
    applyGoalReminder(goal, next).catch(() => {});
  }
```

- [ ] **Step 4: Render the Reminder section**

In `GoalDetail`'s returned JSX, immediately AFTER the Frequency `</Section>` (the cadence section that ends with the recurring `</label>` then `)}` then `</Section>`), insert:

```jsx
      {/* due-day reminder — monthly/yearly only */}
      {(goal.cadence === 'monthly' || goal.cadence === 'yearly') && (
        <Section label="Reminder">
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            background: reminder ? 'rgba(107,142,90,0.10)' : 'var(--card)',
            border: `0.5px solid ${reminder ? 'rgba(107,142,90,0.4)' : 'rgba(31,27,22,0.08)'}`,
            borderRadius: 12, cursor: 'pointer',
          }}>
            <input type="checkbox" checked={!!reminder}
              onChange={(e) => updateReminder(e.target.checked
                ? { day: 1, ...(goal.cadence === 'yearly' ? { month: new Date().getMonth() } : {}), hour: 9, minute: 0 }
                : null)}
              style={{ accentColor: 'var(--sage)', width: 16, height: 16 }}
            />
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>Remind me when this is due</div>
          </label>

          {reminder && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {goal.cadence === 'yearly' && (
                <select value={reminder.month ?? 0}
                  onChange={(e) => updateReminder({ ...reminder, month: parseInt(e.target.value, 10) })}
                  style={reminderControl}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              )}
              <select value={reminder.day}
                onChange={(e) => updateReminder({ ...reminder, day: parseInt(e.target.value, 10) })}
                style={reminderControl}>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>Day {i + 1}</option>)}
              </select>
              <input type="time"
                value={`${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = (e.target.value || '09:00').split(':').map((n) => parseInt(n, 10));
                  updateReminder({ ...reminder, hour: h || 0, minute: m || 0 });
                }}
                style={reminderControl} />
            </div>
          )}

          <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.5)', marginTop: 10 }}>
            Reminders ring on the installed app.
          </div>
        </Section>
      )}
```

- [ ] **Step 5: Add the shared control style (next to the `Section` helper at the bottom of the file)**

```js
const reminderControl = {
  fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)',
  padding: '8px 10px', borderRadius: 10,
  background: 'var(--card)', border: '0.5px solid rgba(31,27,22,0.12)',
  outline: 'none',
};
```

- [ ] **Step 6: Verify in the running app**

Reload the preview. Create a **Monthly** goal → open it → the **Reminder** section shows. Toggle on, set Day 11 and a time. Then:
```js
JSON.parse(localStorage.getItem('cadence:reminders')||'{}')
```
Expected: an entry keyed by the goal id like `{ day: 11, hour: 9, minute: 0 }`. Switch the goal to **Yearly** → a month dropdown appears; the stored entry gains `month`. Toggle off → the key disappears. Open a **Daily** goal → no Reminder section. Check `preview_console_logs` (expect no errors).

- [ ] **Step 7: Commit**

```bash
git add src/screen-goals.jsx
git commit -m "feat: due-day Reminder section in goal detail (monthly/yearly)"
```

---

## Task 7: Cancel on delete + reschedule on launch

**Files:**
- Modify: `src/app.jsx` (`deleteGoal` in the GoalsScreen props)
- Modify: `src/main.jsx`

- [ ] **Step 1: Cancel + remove the reminder when a goal is deleted**

In `src/app.jsx`, add imports near the other local imports:

```js
import { removeReminder } from './reminders.js';
import { applyGoalReminder } from './notifications.js';
```

Then in the `<GoalsScreen ... deleteGoal={...}>` handler, add the reminder cleanup:

```js
            deleteGoal={(id) => {
              setGoals(prev => prev.filter(g => g.id !== id));
              setEditingGoalId(null);
              removeReminder(id);
              applyGoalReminder({ id, cadence: '', title: '' }, null).catch(() => {});
              if (user) deleteGoalCloud(user.id, id);
              flash('Goal deleted');
            }}
```

- [ ] **Step 2: Reschedule per-goal reminders on launch**

In `src/main.jsx`, update the notifications import and add the launch call:

```js
import { rescheduleOnLaunch, rescheduleGoalReminders } from './notifications.js';
import { load } from './storage.js';
import { loadReminders } from './reminders.js';
```

After the existing `rescheduleOnLaunch();` line:

```js
// Re-arm per-goal due-day reminders (monthly/yearly) on launch. Native only; no-op on web.
rescheduleGoalReminders(load('goals', []), loadReminders());
```

- [ ] **Step 3: Verify build + web no-crash**

Run: `npm run build`
Expected: succeeds.
Reload the preview, delete a goal that had a reminder, and confirm via:
```js
JSON.parse(localStorage.getItem('cadence:reminders')||'{}')
```
that its key is gone, and `preview_console_logs` shows no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app.jsx src/main.jsx
git commit -m "feat: drop+cancel goal reminder on delete; reschedule all on launch"
```

---

## Task 8: Full regression + end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `npm test`
Expected: PASS — all files green (existing 74 + reminder-schedule + reminders + the new goal-factory case).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: End-to-end manual pass (preview, web)**

With the dev server running:
1. Create a goal → set cadence **Yearly** → it shows in Goals with a "Yearly" chip and the Yearly filter counts it.
2. Set cadence **Monthly** → Reminder section appears → toggle on, Day 11, 09:00 → `cadence:reminders` has the keyed entry.
3. Switch that goal to **Yearly** → month dropdown appears; pick a month → entry gains `month`.
4. Toggle the reminder off → key removed.
5. Open a **Daily** goal → no Reminder section.
6. Delete a goal with a reminder → its `cadence:reminders` key is gone.
7. No console errors throughout.

(Native notification firing is verified on a device build later — out of scope for web.)

- [ ] **Step 4: Final commit (only if verification needed a tweak)**

```bash
git add -A
git commit -m "test: verify yearly cadence + goal reminders end to end"
```

---

## Self-Review notes (reconciled against the spec)

- **Spec §1 Yearly cadence** → Task 4 (factory deadline) + Task 5 (label/picker/filters/counts).
- **Spec §2 reminder shape + keyed local store** → Task 2 (`reminders.js`).
- **Spec §3 pure helpers** → Task 1 (`goalReminderId`, `buildGoalSchedule`).
- **Spec §4 native wrappers** → Task 3 (`applyGoalReminder`, `rescheduleGoalReminders`).
- **Spec §5 Reminder UI** → Task 6.
- **Spec §6 triggering (edit/delete/launch)** → Task 6 (edit via `updateReminder`), Task 7 (delete + launch).
- **Spec edge cases** (no reminder/wrong cadence → null; web no-op; delete cleanup) → covered in Tasks 1, 3, 6, 7.
- Signatures consistent across tasks: `goalReminderId(goalId)`, `buildGoalSchedule(cadence, reminder)`, `applyGoalReminder(goal, reminder)`, `rescheduleGoalReminders(goals, reminders)`, store `getReminder/setReminder/removeReminder/loadReminders`.
