# Today-Completion Propagation + Goal-Everywhere + Insights Calendar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every plan-creation path produce a real goal, and make ticking a task on Today propagate to the Goals tab, the heatmap, the cloud rhythm, and a new in-app month calendar in Insights.

**Architecture:** Extract goal/block creation into a pure `goal-factory.js` so all four creation paths (new-goal, onboarding, library, voice) build identical goal records with goal-linked blocks. Convert the habit-log to a shared `useSyncExternalStore` store so writes from anywhere re-render every screen live. A lifted `completeBlock` handler fans a Today tick out to: block state, goal sub-habit `done`, the shared log (heatmap/calendar), and `syncCellToCloud` (rhythm). A new read-only `CalendarMonth` renders at the top of Insights from the same shared log.

**Tech Stack:** React 18, Vite 5, vitest (Node environment — pure-logic tests only; UI verified by running the app via the preview tools). Supabase for cloud (no-op when signed out).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/goal-factory.js` | **New.** Pure: `makeGoalFromSteps`, `seedBlocksFromGoal`, `resolveStep`, `heatLevel`. No browser globals. |
| `src/goal-factory.test.js` | **New.** Unit tests for the four pure helpers. |
| `src/habit-log.js` | Add shared store (`getLogSnapshot`/`subscribeLog`/`setSharedLog`), reimplement `useHabitLog` on it, add pure `dayBreakdown`. |
| `src/habit-log.test.js` | Add tests for store notify/snapshot and `dayBreakdown`. |
| `src/app.jsx` | Use factory in `commitNewGoal`; create goals in `finishOnboarding`/`applyPlan`; add `completeBlock`; wire library+voice to `applyPlan`. |
| `src/screen-today.jsx` | Call `onCompleteBlock(b.id)` instead of toggling block state inline. |
| `src/onboarding.jsx` | Pass `{ title, steps }` to `onDone`. |
| `src/sheet-library.jsx` | `onApply({ title, steps }, msg)` instead of blocks. |
| `src/sheet-voice.jsx` | `onApply({ title, steps }, msg)` instead of blocks. |
| `src/calendar-month.jsx` | **New.** `CalendarMonth` read-only month view. |
| `src/screen-insights.jsx` | Render `CalendarMonth` above other cards when goals exist. |

---

## Task 1: Pure goal-factory helpers

**Files:**
- Create: `src/goal-factory.js`
- Test: `src/goal-factory.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/goal-factory.test.js
import { describe, test, expect } from 'vitest';
import { makeGoalFromSteps, seedBlocksFromGoal, resolveStep, heatLevel } from './goal-factory.js';

describe('makeGoalFromSteps', () => {
  const steps = [
    { label: 'Warm up', est: 5, kind: 'body', why: 'a' },
    { label: 'Focus', est: 50, kind: 'focus' },
  ];

  test('builds a goal with g_ id, title, color, and a sequence with s_ step ids', () => {
    const g = makeGoalFromSteps('My plan', steps, { colorIndex: 0 });
    expect(g.id.startsWith('g_')).toBe(true);
    expect(g.title).toBe('My plan');
    expect(g.color).toBe('terracotta');
    expect(g.cadence).toBe('oneoff');
    expect(g.sequence).toHaveLength(2);
    expect(g.sequence[0].id.startsWith('s_')).toBe(true);
    expect(g.sequence[0]).toMatchObject({ label: 'Warm up', est: 5, kind: 'body', done: false, active: true });
    expect(g.sequence[1].active).toBe(false);
    expect(g.sequence[1].est).toBe(50);
  });

  test('blank title falls back to "Untitled plan"; missing est defaults to 10', () => {
    const g = makeGoalFromSteps('   ', [{ label: 'x' }]);
    expect(g.title).toBe('Untitled plan');
    expect(g.sequence[0].est).toBe(10);
  });

  test('color cycles by colorIndex; daily cadence sets a recurring-style deadline', () => {
    expect(makeGoalFromSteps('a', steps, { colorIndex: 1 }).color).toBe('sage');
    expect(makeGoalFromSteps('a', steps, { colorIndex: 2 }).color).toBe('lavender');
    const daily = makeGoalFromSteps('a', steps, { cadence: 'daily', recurring: true });
    expect(daily.deadline).toBe('Every day');
    expect(daily.recurring).toBe(true);
  });

  test('oneoff cadence forces recurring false and maps a deadline key to a label', () => {
    const g = makeGoalFromSteps('a', steps, { cadence: 'oneoff', recurring: true, deadline: 'today' });
    expect(g.recurring).toBe(false);
    expect(g.deadline).toBe('Today');
  });
});

describe('seedBlocksFromGoal', () => {
  test('lays steps from 9am on an empty day, tagging goal + stepId', () => {
    const g = makeGoalFromSteps('p', [{ label: 'A', est: 20, kind: 'focus' }, { label: 'B', est: 10, kind: 'rest' }]);
    const blocks = seedBlocksFromGoal(g, []);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ startMin: 540, dur: 20, label: 'A', goal: g.id, stepId: g.sequence[0].id, done: false });
    expect(blocks[1].startMin).toBe(560); // 540 + 20
    expect(blocks[1].stepId).toBe(g.sequence[1].id);
  });

  test('appends after the latest existing block end', () => {
    const g = makeGoalFromSteps('p', [{ label: 'A', est: 15, kind: 'focus' }]);
    const blocks = seedBlocksFromGoal(g, [{ startMin: 600, dur: 30 }]);
    expect(blocks[0].startMin).toBe(630); // max(600+30)
  });
});

describe('resolveStep', () => {
  const g = makeGoalFromSteps('p', [{ label: 'A', est: 5 }, { label: 'B', est: 5 }]);

  test('resolves by stepId first', () => {
    const block = { id: 'x', stepId: g.sequence[1].id, label: 'B', goal: g.id };
    expect(resolveStep(g, block)).toBe(g.sequence[1]);
  });

  test('falls back to label when stepId missing', () => {
    expect(resolveStep(g, { id: 'x', label: 'A' })).toBe(g.sequence[0]);
  });

  test('falls back to trailing index in id when stepId + label miss', () => {
    expect(resolveStep(g, { id: `${g.id}-1`, label: 'gone' })).toBe(g.sequence[1]);
  });

  test('returns null when nothing matches', () => {
    expect(resolveStep(g, { id: 'no-index', label: 'gone' })).toBeNull();
  });
});

describe('heatLevel', () => {
  const mk = (flags) => ({ sequence: flags.map((d, i) => ({ id: 's' + i, done: d })) });
  test('0 done → 0', () => expect(heatLevel(mk([false, false, false, false]))).toBe(0));
  test('partial (<50%) → 1', () => expect(heatLevel(mk([true, false, false, false]))).toBe(1));
  test('half-or-more (<100%) → 2', () => expect(heatLevel(mk([true, true, false, false]))).toBe(2));
  test('all done → 3', () => expect(heatLevel(mk([true, true, true, true]))).toBe(3));
  test('empty sequence → 0', () => expect(heatLevel({ sequence: [] })).toBe(0));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/goal-factory.test.js`
Expected: FAIL — `Failed to resolve import "./goal-factory.js"`.

- [ ] **Step 3: Write the implementation**

```js
// src/goal-factory.js
// Pure factory for goals + their Today blocks. No browser globals — every plan
// path (new-goal, onboarding, library, voice) funnels through here so goal
// records and goal-linked blocks are built identically.
import { newId } from './utils.js';

const PALETTE = ['terracotta', 'sage', 'lavender'];

const DEADLINE_LABEL = {
  'today': 'Today', 'this-week': 'This week',
  'this-month': 'This month', 'no-rush': 'Slow burn',
};

// title + raw steps (label/est/kind/why) → a full goal record.
export function makeGoalFromSteps(title, steps, opts = {}) {
  const t = (title || '').trim();
  const list = Array.isArray(steps) ? steps : [];
  const cadence = opts.cadence || 'oneoff';
  const recurring = !!opts.recurring && cadence !== 'oneoff';
  const colorIndex = typeof opts.colorIndex === 'number' ? opts.colorIndex : 0;
  const deadlineKey = opts.deadline || 'this-week';
  const deadline = cadence === 'oneoff'
    ? (DEADLINE_LABEL[deadlineKey] || deadlineKey)
    : (cadence === 'daily' ? 'Every day' : cadence === 'weekly' ? 'Every week' : 'Every month');
  return {
    id: newId('g_'),
    title: t || 'Untitled plan',
    color: PALETTE[colorIndex % PALETTE.length],
    cadence,
    recurring,
    deadline,
    sequence: list.map((s, i) => ({
      id: newId('s_'),
      label: s.label || `Step ${i + 1}`,
      est: typeof s.est === 'number' ? s.est : 10,
      done: false,
      active: i === 0,
      why: s.why || '',
      kind: s.kind || 'focus',
    })),
  };
}

// goal → Today blocks, appended after existing blocks (or from 9am on an empty
// day). Each block carries `goal` + `stepId` so completion can write back.
export function seedBlocksFromGoal(goal, existingBlocks = []) {
  let cursor = existingBlocks.length
    ? Math.max(...existingBlocks.map(b => b.startMin + b.dur))
    : 9 * 60;
  return goal.sequence.map((s, i) => {
    const b = {
      id: `${goal.id}-${i}`, startMin: cursor, dur: s.est, label: s.label,
      kind: s.kind, done: false, active: false, goal: goal.id, stepId: s.id,
      scores: { urgency: 0.5, importance: 0.6, energyMatch: 0.7, success: 0.8, effort: 0.4 },
      optional: false, deps: [],
    };
    cursor += s.est;
    return b;
  });
}

// Find which goal sub-habit a Today block belongs to. stepId → label → trailing
// index in the block id. Returns the step object, or null when nothing matches.
export function resolveStep(goal, block) {
  const seq = (goal && goal.sequence) || [];
  if (!seq.length || !block) return null;
  if (block.stepId) {
    const byId = seq.find(s => s.id === block.stepId);
    if (byId) return byId;
  }
  if (block.label) {
    const byLabel = seq.find(s => s.label === block.label);
    if (byLabel) return byLabel;
  }
  const m = /-(\d+)$/.exec(block.id || '');
  if (m) {
    const idx = Number(m[1]);
    if (idx >= 0 && idx < seq.length) return seq[idx];
  }
  return null;
}

// Fraction of a goal's sub-habits done → 0..3 heatmap intensity.
export function heatLevel(goal) {
  const seq = (goal && goal.sequence) || [];
  const total = seq.length;
  if (!total) return 0;
  const done = seq.filter(s => s.done).length;
  if (done === 0) return 0;
  const frac = done / total;
  if (frac >= 1) return 3;
  if (frac >= 0.5) return 2;
  return 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/goal-factory.test.js`
Expected: PASS — all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/goal-factory.js src/goal-factory.test.js
git commit -m "feat: pure goal-factory (makeGoalFromSteps, seedBlocksFromGoal, resolveStep, heatLevel)"
```

---

## Task 2: Shared habit-log store + dayBreakdown

**Files:**
- Modify: `src/habit-log.js`
- Test: `src/habit-log.test.js`

- [ ] **Step 1: Write the failing test (append to existing file)**

```js
// Append to src/habit-log.test.js
import { getLogSnapshot, subscribeLog, setSharedLog, dayBreakdown } from './habit-log.js';

describe('shared log store', () => {
  test('setSharedLog updates the snapshot and notifies subscribers', () => {
    let calls = 0;
    const unsub = subscribeLog(() => { calls++; });
    setSharedLog({ g1: { '2026-06-27': 2 } });
    expect(getLogSnapshot().g1['2026-06-27']).toBe(2);
    expect(calls).toBe(1);
    unsub();
    setSharedLog({ g1: { '2026-06-27': 3 } });
    expect(calls).toBe(1); // no longer subscribed
  });

  test('setSharedLog accepts an updater function', () => {
    setSharedLog({ g1: { d: 1 } });
    setSharedLog(prev => ({ ...prev, g2: { d: 2 } }));
    const snap = getLogSnapshot();
    expect(snap.g1.d).toBe(1);
    expect(snap.g2.d).toBe(2);
  });
});

describe('dayBreakdown', () => {
  test('aggregates each goal level on a given day', () => {
    const log = { g1: { '2026-06-27': 2 }, g2: { '2026-06-27': 1, '2026-06-26': 3 } };
    expect(dayBreakdown(log, '2026-06-27')).toEqual({
      total: 3,
      goals: [{ goalId: 'g1', level: 2 }, { goalId: 'g2', level: 1 }],
    });
  });

  test('ignores zero/absent cells and empty log', () => {
    expect(dayBreakdown({ g1: { '2026-06-27': 0 } }, '2026-06-27')).toEqual({ total: 0, goals: [] });
    expect(dayBreakdown({}, '2026-06-27')).toEqual({ total: 0, goals: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/habit-log.test.js`
Expected: FAIL — `getLogSnapshot`/`subscribeLog`/`setSharedLog`/`dayBreakdown` are not exported.

- [ ] **Step 3: Add the store + dayBreakdown, reimplement useHabitLog**

In `src/habit-log.js`, replace the `useHabitLog` hook (the block at the bottom, lines ~174-188) with the shared store below, and add `dayBreakdown`. Keep `seedDemoLog`, `SEED_FLAG`, and all existing exports unchanged.

```js
// ── Shared store ──────────────────────────────────────────────────────────────
// One source of truth so a write from anywhere (Today tick, goal-detail logger)
// re-renders every screen via useSyncExternalStore.
let _current = null;             // null = not yet initialised
const _listeners = new Set();

function _init() {
  if (_current !== null) return _current;
  const existing = loadLog();
  if (Object.keys(existing).length > 0) { _current = existing; return _current; }
  let alreadySeeded = false;
  try { alreadySeeded = localStorage.getItem('cadence:' + SEED_FLAG) === '1'; } catch { /* ignore */ }
  if (alreadySeeded) { _current = existing; return _current; }
  _current = seedDemoLog();
  try { localStorage.setItem('cadence:' + SEED_FLAG, '1'); } catch { /* ignore */ }
  saveLog(_current);
  return _current;
}

export function getLogSnapshot() { return _init(); }
export function subscribeLog(fn) { _listeners.add(fn); return () => _listeners.delete(fn); }
export function setSharedLog(next) {
  const base = _init();
  _current = typeof next === 'function' ? next(base) : next;
  saveLog(_current);
  _listeners.forEach(fn => fn());
}

// React hook: shared log + a setter. Same [log, setLog] signature as before, so
// existing consumers (GoalsScreen, GoalDetail, MiniHeatmap) are unchanged.
export function useHabitLog() {
  const log = React.useSyncExternalStore(subscribeLog, getLogSnapshot, getLogSnapshot);
  return [log, setSharedLog];
}

// All goals' levels on one day → { total, goals: [{goalId, level}] }. Pure.
export function dayBreakdown(log, day) {
  const goals = [];
  let total = 0;
  for (const gid of Object.keys(log || {})) {
    const lvl = (log[gid] && log[gid][day]) || 0;
    if (lvl > 0) { goals.push({ goalId: gid, level: lvl }); total += lvl; }
  }
  return { total, goals };
}
```

Note: `_init()` calls `saveLog` after seeding so the seeded demo persists the same way the old hook did via its mount effect.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/habit-log.test.js`
Expected: PASS — existing `habitLogRow`/`mergeCloudLogs` tests plus the new store + `dayBreakdown` tests all green.

- [ ] **Step 5: Run the full suite (no regressions in other modules)**

Run: `npm test`
Expected: PASS — all test files green.

- [ ] **Step 6: Commit**

```bash
git add src/habit-log.js src/habit-log.test.js
git commit -m "feat: shared habit-log store (useSyncExternalStore) + dayBreakdown"
```

---

## Task 3: New-goal path uses the factory

**Files:**
- Modify: `src/app.jsx` (imports; `commitNewGoal` ~lines 299-349)

- [ ] **Step 1: Add factory import**

At the top of `src/app.jsx`, add after the existing local imports (e.g. after the `cloud-sync` import line):

```js
import { makeGoalFromSteps, seedBlocksFromGoal, resolveStep, heatLevel } from './goal-factory.js';
import { setSharedLog, dayBreakdown } from './habit-log.js';
import { setLevel, dayKey } from './habit-log.js';
import { syncCellToCloud } from './cloud-sync.js';
```

(If `useCloudSync`/`deleteGoalCloud` are already imported from `./cloud-sync.js`, merge `syncCellToCloud` into that existing import line instead of adding a duplicate. `dayBreakdown` is used by the calendar in Task 8 but importing it here is harmless; alternatively add it in Task 8.)

- [ ] **Step 2: Replace the body of `commitNewGoal`**

Replace the whole `commitNewGoal` function (currently building `newGoal` inline and seeding blocks inline) with:

```js
  function commitNewGoal(goalTitle, sequence, opts) {
    setSheetOpen(false);
    const title = (goalTitle || '').trim();
    if (!title) { flash('Goal needs a name'); return; }
    const goal = makeGoalFromSteps(title, sequence, {
      cadence: (opts && opts.cadence) || 'oneoff',
      recurring: !!(opts && opts.recurring),
      deadline: (opts && opts.deadline) || 'this-week',
      colorIndex: goals.length,
    });
    setGoals(prev => [goal, ...prev]);
    setBlocks(prev => [...prev, ...seedBlocksFromGoal(goal, prev)]);
    flash(`Added · ${title.length > 28 ? title.slice(0, 28) + '…' : title}`);
  }
```

- [ ] **Step 3: Verify in the running app**

Start the dev server with preview_start (config name `dev`), then in the app create a goal via the **+** button → add a couple of steps → commit. Confirm via preview_eval:

```js
JSON.parse(localStorage.getItem('cadence:goals')||'[]').map(g => ({ title: g.title, steps: g.sequence.length }))
```
Expected: the new goal listed. Confirm `cadence:blocks` entries for it have both `goal` and `stepId`:
```js
JSON.parse(localStorage.getItem('cadence:blocks')||'[]').slice(-2).map(b => ({ goal: b.goal, stepId: b.stepId }))
```
Expected: both fields present.

- [ ] **Step 4: Commit**

```bash
git add src/app.jsx
git commit -m "refactor: commitNewGoal builds via goal-factory (adds stepId to blocks)"
```

---

## Task 4: `completeBlock` — propagate a Today tick

**Files:**
- Modify: `src/app.jsx` (add `completeBlock`; pass to TodayScreen ~lines 416-428)
- Modify: `src/screen-today.jsx` (use `onCompleteBlock`)

- [ ] **Step 1: Add the `completeBlock` handler in App**

In `src/app.jsx`, add this function alongside the other handlers (e.g. just after `adapt`):

```js
  // A Today tick fans out: flip the block, mark the goal sub-habit done, write the
  // day's heatmap level (shared store → heatmap + calendar), and mirror to cloud
  // (rhythm). Blocks with no resolvable goal/step just flip locally.
  function completeBlock(blockId) {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const nextDone = !block.done;
    setBlocks(blocks.map(x => x.id === blockId ? { ...x, done: nextDone, active: false } : x));

    if (!block.goal) return;
    const goal = goals.find(g => g.id === block.goal);
    if (!goal) return;
    const step = resolveStep(goal, block);
    if (!step) return;

    const updatedGoal = { ...goal, sequence: goal.sequence.map(s => s.id === step.id ? { ...s, done: nextDone } : s) };
    setGoals(prev => prev.map(g => g.id === goal.id ? updatedGoal : g));

    const level = heatLevel(updatedGoal);
    const day = dayKey();
    setSharedLog(prev => setLevel(prev, goal.id, level, day));
    syncCellToCloud(user?.id, goal.id, day, level);
  }
```

- [ ] **Step 2: Pass it to TodayScreen**

In the `tab === 'today'` render, add the prop to `<TodayScreen ...>`:

```js
            onCompleteBlock={completeBlock}
```

- [ ] **Step 3: Use it in TodayScreen**

In `src/screen-today.jsx`, change the `TodayScreen` signature to accept `onCompleteBlock`:

```js
function TodayScreen({ blocks, setBlocks, onAdapt, openNewGoal, onRunningLong, onWhy, onLife, onVoice, onLibrary, onCompleteBlock }) {
```

Then replace the timeline block's `onDone` (currently the inline `setBlocks(blocks.map(...))`) with:

```js
            onDone={() => onCompleteBlock(b.id)}
```

- [ ] **Step 4: Verify in the running app**

Reload the preview. Create a goal (Task 3). Go to **Today**, tick its first task. Then check:

```js
(() => {
  const g = JSON.parse(localStorage.getItem('cadence:goals')||'[]')[0];
  const log = JSON.parse(localStorage.getItem('cadence:habitlog')||'{}');
  const today = new Date().toISOString().slice(0,10);
  return { firstStepDone: g.sequence[0].done, todayLevel: (log[g.id]||{})[today] };
})()
```
Expected: `firstStepDone: true`, `todayLevel: 1` (one of several steps done → level 1).
Open the **Goals** tab → the card now shows "In progress · 1/N". Untick on Today → step reverts to `false`, level clears.

- [ ] **Step 5: Commit**

```bash
git add src/app.jsx src/screen-today.jsx
git commit -m "feat: Today tick propagates to goal sub-habit + heatmap + cloud"
```

---

## Task 5: Onboarding creates a goal

**Files:**
- Modify: `src/onboarding.jsx` (`onDone` call sites)
- Modify: `src/app.jsx` (`finishOnboarding` ~lines 366-394)

- [ ] **Step 1: Pass title + steps from onboarding**

In `src/onboarding.jsx`, the WinScreen start handler currently calls `onDone(generated)`. Change it to pass the typed goal title with the steps:

```js
        {screen === 'win'      && <WinScreen onStart={() => onDone({ title: goalText, steps: generated })}/>}
```

Leave the **Skip** button (`onClick={onDone}`, which calls `onDone(undefined)`) as-is — `finishOnboarding` handles a missing payload in the next step.

- [ ] **Step 2: Rewrite `finishOnboarding` to create a goal**

In `src/app.jsx`, replace `finishOnboarding` with:

```js
  function finishOnboarding(payload) {
    try { localStorage.setItem('cadence-onboarded', '1'); } catch {}
    // Onboarding promised "your first plan is ready" — deliver it as a real goal
    // so it shows in the Goals tab AND lands on Today, goal-linked.
    const steps = Array.isArray(payload?.steps) ? payload.steps
      : Array.isArray(payload) ? payload // back-compat: a bare steps array
      : [];
    const clean = steps.filter(s => (s.label || '').trim());
    if (clean.length) {
      const goal = makeGoalFromSteps(payload?.title || 'My first plan', clean, {
        cadence: 'oneoff', colorIndex: goals.length,
      });
      setGoals(prev => [goal, ...prev]);
      setBlocks(seedBlocksFromGoal(goal, [])); // first run: start the day at 9am
    }
    setOnboarding(false);
    try {
      if (localStorage.getItem(FEATURE_TOUR_SEEN) !== '1') {
        setTab('today');
        setTimeout(() => setFeatureTourOn(true), 650);
      }
    } catch {}
  }
```

- [ ] **Step 3: Verify in the running app**

Force onboarding to replay, then complete it:
```js
localStorage.removeItem('cadence-onboarded'); location.reload();
```
Click through onboarding to the final "win" screen and start. Then:
```js
JSON.parse(localStorage.getItem('cadence:goals')||'[]').map(g => g.title)
```
Expected: a goal titled "Gym, 2 hours deep work, emails" (the onboarding default `goalText`) is present. The **Goals** tab shows it; **Today** shows its steps.

- [ ] **Step 4: Commit**

```bash
git add src/onboarding.jsx src/app.jsx
git commit -m "feat: onboarding first plan becomes a real goal"
```

---

## Task 6: `applyPlan` + library/voice create goals

**Files:**
- Modify: `src/app.jsx` (add `applyPlan`; library + voice `onApply` props ~lines 484-499)
- Modify: `src/sheet-library.jsx` (`TemplatePreview.add`)
- Modify: `src/sheet-voice.jsx` (`apply`)

- [ ] **Step 1: Add `applyPlan` in App**

In `src/app.jsx`, add near `applyDayChange`:

```js
  // Library/voice plans become real goals (so they appear in Goals + propagate),
  // and their steps land on Today after any already-done blocks.
  function applyPlan(plan, msg) {
    const steps = Array.isArray(plan?.steps) ? plan.steps.filter(s => (s.label || '').trim()) : [];
    if (!steps.length) { flash('Plan needs steps'); return; }
    const goal = makeGoalFromSteps(plan.title, steps, { cadence: 'oneoff', colorIndex: goals.length });
    setGoals(prev => [goal, ...prev]);
    setBlocks(prev => {
      const kept = prev.filter(b => b.done);
      return [...kept, ...seedBlocksFromGoal(goal, kept)];
    });
    setLibraryOpen(false); setVoiceOpen(false);
    flash(msg);
  }
```

`applyDayChange` stays unchanged (still used by the Life-happened recovery flow, which reshapes the day rather than creating a goal).

- [ ] **Step 2: Point library + voice at `applyPlan`**

In the `libraryOpen` sheet render, replace the `onApply` handler:

```js
      {libraryOpen && (
        <LibrarySheet
          onClose={() => setLibraryOpen(false)}
          onApply={applyPlan}
        />
      )}
```

In the `voiceOpen` sheet render, replace its `onApply`:

```js
      {voiceOpen && (
        <VoiceSheet
          onClose={() => setVoiceOpen(false)}
          onApply={applyPlan}
        />
      )}
```

- [ ] **Step 3: Library sheet passes title + steps**

In `src/sheet-library.jsx`, change `TemplatePreview.add` so it sends the edited steps and template title instead of pre-built blocks:

```js
  function add() {
    onApply({ title: t.title, steps }, `Added "${t.title}"`);
  }
```

(Remove the now-unused `cursor`/`blocks` construction inside `add`.)

- [ ] **Step 4: Voice sheet passes title + steps**

In `src/sheet-voice.jsx`, change `apply`:

```js
  function apply() {
    onApply({ title: 'Voice plan', steps: plan }, 'Day built from your voice plan');
  }
```

(Remove the now-unused `cursor`/`blocks` construction inside `apply`.)

- [ ] **Step 5: Verify in the running app**

Reload. On **Today**, open **From library** → pick a template → **Add**. Then open **Voice plan** → let it parse → **Use this day**. Check:
```js
JSON.parse(localStorage.getItem('cadence:goals')||'[]').map(g => g.title)
```
Expected: the template's title and "Voice plan" both appear. Both show in the **Goals** tab; their tasks on Today carry `goal` + `stepId` (spot-check as in Task 3 Step 3).

- [ ] **Step 6: Commit**

```bash
git add src/app.jsx src/sheet-library.jsx src/sheet-voice.jsx
git commit -m "feat: library + voice plans create real goals via applyPlan"
```

---

## Task 7: CalendarMonth component

**Files:**
- Create: `src/calendar-month.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/calendar-month.jsx
import React from 'react';
import { Card } from './ui.jsx';
import { useHabitLog, dayKey, dayBreakdown } from './habit-log.js';
import { cellColor } from './palette.js';
import { paletteHex } from './palette.js';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Raw day total → 0..3 ramp, relative to the busiest day in view.
function toLevel(total, max) {
  if (!total || max <= 0) return 0;
  return Math.max(1, Math.min(3, Math.ceil((total / max) * 3)));
}

// Build a weeks×7 grid for a given month (cells outside the month are null).
function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function CalendarMonth({ goals }) {
  const [log] = useHabitLog();
  const today = new Date();
  const [view, setView] = React.useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = React.useState(dayKey(today));

  const weeks = React.useMemo(() => monthCells(view.y, view.m), [view.y, view.m]);

  // Busiest day this month → ramp denominator.
  const monthMax = React.useMemo(() => {
    let max = 0;
    for (const wk of weeks) for (const d of wk) {
      if (!d) continue;
      const { total } = dayBreakdown(log, dayKey(d));
      if (total > max) max = total;
    }
    return max;
  }, [weeks, log]);

  const titleOf = (gid) => (goals.find(g => g.id === gid) || {}).title || 'Goal';
  const colorOf = (gid) => paletteHex((goals.find(g => g.id === gid) || {}).color);

  const sel = dayBreakdown(log, selected);
  const todayKey = dayKey(today);

  function shift(delta) {
    setView(v => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => shift(-1)} aria-label="previous month" style={navBtn}>‹</button>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', letterSpacing: -0.2 }}>
          {MONTHS[view.m]} {view.y}
        </div>
        <button onClick={() => shift(1)} aria-label="next month" style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
        {WEEKDAY_LETTERS.map((l, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(31,27,22,0.4)' }}>{l}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {weeks.flat().map((d, i) => {
          if (!d) return <div key={i} />;
          const k = dayKey(d);
          const { total } = dayBreakdown(log, k);
          const lvl = toLevel(total, monthMax);
          const isSel = k === selected;
          const isToday = k === todayKey;
          return (
            <button key={i} onClick={() => setSelected(k)} aria-label={k} style={{
              aspectRatio: '1', borderRadius: 8, cursor: 'pointer', padding: 0,
              border: isSel ? '1.5px solid var(--ink)' : isToday ? '1px solid var(--terra)' : '0.5px solid rgba(31,27,22,0.06)',
              background: lvl ? cellColor('terracotta', lvl) : 'var(--paper-2)',
              color: lvl >= 2 ? '#fff' : 'rgba(31,27,22,0.7)',
              fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{d.getDate()}</button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, borderTop: '0.5px solid rgba(31,27,22,0.08)', paddingTop: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(31,27,22,0.64)', marginBottom: 8 }}>
          {selected}
        </div>
        {sel.goals.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.5)' }}>Nothing logged this day.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sel.goals.map(({ goalId, level }) => (
              <div key={goalId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: colorOf(goalId) }} />
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>{titleOf(goalId)}</span>
                <span style={{ display: 'flex', gap: 3 }}>
                  {[1, 2, 3].map(n => (
                    <span key={n} style={{ width: 6, height: 6, borderRadius: 999, background: n <= level ? 'var(--terra)' : 'rgba(31,27,22,0.12)' }} />
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

const navBtn = {
  width: 30, height: 30, borderRadius: 999, cursor: 'pointer',
  border: '0.5px solid rgba(31,27,22,0.12)', background: 'var(--card)',
  color: 'var(--ink)', fontSize: 16, lineHeight: 1,
};

Object.assign(window, { CalendarMonth });
export { CalendarMonth as default };
```

Note: confirm `cellColor` and `paletteHex` are exported from `src/palette.js` (they are used in `screen-goals.jsx` and `screen-insights.jsx` already). If `paletteHex` is missing a color it should fall back to a default — verify it tolerates `undefined`.

- [ ] **Step 2: Smoke-check the import resolves**

Run: `npm run build`
Expected: build succeeds (no unresolved imports / syntax errors).

- [ ] **Step 3: Commit**

```bash
git add src/calendar-month.jsx
git commit -m "feat: read-only CalendarMonth view (reads shared habit-log)"
```

---

## Task 8: Render CalendarMonth in Insights

**Files:**
- Modify: `src/screen-insights.jsx` (`InsightsScreen` ~lines 272-310)

- [ ] **Step 1: Import + render the calendar**

At the top of `src/screen-insights.jsx`, add:

```js
import { CalendarMonth } from './calendar-month.jsx';
```

In `InsightsScreen`, inside the `hasGoals ? (...)` branch, render the calendar first:

```jsx
      {hasGoals ? (
        <>
          <CalendarMonth goals={goals} />
          <BreakpointInsight goals={goals} />
          <RhythmSection />
        </>
      ) : (
```

- [ ] **Step 2: Verify in the running app**

Reload. Create a goal and tick a task on **Today** (Task 4). Open **Insights**:
- The month calendar appears at the top; **today's** cell is tinted.
- Tap today → the goal is listed with its level dots.
- Tap an empty day → "Nothing logged this day."
Check the console for errors with preview_console_logs (expect none). Capture a screenshot for the user.

- [ ] **Step 3: Commit**

```bash
git add src/screen-insights.jsx
git commit -m "feat: show CalendarMonth at top of Insights"
```

---

## Task 9: Full regression + end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: PASS — all files green.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: End-to-end manual pass (preview)**

With the dev server running, walk the full loop and confirm each surface:
1. Replay onboarding → finish → **goal in Goals tab**, tasks on Today.
2. Add a **library** template and a **voice** plan → both appear in Goals.
3. On **Today**, tick several tasks of one goal → Goals card status climbs (In progress → Done at 100%); the **Completed** filter counts it at 100%.
4. **Insights** calendar tints today; tap today shows the goals + levels.
5. Untick on Today → goal status + calendar revert.
6. If a Supabase login is available: sign in, tick a task, confirm the rhythm section eventually populates (cloud RPC). If not available, note it as untested-by-design (cloud-gated).

- [ ] **Step 4: Final commit (if any verification tweaks were needed)**

```bash
git add -A
git commit -m "test: verify Today-completion propagation end to end"
```

---

## Self-Review notes (already reconciled against the spec)

- **Spec §0 shared create path** → Task 1 (`makeGoalFromSteps`/`seedBlocksFromGoal`), consumed in Tasks 3, 5, 6.
- **Spec §1 block↔step linkage + resolveStep fallback** → Task 1 (`resolveStep`) + Task 3 (`stepId` on blocks).
- **Spec §2 shared store** → Task 2.
- **Spec §3 completeBlock** → Task 4.
- **Spec §4 heatLevel rule** → Task 1 (`heatLevel`).
- **Spec §5 calendar in Insights** → Tasks 7-8 (`dayBreakdown` in Task 2).
- **Spec "every plan path creates a goal"** → Tasks 5 (onboarding), 6 (library, voice), 3 (new-goal).
- **Edge cases** (no goal/step → local-only; untick → clear; signed-out → no-op cloud) → covered in Task 4 handler + verified in Tasks 4/8 steps.
