// Completion log — local-first. Per goal, per day, an intensity level (0..3).
// Stored at cadence:habitlog = { [goalId]: { 'YYYY-MM-DD': level } }.
// Mirrors the planned Supabase `habit_logs` table (append-only events); this is
// the local cache that powers the heatmap offline. Cloud sync wires in later.
import React from 'react';
import { load, save } from './storage.js';

const KEY = 'habitlog';

export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function loadLog() { return load(KEY, {}); }
export function saveLog(log) { save(KEY, log); }

// Get intensity (0..3) for one goal on one day.
export function getLevel(log, goalId, date = dayKey()) {
  return (log[goalId] && log[goalId][date]) || 0;
}

// Cycle a day's level 0→1→2→3→0 (tap-to-log). Returns new log object.
export function cycleLevel(log, goalId, date = dayKey()) {
  const cur = getLevel(log, goalId, date);
  const next = (cur + 1) % 4;
  const goalLog = { ...(log[goalId] || {}) };
  if (next === 0) delete goalLog[date];
  else goalLog[date] = next;
  return { ...log, [goalId]: goalLog };
}

// Set explicit level. level 0 clears the day.
export function setLevel(log, goalId, level, date = dayKey()) {
  const goalLog = { ...(log[goalId] || {}) };
  if (!level) delete goalLog[date];
  else goalLog[date] = Math.max(0, Math.min(3, level));
  return { ...log, [goalId]: goalLog };
}

// ── Cloud bridge (habit_logs table) ──────────────────────────────────────────

// Build an upsertable `habit_logs` row for a whole-goal completion.
// step_id is '' (not null) so the composite unique constraint
// (user_id, goal_id, day, step_id) can be a plain PostgREST onConflict target.
export function habitLogRow(userId, goalId, day, level, at) {
  return {
    user_id: userId,
    goal_id: goalId,
    step_id: '',
    day,
    level,
    done_at: at,
  };
}

// Merge pulled `habit_logs` rows into the local day→level cache.
// Cloud is the source of truth on bootstrap, so it wins on conflict.
// A level-0 row clears that cell. Pure — never mutates `log`.
export function mergeCloudLogs(log, rows) {
  const out = {};
  for (const gid of Object.keys(log)) out[gid] = { ...log[gid] };
  for (const r of rows) {
    const goalLog = out[r.goal_id] ? { ...out[r.goal_id] } : {};
    if (r.level) goalLog[r.day] = r.level;
    else delete goalLog[r.day];
    out[r.goal_id] = goalLog;
  }
  return out;
}

// ── Stats over a goal's log ──────────────────────────────────────────────────

export function goalStats(log, goalId) {
  const entries = log[goalId] || {};
  const days = Object.keys(entries);
  const totalEntries = days.reduce((s, d) => s + entries[d], 0); // intensity-weighted
  const activeDays = days.length;
  const avgPerActive = activeDays ? (totalEntries / activeDays) : 0;

  // Current streak: consecutive days up to today with level > 0.
  let streak = 0;
  const d = new Date();
  for (;;) {
    if (entries[dayKey(d)] > 0) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }

  // Best streak across history.
  const sorted = days.slice().sort();
  let best = 0, run = 0, prev = null;
  for (const k of sorted) {
    if (prev) {
      const pd = new Date(prev); pd.setDate(pd.getDate() + 1);
      run = (dayKey(pd) === k) ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = k;
  }

  return { totalEntries, activeDays, avgPerActive, streak, best };
}

/**
 * Build a weeks×days grid ending today, like GitHub's contribution graph.
 * Returns { weeks: [[{date, level}|null x7] ...], monthLabels: [{col,label}] }.
 * `weeksBack` controls width (17 ≈ 4 months, fits a phone column).
 */
export function buildGrid(log, goalId, weeksBack = 17) {
  const entries = log[goalId] || {};
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Find the Sunday on/before today, then go back weeksBack-1 weeks.
  const end = new Date(today);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
  const start = new Date(startOfWeek);
  start.setDate(start.getDate() - (weeksBack - 1) * 7);

  const weeks = [];
  const monthLabels = [];
  let lastMonth = -1;
  let col = 0;
  for (let w = new Date(start); w <= end; w.setDate(w.getDate() + 7)) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const cell = new Date(w);
      cell.setDate(cell.getDate() + i);
      if (cell > end) { week.push(null); continue; }
      const k = dayKey(cell);
      week.push({ date: k, level: entries[k] || 0, future: false });
      const mo = cell.getMonth();
      if (mo !== lastMonth && cell.getDate() <= 7) {
        monthLabels.push({ col, label: cell.toLocaleString('en', { month: 'short' }) });
        lastMonth = mo;
      }
    }
    weeks.push(week);
    col++;
  }
  return { weeks, monthLabels };
}

// Seed plausible history for the three starter goals (g1/g2/g3) on first run,
// so the heatmap reads like the demo screenshots instead of an empty grid.
// Keyed by a flag so a user who clears their data isn't re-seeded forever.
const SEED_FLAG = 'habitlog-seeded';
function seedDemoLog() {
  const log = {};
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // density: probability of a logged day; intensity skew per goal
  const plan = [
    ['g1', 110, 0.62, [1, 2, 2, 3]],
    ['g2', 90,  0.40, [1, 1, 2, 3]],
    ['g3', 130, 0.70, [1, 2, 3, 3]],
  ];
  for (const [gid, daysBack, density, levels] of plan) {
    const g = {};
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      // weekends slightly less likely
      const wk = (d.getDay() === 0 || d.getDay() === 6) ? 0.6 : 1;
      if (Math.random() < density * wk) {
        g[dayKey(d)] = levels[Math.floor(Math.random() * levels.length)];
      }
    }
    log[gid] = g;
  }
  return log;
}

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
