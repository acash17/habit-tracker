# Today-completion propagation + Insights calendar — design

**Date:** 2026-06-27
**Status:** Draft for review
**Author:** Pacely team (with Claude)

## Problem

Ticking a task done on the **Today** timeline updates nothing but that block.
The app keeps four independent data stores that never talk to each other:

| Store | Written by today | Read by |
|---|---|---|
| `blocks` (Today timeline) | Today tick circle | Today only |
| `goals[].sequence[].done` | Goal-detail sub-habit checkboxes only | Goals tab status, "Completed" filter |
| `habit-log` (`cadence:habitlog`) | "Log today" button in goal detail only | Heatmap squares |
| cloud `habit_logs` → rhythm | same "Log today" | Insights "Your rhythm" |

Root cause — [src/screen-today.jsx](../../../src/screen-today.jsx) `onDone`:
```js
onDone={() => setBlocks(blocks.map(x => x.id === b.id ? { ...x, done: !x.done, active: false } : x))}
```
Flips `block.done` and nothing else, even though blocks know their source goal
(`goal: goalId`). Result: a user who works their day on Today sees **Goals**,
**Insights**, and the **heatmap** stay empty, and there is no in-app calendar at all
(only `.ics` export).

## Goal

One tick on Today propagates to all four surfaces:
1. **Goals tab** — sub-habit marked done; card status + "Completed" filter update.
2. **GitHub-style heatmap** — that goal's day square fills.
3. **Insights rhythm** — completion time logged (cloud), rhythm + breakpoints populate.
4. **Calendar** — new month view inside the Insights tab reflects done days.

## Approach (chosen: A)

Make Today completion the single trigger that fans out to the existing stores,
and make the heatmap store shared so writes from anywhere are seen everywhere.

Rejected alternatives:
- **B — blocks as sole source of truth.** Derive goals/heatmap from block history.
  Large rewrite, removes manual "Log today", high risk. ✗
- **C — wire only Today→Goals done.** Smallest, but leaves heatmap/rhythm/calendar
  empty — under-delivers the requested outcome. ✗

## Design

### 1. Block ↔ goal-step linkage

Blocks created from a goal currently carry `goal: goalId` and id `${goalId}-${i}`,
but no stable step reference. Add `stepId` at creation so write-back is exact and
survives sub-habit reordering.

- [src/app.jsx](../../../src/app.jsx) `commitNewGoal` — when building blocks from
  `newGoal.sequence`, set `stepId: s.id` on each block.
- Onboarding blocks (`ob-${i}`, no goal) and library/voice blocks remain
  goal-less; they still flip locally but do not propagate (no goal to update).
  Out of scope: turning onboarding plans into goals.
- **Back-compat:** for existing blocks that have `goal` but no `stepId`, resolve the
  step by matching `block.label` to a `sequence[].label`; if no match, fall back to
  the block's trailing index in its id. Encapsulated in one helper
  `resolveStep(goal, block)` so the fallback lives in one place.

### 2. Shared habit-log store

Today's `useHabitLog` instantiates independent React state per screen, all
persisting to the same `cadence:habitlog` key — so a write from App is invisible to
a mounted GoalsScreen until it remounts. Convert the log to a **module-level store**
backed by `useSyncExternalStore`:

- `src/habit-log.js` gains a tiny store: in-memory `current`, `getSnapshot()`,
  `subscribe(fn)`, and `setLog(next)` which updates memory, persists via `saveLog`,
  and notifies subscribers.
- `useHabitLog()` keeps its **exact current signature** `[log, setLog]` but is
  reimplemented on `useSyncExternalStore`. Every consumer (GoalsScreen, GoalDetail,
  MiniHeatmap, new Calendar) now shares one source and re-renders on any write.
- Demo-seed behaviour preserved: seed runs once on first store read, same flag.

### 3. `completeBlock` handler in App

Replace the inline `onDone` with a handler lifted to App and passed to
TodayScreen as `onCompleteBlock(blockId)`:

```
toggle block.done (existing behaviour)
if block has goal:
  goal = goals.find(g => g.id === block.goal)
  step = resolveStep(goal, block)
  if step: setGoals → mark/unmark that sequence[].done
           level = heatLevel(goal)          // fraction of sub-habits done → 1..3
           day = dayKey()
           habitLog.setLog(setLevel(log, goal.id, level, day))
           syncCellToCloud(user?.id, goal.id, day, level)   // cloud rhythm + cross-device
```

- **Un-ticking** a block unmarks the step and recomputes level (down to 0 → clears
  the day cell and deletes the cloud row via existing `syncCellToCloud(...,0)`).
- TodayScreen keeps owning `blocks`/`setBlocks`; only the per-block completion call
  is delegated upward. Keeps Today's other block edits untouched.

### 4. Heat level from goal fraction (chosen intensity rule)

`heatLevel(goal)` maps the fraction of the goal's sub-habits done **today’s tick
state** to the 0..3 ramp used by the existing heatmap:

| done / total | level |
|---|---|
| 0 | 0 (cleared) |
| >0 and <50% | 1 |
| ≥50% and <100% | 2 |
| 100% | 3 |

Single pure function in `habit-log.js`, reused by both Today propagation and the
goal-detail logger so intensities stay consistent.

### 5. Calendar view in Insights

New `src/calendar-month.jsx` exporting `CalendarMonth`, rendered at the top of
`InsightsScreen` (above BreakpointInsight / RhythmSection):

- Month grid (current month, ‹ › to page). Each day cell tinted by that day's
  **aggregate** activity from the shared habit-log: sum of all goals' levels that
  day → reuse `cellColor` + a `toLevel`-style ramp so it matches the heatmap palette.
- Tap a day → inline list below the grid: goals with a level that day + their level
  dots. Empty days show a quiet "nothing logged".
- Reads the shared store only — works offline; cloud history already merges into the
  same store on sign-in via `pullHabitLogs`/`mergeCloudLogs`.
- When there are no goals at all, Insights still shows its existing "No insights yet"
  empty state; the calendar renders above it only when `goals.length > 0`.

## Data flow (after)

```
Today tick ──► completeBlock ──┬─► setBlocks (block.done)
                               ├─► setGoals (sequence[].done)      ─► Goals tab, Completed filter
                               ├─► habitLog.setLog (day level)     ─► Heatmap squares, Calendar grid
                               └─► syncCellToCloud (timestamped)   ─► cloud habit_logs ─► rhythm_by_hour ─► Insights rhythm
```

## Components / files touched

| File | Change |
|---|---|
| `src/habit-log.js` | Shared store via `useSyncExternalStore`; add `heatLevel(goal)`; keep `useHabitLog` signature |
| `src/app.jsx` | `completeBlock` handler; pass to TodayScreen; `stepId` on blocks in `commitNewGoal` |
| `src/screen-today.jsx` | Use `onCompleteBlock(blockId)` instead of inline block-only toggle |
| `src/screen-goals.jsx` | No logic change; benefits from shared store re-renders |
| `src/calendar-month.jsx` | **New** — `CalendarMonth` view |
| `src/screen-insights.jsx` | Render `CalendarMonth` at top when `goals.length > 0` |

## Error handling / edge cases

- Block with no `goal` → local toggle only (unchanged). No crash.
- `resolveStep` finds nothing → local toggle only; do not guess.
- Signed out → `syncCellToCloud` is a no-op (existing guard); heatmap/calendar/Goals
  still update locally; rhythm stays in its "sign in" prompt (unchanged).
- Cloud disabled → same as signed out; everything local works.
- Un-tick to 0% → clears the day cell + deletes cloud row (existing path).

## Testing

- **Unit (vitest):**
  - `heatLevel`: 0/partial/half/full → 0/1/2/3.
  - `resolveStep`: by stepId, by label fallback, by index fallback, miss → null.
  - habit-log store: `setLog` notifies subscribers; persists; level 0 clears.
- **Integration (jsdom + RTL if present, else manual):**
  - Tick a goal-linked Today block → goal sequence step flips, day cell appears,
    calendar day tints.
  - Un-tick → reverts.
- **Manual (preview):** create a goal → Today → tick steps → verify Goals status,
  heatmap, calendar; sign in → verify rhythm populates.

## Out of scope

- Turning onboarding/library/voice blocks into goals.
- Multi-day block history on Today (Today stays single-day; history lives in the log).
- Calendar editing (read-only reflection of completions for now).
